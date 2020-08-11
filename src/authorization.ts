import * as _ from 'lodash';

import {
  AuthType,
  AddressHashMode,
  PubKeyEncoding,
  RECOVERABLE_ECDSA_SIG_LENGTH_BYTES,
  SingleSigHashMode,
  MultiSigHashMode,
  AddressVersion,
  StacksMessageType,
} from './constants';

import { BufferArray, txidFromData, sha512_256, leftPadHex } from './utils';

import { addressFromPublicKeys, deserializeLPList, createLPList, serializeLPList } from './types';

import {
  StacksPublicKey,
  StacksPrivateKey,
  createStacksPublicKey,
  isCompressed,
  signWithKey,
  getPublicKey,
  serializePublicKey,
  deserializePublicKey,
} from './keys';

import * as BigNum from 'bn.js';
import { BufferReader } from './bufferReader';
import { SerializationError, DeserializationError } from './errors';

abstract class Deserializable {
  abstract serialize(): Buffer;
  abstract deserialize(bufferReader: BufferReader): void;
  static deserialize<T extends Deserializable>(this: new () => T, bufferReader: BufferReader): T {
    const message = new this();
    message.deserialize(bufferReader);
    return message;
  }
}

export interface MessageSignature {
  readonly type: StacksMessageType.MessageSignature;
  signature: string;
}

export function createMessageSignature(signature: string): MessageSignature {
  const length = Buffer.from(signature, 'hex').byteLength;
  if (length != RECOVERABLE_ECDSA_SIG_LENGTH_BYTES) {
    throw Error('Invalid signature');
  }

  return {
    type: StacksMessageType.MessageSignature,
    signature,
  };
}

export function emptyMessageSignature(): MessageSignature {
  return {
    type: StacksMessageType.MessageSignature,
    signature: Buffer.alloc(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES, 0x00).toString('hex'),
  };
}

export function serializeMessageSignature(messageSignature: MessageSignature): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendHexString(messageSignature.signature);
  return bufferArray.concatBuffer();
}

export function deserializeMessageSignature(bufferReader: BufferReader): MessageSignature {
  return createMessageSignature(
    bufferReader.readBuffer(RECOVERABLE_ECDSA_SIG_LENGTH_BYTES).toString('hex')
  );
}

enum AuthFieldType {
  PublicKey = 0x00,
  Signature = 0x02,
}

export type TransactionAuthFieldContents = StacksPublicKey | MessageSignature;

export interface TransactionAuthField {
  type: StacksMessageType.TransactionAuthField;
  contents: TransactionAuthFieldContents;
}

export function createTransactionAuthField(
  contents: TransactionAuthFieldContents
): TransactionAuthField {
  return {
    type: StacksMessageType.TransactionAuthField,
    contents,
  };
}

export function serializeTransactionAuthField(field: TransactionAuthField): Buffer {
  const bufferArray: BufferArray = new BufferArray();

  switch (field.contents.type) {
    case StacksMessageType.PublicKey:
      bufferArray.appendByte(AuthFieldType.PublicKey);
      bufferArray.push(serializePublicKey(field.contents));
      break;
    case StacksMessageType.MessageSignature:
      bufferArray.appendByte(AuthFieldType.Signature);
      bufferArray.push(serializeMessageSignature(field.contents));
      break;
  }

  return bufferArray.concatBuffer();
}

export function deserializeTransactionAuthField(bufferReader: BufferReader): TransactionAuthField {
  const authFieldType = bufferReader.readUInt8Enum(AuthFieldType, n => {
    throw new DeserializationError(`Could not read ${n} as AuthFieldType`);
  });

  switch (authFieldType) {
    case AuthFieldType.PublicKey:
      return createTransactionAuthField(deserializePublicKey(bufferReader));
    case AuthFieldType.Signature:
      return createTransactionAuthField(deserializeMessageSignature(bufferReader));
    default:
      throw new Error(`Unknown auth field type: ${authFieldType}`);
  }
}

export interface SingleSigSpendingCondition {
  hashMode: SingleSigHashMode;
  signer: string;
  nonce: BigNum;
  fee: BigNum;
  keyEncoding: PubKeyEncoding;
  signature: MessageSignature;
}

export interface MultiSigSpendingCondition {
  hashMode: MultiSigHashMode;
  signer: string;
  nonce: BigNum;
  fee: BigNum;
  fields: TransactionAuthField[];
  signaturesRequired: number;
}

export type SpendingCondition = SingleSigSpendingCondition | MultiSigSpendingCondition;

export function createSingleSigSpendingCondition(
  hashMode: SingleSigHashMode,
  pubKey: string,
  nonce: BigNum,
  fee: BigNum
): SingleSigSpendingCondition {
  const signer = addressFromPublicKeys(AddressVersion.MainnetSingleSig, hashMode, 1, [
    createStacksPublicKey(pubKey),
  ]).hash160;
  const keyEncoding = isCompressed(createStacksPublicKey(pubKey))
    ? PubKeyEncoding.Compressed
    : PubKeyEncoding.Uncompressed;

  return {
    hashMode,
    signer,
    nonce,
    fee,
    keyEncoding,
    signature: emptyMessageSignature(),
  };
}

export function createMultiSigSpendingCondition(
  hashMode: MultiSigHashMode,
  numSigs: number,
  pubKeys: string[],
  nonce: BigNum,
  fee: BigNum
): MultiSigSpendingCondition {
  const stacksPublicKeys = pubKeys.map(createStacksPublicKey);

  // version arg does not matter for signer hash generation
  const signer = addressFromPublicKeys(0, hashMode, numSigs, stacksPublicKeys).hash160;

  return {
    hashMode,
    signer,
    nonce,
    fee,
    fields: [],
    signaturesRequired: numSigs,
  };
}

export function isSingleSig(condition: SpendingCondition) {
  return 'signature' in condition;
}

function clearCondition(condition: SpendingCondition): SpendingCondition {
  const cloned = _.cloneDeep(condition);
  cloned.nonce = new BigNum(0);
  cloned.fee = new BigNum(0);

  if (isSingleSig(cloned)) {
    (cloned as SingleSigSpendingCondition).signature = emptyMessageSignature();
  } else {
    (cloned as MultiSigSpendingCondition).fields = [];
  }

  return cloned;
}

export function serializeSingleSigSpendingCondition(condition: SingleSigSpendingCondition): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendByte(condition.hashMode);
  bufferArray.appendHexString(condition.signer);
  bufferArray.push(condition.nonce.toArrayLike(Buffer, 'be', 8));
  bufferArray.push(condition.fee.toArrayLike(Buffer, 'be', 8));
  bufferArray.appendByte(condition.keyEncoding);
  bufferArray.push(serializeMessageSignature(condition.signature));
  return bufferArray.concatBuffer();
}

export function serializeMultiSigSpendingCondition(condition: MultiSigSpendingCondition): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendByte(condition.hashMode);
  bufferArray.appendHexString(condition.signer);
  bufferArray.push(condition.nonce.toArrayLike(Buffer, 'be', 8));
  bufferArray.push(condition.fee.toArrayLike(Buffer, 'be', 8));

  const fields = createLPList(condition.fields);
  bufferArray.push(serializeLPList(fields));

  const numSigs = Buffer.alloc(2);
  numSigs.writeUInt16BE(condition.signaturesRequired, 0);
  bufferArray.push(numSigs);
  return bufferArray.concatBuffer();
}

export function deserializeSingleSigSpendingCondition(
  hashMode: SingleSigHashMode,
  bufferReader: BufferReader
): SingleSigSpendingCondition {
  const signer = bufferReader.readBuffer(20).toString('hex');
  const nonce = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);
  const fee = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);

  const keyEncoding = bufferReader.readUInt8Enum(PubKeyEncoding, n => {
    throw new DeserializationError(`Could not parse ${n} as PubKeyEncoding`);
  });
  const signature = deserializeMessageSignature(bufferReader);

  return {
    hashMode,
    signer,
    nonce,
    fee,
    keyEncoding,
    signature,
  };
}

export function deserializeMultiSigSpendingCondition(
  hashMode: MultiSigHashMode,
  bufferReader: BufferReader
): MultiSigSpendingCondition {
  const signer = bufferReader.readBuffer(20).toString('hex');
  const nonce = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);
  const fee = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);

  const fields = deserializeLPList(bufferReader, StacksMessageType.TransactionAuthField)
    .values as TransactionAuthField[];

  const signaturesRequired = bufferReader.readUInt16BE();

  return {
    hashMode,
    signer,
    nonce,
    fee,
    fields,
    signaturesRequired,
  };
}

export function serializeSpendingCondition(condition: SpendingCondition): Buffer {
  if (isSingleSig(condition)) {
    return serializeSingleSigSpendingCondition(condition as SingleSigSpendingCondition);
  } else {
    return serializeMultiSigSpendingCondition(condition as MultiSigSpendingCondition);
  }
}

export function deserializeSpendingCondition(bufferReader: BufferReader): SpendingCondition {
  const hashMode = bufferReader.readUInt8Enum(AddressHashMode, n => {
    throw new DeserializationError(`Could not parse ${n} as AddressHashMode`);
  });

  if (hashMode === AddressHashMode.SerializeP2PKH || hashMode === AddressHashMode.SerializeP2WPKH) {
    return deserializeSingleSigSpendingCondition(hashMode, bufferReader);
  } else {
    return deserializeMultiSigSpendingCondition(hashMode, bufferReader);
  }
}

export function makeSigHashPreSign(
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

function makeSigHashPostSign(
  curSigHash: string,
  publicKey: StacksPublicKey,
  signature: MessageSignature
): string {
  // new hash combines the previous hash and all the new data this signature will add.  This
  // includes:
  // * the public key compression flag
  // * the signature
  const hashLength = 32 + 1 + RECOVERABLE_ECDSA_SIG_LENGTH_BYTES;
  const pubKeyEncoding = isCompressed(publicKey)
    ? PubKeyEncoding.Compressed
    : PubKeyEncoding.Uncompressed;

  const sigHash = curSigHash + leftPadHex(pubKeyEncoding.toString(16)) + signature.toString();

  if (Buffer.from(sigHash, 'hex').byteLength > hashLength) {
    throw Error('Invalid signature hash length');
  }

  return new sha512_256().update(sigHash).digest('hex');
}

export function nextSignature(
  curSigHash: string,
  authType: AuthType,
  fee: BigNum,
  nonce: BigNum,
  privateKey: StacksPrivateKey
): {
  nextSig: MessageSignature;
  nextSigHash: string;
} {
  const sigHashPreSign = makeSigHashPreSign(curSigHash, authType, fee, nonce);
  const signature = signWithKey(privateKey, sigHashPreSign);
  const publicKey = getPublicKey(privateKey);
  const nextSigHash = makeSigHashPostSign(sigHashPreSign, publicKey, signature);

  return {
    nextSig: signature,
    nextSigHash,
  };
}

export class Authorization extends Deserializable {
  authType?: AuthType;
  spendingCondition?: SpendingCondition;

  constructor(authType?: AuthType, spendingConditions?: SpendingCondition) {
    super();
    this.authType = authType;
    this.spendingCondition = spendingConditions;
  }

  intoInitialSighashAuth(): Authorization {
    if (this.spendingCondition) {
      if (this.authType === AuthType.Standard) {
        return new Authorization(AuthType.Standard, clearCondition(this.spendingCondition));
      } else {
        return new Authorization(AuthType.Sponsored, clearCondition(this.spendingCondition));
      }
    }

    throw new Error('Authorization missing SpendingCondition');
  }

  setFee(amount: BigNum) {
    this.spendingCondition!.fee = amount;
  }

  setNonce(nonce: BigNum) {
    this.spendingCondition!.nonce = nonce;
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
        bufferArray.push(serializeSpendingCondition(this.spendingCondition));
        break;
      case AuthType.Sponsored:
        // TODO
        throw new SerializationError('Not yet implemented: serializing sponsored transactions');
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
        this.spendingCondition = deserializeSpendingCondition(bufferReader);
        break;
      case AuthType.Sponsored:
        // TODO
        throw new DeserializationError('Not yet implemented: deserializing sponsored transactions');
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
  constructor(spendingCondition: SpendingCondition) {
    super(AuthType.Sponsored, spendingCondition);
  }
}
