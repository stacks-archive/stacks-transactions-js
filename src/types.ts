import {
  MAX_STRING_LENGTH_BYTES,
  MEMO_MAX_LENGTH_BYTES,
  AddressHashMode,
  AddressVersion,
  TransactionVersion,
  StacksMessageType,
  PostConditionPrincipalID,
} from './constants';

import {
  StacksPublicKey,
  serializePublicKey,
  deserializePublicKey,
  isCompressed,
  publicKeyToString,
} from './keys';

import {
  BufferArray,
  intToHexString,
  hexStringToInt,
  exceedsMaxLengthBytes,
  hash_p2pkh,
  rightPadHexToLength,
} from './utils';

import { c32addressDecode, c32address } from 'c32check';
import { BufferReader } from './bufferReader';
import { PostCondition, serializePostCondition, deserializePostCondition } from './postcondition';
import { Payload, deserializePayload, serializePayload } from './payload';

export type StacksMessage =
  | Address
  | PostConditionPrincipal
  | LengthPrefixedString
  | LengthPrefixedList
  | Payload
  | MemoString
  | AssetInfo
  | PostCondition
  | StacksPublicKey;

export function serializeStacksMessage(message: StacksMessage): Buffer {
  switch (message.type) {
    case StacksMessageType.Address:
      return serializeAddress(message);
    case StacksMessageType.Principal:
      return serializePrincipal(message);
    case StacksMessageType.LengthPrefixedString:
      return serializeLPString(message);
    case StacksMessageType.MemoString:
      return serializeMemoString(message);
    case StacksMessageType.AssetInfo:
      return serializeAssetInfo(message);
    case StacksMessageType.PostCondition:
      return serializePostCondition(message);
    case StacksMessageType.PublicKey:
      return serializePublicKey(message);
    case StacksMessageType.LengthPrefixedList:
      return serializeLPList(message);
    case StacksMessageType.Payload:
      return serializePayload(message);
  }
}

export function deserializeStacksMessage(
  bufferReader: BufferReader,
  type: StacksMessageType,
  listType?: StacksMessageType
): StacksMessage {
  switch (type) {
    case StacksMessageType.Address:
      return deserializeAddress(bufferReader);
    case StacksMessageType.Principal:
      return deserializePrincipal(bufferReader);
    case StacksMessageType.LengthPrefixedString:
      return deserializeLPString(bufferReader);
    case StacksMessageType.MemoString:
      return deserializeMemoString(bufferReader);
    case StacksMessageType.AssetInfo:
      return deserializeAssetInfo(bufferReader);
    case StacksMessageType.PostCondition:
      return deserializePostCondition(bufferReader);
    case StacksMessageType.PublicKey:
      return deserializePublicKey(bufferReader);
    case StacksMessageType.Payload:
      return deserializePayload(bufferReader);
    case StacksMessageType.LengthPrefixedList:
      if (!listType) {
        throw new Error('No List Type specified');
      }
      return deserializeLPList(bufferReader, listType);
  }
}

export interface Address {
  readonly type: StacksMessageType.Address;
  readonly version: AddressVersion;
  readonly hash160: string;
}

export function createAddress(c32AddressString: string): Address {
  const addressData = c32addressDecode(c32AddressString);
  return {
    type: StacksMessageType.Address,
    version: addressData[0],
    hash160: addressData[1],
  };
}

export function addressFromVersionHash(version: AddressVersion, hash: string): Address {
  return { type: StacksMessageType.Address, version, hash160: hash };
}

/**
 * Translates the tx auth hash mode to the corresponding address version.
 * @see https://github.com/blockstack/stacks-blockchain/blob/master/sip/sip-005-blocks-and-transactions.md#transaction-authorization
 */
export function addressHashModeToVersion(
  hashMode: AddressHashMode,
  txVersion: TransactionVersion
): AddressVersion {
  switch (hashMode) {
    case AddressHashMode.SerializeP2PKH:
      switch (txVersion) {
        case TransactionVersion.Mainnet:
          return AddressVersion.MainnetSingleSig;
        case TransactionVersion.Testnet:
          return AddressVersion.TestnetSingleSig;
        default:
          throw new Error(`Unexpected txVersion ${txVersion} for hashMode ${hashMode}`);
      }
    case AddressHashMode.SerializeP2SH:
    case AddressHashMode.SerializeP2WPKH:
    case AddressHashMode.SerializeP2WSH:
      switch (txVersion) {
        case TransactionVersion.Mainnet:
          return AddressVersion.MainnetMultiSig;
        case TransactionVersion.Testnet:
          return AddressVersion.TestnetMultiSig;
        default:
          throw new Error(`Unexpected txVersion ${txVersion} for hashMode ${hashMode}`);
      }
    default:
      throw new Error(`Unexpected hashMode ${hashMode}`);
  }
}

export function addressFromHashMode(
  hashMode: AddressHashMode,
  txVersion: TransactionVersion,
  data: string
): Address {
  const version = addressHashModeToVersion(hashMode, txVersion);
  return addressFromVersionHash(version, data);
}

export function addressFromPublicKeys(
  version: AddressVersion,
  hashMode: AddressHashMode,
  numSigs: number,
  publicKeys: Array<StacksPublicKey>
): Address {
  if (publicKeys.length === 0) {
    throw Error('Invalid number of public keys');
  }

  if (hashMode === AddressHashMode.SerializeP2PKH || hashMode === AddressHashMode.SerializeP2WPKH) {
    if (publicKeys.length !== 1 || numSigs !== 1) {
      throw Error('Invalid number of public keys or signatures');
    }
  }

  if (hashMode === AddressHashMode.SerializeP2WPKH || hashMode === AddressHashMode.SerializeP2WSH) {
    for (let i = 0; i < publicKeys.length; i++) {
      if (!isCompressed(publicKeys[i])) {
        throw Error('Public keys must be compressed for segwit');
      }
    }
  }

  switch (hashMode) {
    case AddressHashMode.SerializeP2PKH:
      return addressFromVersionHash(version, hash_p2pkh(publicKeyToString(publicKeys[0])));
    default:
      throw Error(
        `Not yet implemented: address construction using public keys for hash mode: ${hashMode}`
      );
  }
}

export function addressToString(address: Address): string {
  return c32address(address.version, address.hash160).toString();
}

export function serializeAddress(address: Address): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendHexString(intToHexString(address.version, 1));
  bufferArray.appendHexString(address.hash160);

  return bufferArray.concatBuffer();
}

export function deserializeAddress(bufferReader: BufferReader): Address {
  const version = hexStringToInt(bufferReader.readBuffer(1).toString('hex'));
  const data = bufferReader.readBuffer(20).toString('hex');

  return { type: StacksMessageType.Address, version, hash160: data };
}

export type PostConditionPrincipal = StandardPrincipal | ContractPrincipal;

export interface StandardPrincipal {
  readonly type: StacksMessageType.Principal;
  readonly prefix: PostConditionPrincipalID.Standard;
  readonly address: Address;
}

export interface ContractPrincipal {
  readonly type: StacksMessageType.Principal;
  readonly prefix: PostConditionPrincipalID.Contract;
  readonly address: Address;
  readonly contractName: LengthPrefixedString;
}

export function createStandardPrincipal(addressString: string): StandardPrincipal {
  const addr = createAddress(addressString);
  return {
    type: StacksMessageType.Principal,
    prefix: PostConditionPrincipalID.Standard,
    address: addr,
  };
}

export function createContractPrincipal(
  addressString: string,
  contractName: string
): ContractPrincipal {
  const addr = createAddress(addressString);
  const name = createLPString(contractName);
  return {
    type: StacksMessageType.Principal,
    prefix: PostConditionPrincipalID.Contract,
    address: addr,
    contractName: name,
  };
}

export function serializePrincipal(principal: PostConditionPrincipal): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.push(Buffer.from([principal.prefix]));
  bufferArray.push(serializeAddress(principal.address));
  if (principal.prefix === PostConditionPrincipalID.Contract) {
    bufferArray.push(serializeLPString(principal.contractName));
  }
  return bufferArray.concatBuffer();
}

export function deserializePrincipal(bufferReader: BufferReader): PostConditionPrincipal {
  const prefix = bufferReader.readUInt8Enum(PostConditionPrincipalID, n => {
    throw new Error('Unexpected Principal payload type: ${n}');
  });
  const address = deserializeAddress(bufferReader);
  if (prefix === PostConditionPrincipalID.Standard) {
    return { type: StacksMessageType.Principal, prefix, address } as StandardPrincipal;
  }
  const contractName = deserializeLPString(bufferReader);
  return {
    type: StacksMessageType.Principal,
    prefix,
    address,
    contractName,
  } as ContractPrincipal;
}

export interface LengthPrefixedString {
  readonly type: StacksMessageType.LengthPrefixedString;
  readonly content: string;
  readonly lengthPrefixBytes: number;
  readonly maxLengthBytes: number;
}

export function createLPString(content: string): LengthPrefixedString;
export function createLPString(content: string, lengthPrefixBytes: number): LengthPrefixedString;
export function createLPString(
  content: string,
  lengthPrefixBytes: number,
  maxLengthBytes: number
): LengthPrefixedString;
export function createLPString(
  content: string,
  lengthPrefixBytes?: number,
  maxLengthBytes?: number
): LengthPrefixedString {
  const prefixLength = lengthPrefixBytes || 1;
  const maxLength = maxLengthBytes || MAX_STRING_LENGTH_BYTES;
  if (exceedsMaxLengthBytes(content, maxLength)) {
    throw new Error(`String length exceeds maximum bytes ${maxLength.toString()}`);
  }
  return {
    type: StacksMessageType.LengthPrefixedString,
    content,
    lengthPrefixBytes: prefixLength,
    maxLengthBytes: maxLength,
  };
}

export function serializeLPString(lps: LengthPrefixedString) {
  const bufferArray: BufferArray = new BufferArray();
  const contentBuffer = Buffer.from(lps.content);
  const length = contentBuffer.byteLength;
  bufferArray.appendHexString(intToHexString(length, lps.lengthPrefixBytes));
  bufferArray.push(contentBuffer);
  return bufferArray.concatBuffer();
}

export function deserializeLPString(
  bufferReader: BufferReader,
  prefixBytes?: number,
  maxLength?: number
): LengthPrefixedString {
  prefixBytes = prefixBytes ? prefixBytes : 1;
  const length = hexStringToInt(bufferReader.readBuffer(prefixBytes).toString('hex'));
  const content = bufferReader.readBuffer(length).toString();
  return createLPString(content, prefixBytes, maxLength ? maxLength : 128);
}

export function codeBodyString(content: string): LengthPrefixedString {
  return createLPString(content, 4, 100000);
}

export interface MemoString {
  readonly type: StacksMessageType.MemoString;
  readonly content: string;
}

export function createMemoString(content: string): MemoString {
  if (content && exceedsMaxLengthBytes(content, MEMO_MAX_LENGTH_BYTES)) {
    throw new Error(`Memo exceeds maximum length of ${MEMO_MAX_LENGTH_BYTES.toString()} bytes`);
  }
  return { type: StacksMessageType.MemoString, content };
}

export function serializeMemoString(memoString: MemoString): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  const contentBuffer = Buffer.from(memoString.content);
  const paddedContent = rightPadHexToLength(
    contentBuffer.toString('hex'),
    MEMO_MAX_LENGTH_BYTES * 2
  );
  bufferArray.push(Buffer.from(paddedContent, 'hex'));
  return bufferArray.concatBuffer();
}

export function deserializeMemoString(bufferReader: BufferReader): MemoString {
  const content = bufferReader.readBuffer(MEMO_MAX_LENGTH_BYTES).toString();
  return { type: StacksMessageType.MemoString, content };
}

export interface AssetInfo {
  readonly type: StacksMessageType.AssetInfo;
  readonly address: Address;
  readonly contractName: LengthPrefixedString;
  readonly assetName: LengthPrefixedString;
}

export function createAssetInfo(
  addressString: string,
  contractName: string,
  assetName: string
): AssetInfo {
  return {
    type: StacksMessageType.AssetInfo,
    address: createAddress(addressString),
    contractName: createLPString(contractName),
    assetName: createLPString(assetName),
  };
}

export function serializeAssetInfo(info: AssetInfo): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.push(serializeAddress(info.address));
  bufferArray.push(serializeLPString(info.contractName));
  bufferArray.push(serializeLPString(info.assetName));
  return bufferArray.concatBuffer();
}

export function deserializeAssetInfo(bufferReader: BufferReader): AssetInfo {
  return {
    type: StacksMessageType.AssetInfo,
    address: deserializeAddress(bufferReader),
    contractName: deserializeLPString(bufferReader),
    assetName: deserializeLPString(bufferReader),
  };
}

export interface LengthPrefixedList {
  readonly type: StacksMessageType.LengthPrefixedList;
  readonly lengthPrefixBytes: number;
  readonly values: StacksMessage[];
}

export function createLPList<T extends StacksMessage>(
  values: T[],
  lengthPrefixBytes?: number
): LengthPrefixedList {
  return {
    type: StacksMessageType.LengthPrefixedList,
    lengthPrefixBytes: lengthPrefixBytes || 4,
    values,
  };
}

export function serializeLPList(lpList: LengthPrefixedList): Buffer {
  const list = lpList.values;
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendHexString(intToHexString(list.length, lpList.lengthPrefixBytes));
  for (let index = 0; index < list.length; index++) {
    bufferArray.push(serializeStacksMessage(list[index]));
  }
  return bufferArray.concatBuffer();
}

export function deserializeLPList(
  bufferReader: BufferReader,
  type: StacksMessageType,
  lengthPrefixBytes?: number
): LengthPrefixedList {
  const length = hexStringToInt(bufferReader.readBuffer(lengthPrefixBytes || 4).toString('hex'));
  const l: StacksMessage[] = [];
  for (let index = 0; index < length; index++) {
    switch (type) {
      case StacksMessageType.Address:
        l.push(deserializeAddress(bufferReader));
        break;
      case StacksMessageType.LengthPrefixedString:
        l.push(deserializeLPString(bufferReader));
        break;
      case StacksMessageType.MemoString:
        l.push(deserializeMemoString(bufferReader));
        break;
      case StacksMessageType.AssetInfo:
        l.push(deserializeAssetInfo(bufferReader));
        break;
      case StacksMessageType.PostCondition:
        l.push(deserializePostCondition(bufferReader));
        break;
      case StacksMessageType.PublicKey:
        l.push(deserializePublicKey(bufferReader));
        break;
    }
  }
  return createLPList(l, lengthPrefixBytes);
}
