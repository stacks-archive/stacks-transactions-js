import * as _ from 'lodash';

import {
  AuthType,
  AddressHashMode,
  PubKeyEncoding,
  RECOVERABLE_ECDSA_SIG_LENGTH_BYTES,
} from './constants';

import { BufferArray, BufferReader, txidFromData, sha512_256 } from './utils';

import { Address } from './types';

import { StacksPublicKey, StacksPrivateKey } from './keys';

import { StacksMessage } from './message';

import * as BigNum from 'bn.js';

export class SpendingAuthorizationField {
  fieldID?: Buffer;
  body?: Buffer;
}

export class MessageSignature extends StacksMessage {
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
      throw new Error('"signature" is undefined');
    }
    bufferArray.appendHexString(this.signature);
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.signature = bufferReader.read(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES).toString('hex');
  }
}

export class SpendingCondition extends StacksMessage {
  addressHashMode?: AddressHashMode;
  signerAddress?: Address;
  nonce?: BigNum;
  feeRate?: BigNum;
  pubKeyEncoding?: PubKeyEncoding;
  signature: MessageSignature;
  signaturesRequired?: number;

  constructor(
    addressHashMode?: AddressHashMode,
    pubKey?: string,
    nonce?: BigNum,
    feeRate?: BigNum
  ) {
    super();
    this.addressHashMode = addressHashMode;
    if (addressHashMode && pubKey) {
      this.signerAddress = Address.fromPublicKeys(0, addressHashMode, 1, [
        new StacksPublicKey(pubKey),
      ]);
    }
    this.nonce = nonce;
    this.feeRate = feeRate;
    if (pubKey) {
      this.pubKeyEncoding = new StacksPublicKey(pubKey).compressed()
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
    cleared.feeRate = new BigNum(0);
    cleared.signature = MessageSignature.empty();
    return cleared;
  }

  static makeSigHashPreSign(
    curSigHash: string,
    authType: AuthType,
    feeRate: BigNum,
    nonce: BigNum
  ): string {
    // new hash combines the previous hash and all the new data this signature will add. This
    // includes:
    // * the previous hash
    // * the auth flag
    // * the fee rate (big-endian 8-byte number)
    // * nonce (big-endian 8-byte number)
    const hashLength = 32 + 1 + 8 + 8;

    const sigHash =
      curSigHash +
      authType +
      feeRate.toArrayLike(Buffer, 'be', 8).toString('hex') +
      nonce.toArrayLike(Buffer, 'be', 8).toString('hex');

    if (Buffer.from(sigHash, 'hex').byteLength > hashLength) {
      throw Error('Invalid signature hash length');
    }

    return txidFromData(Buffer.from(sigHash, 'hex'));
  }

  static makeSigHashPostSign(
    curSigHash: string,
    publicKey: StacksPublicKey,
    signature: MessageSignature
  ): string {
    // new hash combines the previous hash and all the new data this signature will add.  This
    // includes:
    // * the public key compression flag
    // * the signature
    const hashLength = 32 + 1 + RECOVERABLE_ECDSA_SIG_LENGTH_BYTES;
    const pubKeyEncoding = publicKey.compressed()
      ? PubKeyEncoding.Compressed
      : PubKeyEncoding.Uncompressed;

    const sigHash = curSigHash + pubKeyEncoding + signature.toString();

    if (Buffer.from(sigHash, 'hex').byteLength > hashLength) {
      throw Error('Invalid signature hash length');
    }

    return new sha512_256().update(sigHash).digest('hex');
  }

  static nextSignature(
    curSigHash: string,
    authType: AuthType,
    feeRate: BigNum,
    nonce: BigNum,
    privateKey: StacksPrivateKey
  ): {
    nextSig: MessageSignature;
    nextSigHash: string;
  } {
    const sigHashPreSign = this.makeSigHashPreSign(curSigHash, authType, feeRate, nonce);
    const signature = privateKey.sign(sigHashPreSign);
    const publicKey = privateKey.getPublicKey();
    const nextSigHash = this.makeSigHashPostSign(sigHashPreSign, publicKey, signature);

    return {
      nextSig: signature,
      nextSigHash,
    };
  }

  numSignatures(): number {
    return 0;
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();

    if (this.addressHashMode === undefined) {
      throw new Error('"addressHashMode" is undefined');
    }
    if (this.signerAddress === undefined) {
      throw new Error('"signerAddress" is undefined');
    }
    if (this.signerAddress.data === undefined) {
      throw new Error('"signerAddress.data" is undefined');
    }
    if (this.nonce === undefined) {
      throw new Error('"nonce" is undefined');
    }
    if (this.feeRate === undefined) {
      throw new Error('"feeRate" is undefined');
    }
    bufferArray.appendHexString(this.addressHashMode);
    bufferArray.appendHexString(this.signerAddress.data);
    bufferArray.push(this.nonce.toArrayLike(Buffer, 'be', 8));
    bufferArray.push(this.feeRate.toArrayLike(Buffer, 'be', 8));

    if (
      this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH
    ) {
      if (this.pubKeyEncoding === undefined) {
        throw new Error('"pubKeyEncoding" is undefined');
      }
      bufferArray.appendHexString(this.pubKeyEncoding);
      bufferArray.push(this.signature.serialize());
    } else if (
      this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH
    ) {
      // TODO
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.addressHashMode = bufferReader.read(1).toString('hex') as AddressHashMode;
    const signerPubKeyHash = bufferReader.read(20).toString('hex');
    this.signerAddress = Address.fromData(0, signerPubKeyHash);
    this.nonce = new BigNum(bufferReader.read(8).toString('hex'), 16);
    this.feeRate = new BigNum(bufferReader.read(8).toString('hex'), 16);

    if (
      this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH
    ) {
      this.pubKeyEncoding = bufferReader.read(1).toString('hex') as PubKeyEncoding;
      this.signature = MessageSignature.deserialize(bufferReader);
    } else if (
      this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH
    ) {
      // TODO
    }
  }
}

export class SingleSigSpendingCondition extends SpendingCondition {
  constructor(
    addressHashMode?: AddressHashMode,
    pubKey?: string,
    nonce?: BigNum,
    feeRate?: BigNum
  ) {
    super(addressHashMode, pubKey, nonce, feeRate);
    this.signaturesRequired = 1;
  }

  numSignatures(): number {
    return this.signature.toString() === MessageSignature.empty().toString() ? 0 : 1;
  }
}

export class MultiSigSpendingCondition extends SpendingCondition {
  // TODO
}

export class Authorization extends StacksMessage {
  authType?: AuthType;
  spendingCondition?: SpendingCondition;

  constructor(authType?: AuthType, spendingConditions?: SpendingCondition) {
    super();
    this.authType = authType;
    this.spendingCondition = spendingConditions;
  }

  intoInitialSighashAuth(): Authorization {
    if (this.authType === AuthType.Standard) {
      return new Authorization(AuthType.Standard, this.spendingCondition?.clear());
    } else {
      return new Authorization(AuthType.Sponsored, this.spendingCondition?.clear());
    }
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.authType === undefined) {
      throw new Error('"authType" is undefined');
    }
    bufferArray.appendHexString(this.authType);

    switch (this.authType) {
      case AuthType.Standard:
        if (this.spendingCondition === undefined) {
          throw new Error('"spendingCondition" is undefined');
        }
        bufferArray.push(this.spendingCondition.serialize());
        break;
      case AuthType.Sponsored:
        // TODO
        break;
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.authType = bufferReader.read(1).toString('hex') as AuthType;

    switch (this.authType) {
      case AuthType.Standard:
        this.spendingCondition = SpendingCondition.deserialize(bufferReader);
        break;
      case AuthType.Sponsored:
        // TODO
        break;
    }
  }
}

export class StandardAuthorization extends Authorization {
  constructor(spendingCondition: SpendingCondition) {
    super(AuthType.Standard, spendingCondition);
  }
}

export class SponsoredAuthorization extends Authorization {
  constructor(spendingCondition: SpendingCondition) {
    super(AuthType.Sponsored, spendingCondition);
  }
}
