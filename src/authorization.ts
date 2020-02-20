import {
  AuthType,
  AddressHashMode,
  PubKeyEncoding,
  RECOVERABLE_ECDSA_SIG_LENGTH_BYTES
} from './constants'

import {
  BufferArray,
  BufferReader,
  bigIntToHexString,
  hexStringToBigInt,
} from './utils';

import {
  StacksPublicKey
} from './keys';

import {
  StacksMessage
} from './message'

export class SpendingAuthorizationField {
  fieldID: Buffer;
  body: Buffer;
}

export class MessageSignature extends StacksMessage {
  signature: string;

  constructor(signature?: string) {
    super();
    this.signature = signature;
  }
  
  static empty(): MessageSignature {
    let messageSignature = new this();
    messageSignature.signature = 
      Buffer.alloc(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES, 0x00).toString('hex');
    return messageSignature;
  }

  toString(): string {
    return this.signature;
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    bufferArray.appendHexString(this.signature);
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.signature = bufferReader.read(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES).toString('hex');
  }

}

export class SpendingCondition extends StacksMessage {
  addressHashMode: AddressHashMode;
  pubKey: StacksPublicKey;
  pubKeyHash: string;
  nonce: BigInt;
  feeRate: BigInt;
  pubKeyEncoding: PubKeyEncoding;
  signature: MessageSignature;
  signaturesRequired: number;

  constructor(
    addressHashMode?: AddressHashMode, 
    pubKey?: string, 
    nonce?: BigInt, 
    feeRate?: BigInt
  ) {
    super();
    this.addressHashMode = addressHashMode;

    this.nonce = nonce;
    this.feeRate = feeRate;
    this.signature = MessageSignature.empty();
  }

  static makeSigHashPresign(
    curSigHash: string, 
    authType: AuthType, 
    feeRate: BigInt, 
    nonce: BigInt
  ) {

  }

  static nextSignature(
    curSigHash: string, 
    authType: AuthType, 
    feeRate: BigInt, 
    nonce: BigInt, 
    privateKey: string,
  ) {
    let sigHashPreSign = this.makeSigHashPresign(curSigHash, authType, feeRate, nonce);

    return {
      nextSig: "",
      nextSigHash: "",
    }
  }

  numSignatures(): number {
    return 0;
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();

    bufferArray.appendHexString(this.addressHashMode);
    // bufferArray.push(this.pubKeyHash);
    bufferArray.appendHexString(bigIntToHexString(this.nonce));
    bufferArray.appendHexString(bigIntToHexString(this.feeRate));

    if (this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH)
    {
      bufferArray.appendHexString(this.pubKeyEncoding);
      bufferArray.push(this.signature.serialize());
    } else if (this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH)
    {
      // TODO
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.addressHashMode = bufferReader.read(1).toString("hex") as AddressHashMode;
    // this.pubKeyHash = bufferReader.read(20);
    this.nonce = hexStringToBigInt(bufferReader.read(8).toString('hex'));
    this.feeRate = hexStringToBigInt(bufferReader.read(8).toString('hex'));

    if (this.addressHashMode === AddressHashMode.SerializeP2PKH ||
      this.addressHashMode === AddressHashMode.SerializeP2WPKH)
    {
      this.pubKeyEncoding = bufferReader.read(1).toString('hex') as PubKeyEncoding;
      this.signature = MessageSignature.deserialize(bufferReader);
    } else if (this.addressHashMode === AddressHashMode.SerializeP2SH ||
      this.addressHashMode === AddressHashMode.SerializeP2WSH)
    {
      // TODO
    }
  }
}

export class SingleSigSpendingCondition extends SpendingCondition {
  constructor(
    addressHashMode?: AddressHashMode, 
    pubKey?: string, 
    nonce?: BigInt, 
    feeRate?: BigInt
  ) {
    super(addressHashMode, pubKey, nonce, feeRate);
    this.pubKey = new StacksPublicKey(pubKey);
    this.pubKeyEncoding = pubKey && this.pubKey.compressed()
      ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed;
    this.signaturesRequired = 1;
  }

  numSignatures(): number {
    return this.signature.toString() === MessageSignature.empty().toString() ? 1 : 0;
  }
}

export class MultiSigSpendingCondition extends SpendingCondition {
  // TODO
}

export class Authorization extends StacksMessage { 
  authType: AuthType;
  spendingCondition: SpendingCondition;

  constructor(authType?: AuthType, spendingConditions?: SpendingCondition) {
    super();
    this.authType = authType;
    this.spendingCondition = spendingConditions;
  }

  intoInitialSighashAuth() {

  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    bufferArray.appendHexString(this.authType);

    switch (this.authType) {
      case AuthType.Standard:
        bufferArray.push(this.spendingCondition.serialize());
        break;
      case AuthType.Sponsored:
        // TODO
        break;
    }
    
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.authType = bufferReader.read(1).toString("hex") as AuthType;

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
      super(
        AuthType.Standard,
        spendingCondition
      );
    }
}

export class SponsoredAuthorization extends Authorization {
    constructor(spendingCondition: SpendingCondition) {
      super(
        AuthType.Sponsored,
        spendingCondition
      );
    }
}
