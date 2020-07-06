import * as _ from 'lodash';

import {
  AuthType,
  AddressHashMode,
  PubKeyEncoding,
  RECOVERABLE_ECDSA_SIG_LENGTH_BYTES,
} from './constants';

import { BufferArray, txidFromData, sha512_256, leftPadHex } from './utils';

import { 
  Address, 
  createEmptyAddress, 
  addressFromPublicKeys, 
  addressFromVersionHash 
} from './types';

import {
  StacksPublicKey,
  StacksPrivateKey,
  createStacksPublicKey,
  isCompressed,
  signWithKey,
  getPublicKey,
  publicKeyFromSignature,
} from './keys';

import * as BigNum from 'bn.js';
import { BufferReader } from './bufferReader';
import { 
  SerializationError, 
  NotImplementedError, 
  DeserializationError, 
  SigningError 
} from './errors';
import { create } from 'domain';

abstract class Deserializable {
  abstract serialize(): Buffer;
  abstract deserialize(bufferReader: BufferReader): void;
  static deserialize<T extends Deserializable>(this: new () => T, bufferReader: BufferReader): T {
    const message = new this();
    message.deserialize(bufferReader);
    return message;
  }
}

export class MessageSignature extends Deserializable {
  signature?: string;

  constructor(signature?: string) {
    super();
    if (signature) {
      const length = Buffer.from(signature, 'hex').byteLength;
      if (length != RECOVERABLE_ECDSA_SIG_LENGTH_BYTES) {
        throw Error('Invalid signature');
      }
    }
    this.signature = signature;
  }

  static empty(): MessageSignature {
    const messageSignature = new this();
    messageSignature.signature = Buffer.alloc(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES, 0x00).toString(
      'hex'
    );
    return messageSignature;
  }

  toString(): string {
    return this.signature ?? '';
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.signature === undefined) {
      throw new SerializationError('"signature" is undefined');
    }
    bufferArray.appendHexString(this.signature);
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.signature = bufferReader.readBuffer(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES).toString('hex');
  }
}

export class SpendingCondition extends Deserializable {
  addressHashMode?: AddressHashMode;
  signerAddress?: Address;
  nonce?: BigNum;
  fee?: BigNum;
  pubKeyEncoding?: PubKeyEncoding;
  signature: MessageSignature;
  signaturesRequired?: number;

  constructor(addressHashMode?: AddressHashMode, pubKey?: string, nonce?: BigNum, fee?: BigNum) {
    super();
    this.addressHashMode = addressHashMode;
    if (addressHashMode !== undefined && pubKey) {
      this.signerAddress = addressFromPublicKeys(0, addressHashMode, 1, [
        createStacksPublicKey(pubKey),
      ]);
    }

    this.nonce = nonce;
    this.fee = fee;
    if (pubKey) {
      this.pubKeyEncoding = isCompressed(createStacksPublicKey(pubKey))
        ? PubKeyEncoding.Compressed
        : PubKeyEncoding.Uncompressed;
    }
    this.signature = MessageSignature.empty();
  }

  singleSig(): boolean {
    if (
      this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH
    ) {
      return true;
    } else {
      return false;
    }
  }

  clear(): SpendingCondition {
    const cleared = _.cloneDeep(this);
    cleared.nonce = new BigNum(0);
    cleared.fee = new BigNum(0);
    cleared.signature = MessageSignature.empty();
    return cleared;
  }

  static makeSigHashPreSign(
    curSigHash: string,
    authType: AuthType,
    fee: BigNum,
    nonce: BigNum
  ): string {
    // new hash combines the previous hash and all the new data this signature will add. This
    // includes:
    // * the previous hash
    // * the auth flag
    // * the tx fee (big-endian 8-byte number)
    // * nonce (big-endian 8-byte number)
    const hashLength = 32 + 1 + 8 + 8;

    const sigHash =
      curSigHash +
      Buffer.from([authType]).toString('hex') +
      fee.toArrayLike(Buffer, 'be', 8).toString('hex') +
      nonce.toArrayLike(Buffer, 'be', 8).toString('hex');

    if (Buffer.from(sigHash, 'hex').byteLength !== hashLength) {
      throw Error('Invalid signature hash length');
    }

    return txidFromData(Buffer.from(sigHash, 'hex'));
  }

  static makeSigHashPostSign(
    curSigHash: string,
    pubKeyEncoding: PubKeyEncoding,
    signature: MessageSignature
  ): string {
    // new hash combines the previous hash and all the new data this signature will add.  This
    // includes:
    // * the public key compression flag
    // * the signature
    const hashLength = 32 + 1 + RECOVERABLE_ECDSA_SIG_LENGTH_BYTES;

    const sigHash = curSigHash + leftPadHex(pubKeyEncoding.toString(16)) + signature.toString();

    if (Buffer.from(sigHash, 'hex').byteLength > hashLength) {
      throw Error('Invalid signature hash length');
    }

    return txidFromData(Buffer.from(sigHash, 'hex'));
  }

  static nextSignature(
    curSigHash: string,
    authType: AuthType,
    fee: BigNum,
    nonce: BigNum,
    privateKey: StacksPrivateKey
  ): {
    nextSig: MessageSignature;
    nextSigHash: string;
  } {
    const sigHashPreSign = this.makeSigHashPreSign(curSigHash, authType, fee, nonce);

    const signature = signWithKey(privateKey, sigHashPreSign);
    const publicKey = getPublicKey(privateKey);
    const publicKeyEncoding = isCompressed(publicKey) 
      ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed;
    const nextSigHash = this.makeSigHashPostSign(sigHashPreSign, publicKeyEncoding, signature);

    return {
      nextSig: signature,
      nextSigHash,
    };
  }

  static nextVerification(
    initialSigHash: string,
    authType: AuthType,
    fee: BigNum,
    nonce: BigNum,
    pubKeyEncoding: PubKeyEncoding,
    signature: MessageSignature,
  ) {
    const sigHashPreSign = this.makeSigHashPreSign(initialSigHash, authType, fee, nonce);

    const publicKey = createStacksPublicKey(publicKeyFromSignature(sigHashPreSign, signature));

    const nextSigHash = this.makeSigHashPostSign(sigHashPreSign, PubKeyEncoding.Compressed, signature);

    return {
      pubKey: publicKey,
      nextSigHash,
    }
  }

  static newInitialSigHash(): SpendingCondition {
    const spendingCondition = new this(
      AddressHashMode.SerializeP2PKH, 
      "",
      new BigNum(0),
      new BigNum(0)
    )
    spendingCondition.signerAddress = createEmptyAddress();
    spendingCondition.pubKeyEncoding = PubKeyEncoding.Compressed;
    spendingCondition.signature = MessageSignature.empty();
    return spendingCondition;
  }

  verify(initialSigHash: string, authType: AuthType): string {
    if (this.singleSig()) {
      return this.verifySingleSig(initialSigHash, authType);
    } else {
      // TODO: verify multisig
      return "";
    }
  }

  verifySingleSig(initialSigHash: string, authType: AuthType): string { 
    const { pubKey, nextSigHash } = SpendingCondition.nextVerification(
      initialSigHash,
      authType,
      this.fee!,
      this.nonce!,
      this.pubKeyEncoding!,
      this.signature!,
    )
    
    // TODO: verify pub key

    return nextSigHash;
  }

  numSignatures(): number {
    return 0;
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();

    if (this.addressHashMode === undefined) {
      throw new SerializationError('"addressHashMode" is undefined');
    }
    if (this.signerAddress === undefined) {
      throw new SerializationError('"signerAddress" is undefined');
    }
    if (this.signerAddress.hash160 === undefined) {
      throw new SerializationError('"signerAddress.data" is undefined');
    }
    if (this.nonce === undefined) {
      throw new SerializationError('"nonce" is undefined');
    }
    if (this.fee === undefined) {
      throw new SerializationError('"fee" is undefined');
    }
    bufferArray.appendByte(this.addressHashMode);
    bufferArray.appendHexString(this.signerAddress.hash160);
    bufferArray.push(this.nonce.toArrayLike(Buffer, 'be', 8));
    bufferArray.push(this.fee.toArrayLike(Buffer, 'be', 8));

    if (
      this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH
    ) {
      if (this.pubKeyEncoding === undefined) {
        throw new SerializationError('"pubKeyEncoding" is undefined');
      }
      bufferArray.appendByte(this.pubKeyEncoding);
      bufferArray.push(this.signature.serialize());
    } else if (
      this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH
    ) {
      // TODO
      throw new NotImplementedError(
        `Not yet implemented: serializing AddressHashMode: ${this.addressHashMode}`
      );
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.addressHashMode = bufferReader.readUInt8Enum(AddressHashMode, n => {
      throw new DeserializationError(`Could not parse ${n} as AddressHashMode`);
    });
    const signerPubKeyHash = bufferReader.readBuffer(20).toString('hex');
    this.signerAddress = addressFromVersionHash(0, signerPubKeyHash);
    this.nonce = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);
    this.fee = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);

    if (
      this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH
    ) {
      this.pubKeyEncoding = bufferReader.readUInt8Enum(PubKeyEncoding, n => {
        throw new DeserializationError(`Could not parse ${n} as PubKeyEncoding`);
      });
      this.signature = MessageSignature.deserialize(bufferReader);
    } else if (
      this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH
    ) {
      throw new DeserializationError('not implemented');
      // TODO
    }
  }
}

export class SingleSigSpendingCondition extends SpendingCondition {
  constructor(addressHashMode?: AddressHashMode, pubKey?: string, nonce?: BigNum, fee?: BigNum) {
    super(addressHashMode, pubKey, nonce, fee);
    this.signaturesRequired = 1;
  }

  numSignatures(): number {
    return this.signature.toString() === MessageSignature.empty().toString() ? 0 : 1;
  }
}

export class MultiSigSpendingCondition extends SpendingCondition {
  // TODO
}

export class Authorization extends Deserializable {
  authType?: AuthType;
  spendingCondition?: SpendingCondition;
  sponsorSpendingCondition?: SpendingCondition;

  constructor(
    authType?: AuthType, 
    spendingConditions?: SpendingCondition, 
    sponsorSpendingCondition?: SpendingCondition
  ) {
    super();
    this.authType = authType;
    this.spendingCondition = spendingConditions;
    this.sponsorSpendingCondition = sponsorSpendingCondition;
  }

  intoInitialSighashAuth(): Authorization {
    switch (this.authType) {
      case AuthType.Standard:
        return new Authorization(AuthType.Standard, this.spendingCondition?.clear());
      case AuthType.Sponsored:
        const auth = new Authorization(
          AuthType.Sponsored, 
          this.spendingCondition?.clear(), 
          SpendingCondition.newInitialSigHash()
        );
        return auth;
      default:
        throw new SigningError('Unexpected authorization type for signing');
    }
  }

  setFee(amount: BigNum) {
    switch (this.authType) {
      case AuthType.Standard:
        this.spendingCondition!.fee = amount;
        break;
      case AuthType.Sponsored:
        this.sponsorSpendingCondition!.fee = amount;
        break;
    }
  }

  getFee() {
    switch (this.authType) {
      case AuthType.Standard:
        return this.spendingCondition!.fee;
      case AuthType.Sponsored:
        return this.sponsorSpendingCondition!.fee;
    }
  }

  setNonce(nonce: BigNum) {
    this.spendingCondition!.nonce = nonce;
  }

  setSponsorNonce(nonce: BigNum) {
    this.sponsorSpendingCondition!.nonce = nonce;
  }

  setSponsor(sponsorSpendingCondition: SpendingCondition) {
    this.sponsorSpendingCondition = sponsorSpendingCondition;
  }

  verifyOrigin(initialSigHash: string): string {
    switch( this.authType) {
      case AuthType.Standard:
        return this.spendingCondition!.verify(initialSigHash, AuthType.Standard);
      case AuthType.Sponsored:
        return this.spendingCondition!.verify(initialSigHash, AuthType.Standard);
      default: 
        throw new SigningError('Invalid origin auth type');
    }
}

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.authType === undefined) {
      throw new SerializationError('"authType" is undefined');
    }
    bufferArray.appendByte(this.authType);

    switch (this.authType) {
      case AuthType.Standard:
        if (this.spendingCondition === undefined) {
          throw new SerializationError('"spendingCondition" is undefined');
        }
        bufferArray.push(this.spendingCondition.serialize());
        break;
      case AuthType.Sponsored:
        if (this.spendingCondition === undefined) {
          throw new SerializationError('"spendingCondition" is undefined');
        }
        if (this.sponsorSpendingCondition === undefined) {
          throw new SerializationError('"spendingCondition" is undefined');
        }
        bufferArray.push(this.spendingCondition.serialize());
        bufferArray.push(this.sponsorSpendingCondition.serialize());
        break;
      default:
        throw new SerializationError(
          `Unexpected transaction AuthType while serializing: ${this.authType}`
        );
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.authType = bufferReader.readUInt8Enum(AuthType, n => {
      throw new DeserializationError(`Could not parse ${n} as AuthType`);
    });

    switch (this.authType) {
      case AuthType.Standard:
        this.spendingCondition = SpendingCondition.deserialize(bufferReader);
        break;
      case AuthType.Sponsored:
        this.spendingCondition = SpendingCondition.deserialize(bufferReader);
        this.sponsorSpendingCondition = SpendingCondition.deserialize(bufferReader);
        break;
        // throw new DeserializationError('Not yet implemented: deserializing sponsored transactions');
      default:
        throw new DeserializationError(
          `Unexpected transaction AuthType while deserializing: ${this.authType}`
        );
    }
  }
}

export class StandardAuthorization extends Authorization {
  constructor(spendingCondition: SpendingCondition) {
    super(AuthType.Standard, spendingCondition);
  }
}

export class SponsoredAuthorization extends Authorization {
  constructor(
    originSpendingCondition: SpendingCondition, 
    sponsorSpendingCondition?: SpendingCondition
  ) {
    var sponsorSC = sponsorSpendingCondition;
    if (!sponsorSC) {
      sponsorSC = new SpendingCondition(
        AddressHashMode.SerializeP2PKH, 
        "0".repeat(66),
        new BigNum(0),
        new BigNum(0)
      )
    }
    super(AuthType.Sponsored, originSpendingCondition, sponsorSC);
  }
}
