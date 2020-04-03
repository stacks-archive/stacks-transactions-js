import {
  MAX_STRING_LENGTH_BYTES,
  MEMO_MAX_LENGTH_BYTES,
  PrincipalType,
  TransactionVersion,
  AddressHashMode,
} from './constants';

import { StacksPublicKey } from './keys';

import {
  BufferArray,
  BufferReader,
  intToHexString,
  hexStringToInt,
  exceedsMaxLengthBytes,
  hash_p2pkh,
  rightPadHexToLength,
} from './utils';

import { c32addressDecode, c32address } from 'c32check';

import { StacksMessageCodec, StacksMessage } from './message';

export enum AddressVersion {
  MainnetSingleSig = 22,
  MainnetMultiSig = 20,
  TestnetSingleSig = 26,
  TestnetMultiSig = 21,
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

export class Address extends StacksMessage {
  version?: AddressVersion;
  data?: string;

  constructor(c32AddressString?: string) {
    super();
    if (c32AddressString) {
      const addressData = c32addressDecode(c32AddressString);
      this.version = addressData[0];
      this.data = addressData[1];
    }
  }

  static fromData(version: AddressVersion, data: string): Address {
    const address = new Address();
    address.version = version;
    address.data = data;
    return address;
  }

  static fromHashMode(
    hashMode: AddressHashMode,
    txVersion: TransactionVersion,
    data: string
  ): Address {
    const version = addressHashModeToVersion(hashMode, txVersion);
    return this.fromData(version, data);
  }

  static fromPublicKeys(
    version: AddressVersion,
    hashMode: AddressHashMode,
    numSigs: number,
    publicKeys: Array<StacksPublicKey>
  ): Address {
    if (!publicKeys || publicKeys.length === 0) {
      throw Error('Invalid number of public keys');
    }

    if (
      hashMode === AddressHashMode.SerializeP2PKH ||
      hashMode === AddressHashMode.SerializeP2WPKH
    ) {
      if (publicKeys.length != 1 || numSigs != 1) {
        throw Error('Invalid number of public keys or signatures');
      }
    }

    if (
      hashMode === AddressHashMode.SerializeP2WPKH ||
      hashMode === AddressHashMode.SerializeP2WSH
    ) {
      for (let i = 0; i < publicKeys.length; i++) {
        if (!publicKeys[i].compressed()) {
          throw Error('Public keys must be compressed for segwit');
        }
      }
    }

    switch (hashMode) {
      case AddressHashMode.SerializeP2PKH:
        return Address.fromData(version, hash_p2pkh(publicKeys[0].toString()));
      default:
        // TODO
        throw new Error(
          `Not yet implemented: address construction using public keys for hash mode: ${hashMode}`
        );
    }
  }

  toC32AddressString(): string {
    if (this.version === undefined) {
      throw new Error('"version" is undefined');
    }
    if (this.data === undefined) {
      throw new Error('"data" is undefined');
    }
    return c32address(this.version, this.data).toString();
  }

  toString(): string {
    return this.toC32AddressString();
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.version === undefined) {
      throw new Error('"version" is undefined');
    }
    if (this.data === undefined) {
      throw new Error('"data" is undefined');
    }
    bufferArray.appendByte(this.version);
    bufferArray.appendHexString(this.data);

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.version = bufferReader.readByte();
    this.data = bufferReader.read(20).toString('hex');
  }
}

export class Principal extends StacksMessage {
  principalType?: PrincipalType;
  address: Address;
  contractName: LengthPrefixedString;

  constructor(principalType?: PrincipalType, address?: string, contractName?: string) {
    super();
    this.principalType = principalType;
    this.address = new Address(address);
    this.contractName = new LengthPrefixedString(contractName);
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.principalType === undefined) {
      throw new Error('"principalType" is undefined');
    }
    bufferArray.appendByte(this.principalType);
    bufferArray.push(this.address.serialize());
    if (this.principalType == PrincipalType.Contract) {
      bufferArray.push(this.contractName.serialize());
    }
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.principalType = bufferReader.readByte() as PrincipalType;
    this.address = Address.deserialize(bufferReader);
    if (this.principalType == PrincipalType.Contract) {
      this.contractName = LengthPrefixedString.deserialize(bufferReader);
    }
  }
}

export class StandardPrincipal extends Principal {
  constructor(address?: string) {
    super(PrincipalType.Standard, address);
  }
}

export class ContractPrincipal extends Principal {
  constructor(address?: string, contractName?: string) {
    super(PrincipalType.Contract, address, contractName);
  }
}

export class LengthPrefixedString extends StacksMessage {
  content?: string;
  lengthPrefixBytes: number;
  maxLengthBytes: number;

  constructor(content?: string, lengthPrefixBytes?: number, maxLengthBytes?: number) {
    super();
    this.content = content;
    this.lengthPrefixBytes = lengthPrefixBytes || 1;
    this.maxLengthBytes = maxLengthBytes || MAX_STRING_LENGTH_BYTES;
  }

  toString(): string {
    return this.content ?? '';
  }

  serialize(): Buffer {
    if (this.content === undefined) {
      throw new Error('"content" is undefined');
    }
    if (exceedsMaxLengthBytes(this.content, this.maxLengthBytes)) {
      throw new Error(`String length exceeds maximum bytes ${this.maxLengthBytes.toString()}`);
    }

    const bufferArray: BufferArray = new BufferArray();
    const contentBuffer = Buffer.from(this.content);
    const length = contentBuffer.byteLength;
    bufferArray.appendHexString(intToHexString(length, this.lengthPrefixBytes));
    bufferArray.push(Buffer.from(this.content));
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    const length = bufferReader.read(this.lengthPrefixBytes).toString('hex');
    this.content = bufferReader.read(hexStringToInt(length)).toString();
  }
}

export class CodeBodyString extends LengthPrefixedString {
  constructor(content?: string) {
    const lengthPrefixBytes = 4;
    const maxLengthBytes = 100000;
    super(content, lengthPrefixBytes, maxLengthBytes);
  }
}

export class MemoString extends StacksMessage {
  content?: string;

  constructor(content?: string) {
    super();
    if (content && exceedsMaxLengthBytes(content, MEMO_MAX_LENGTH_BYTES)) {
      throw new Error(`Memo exceeds maximum length of ${MEMO_MAX_LENGTH_BYTES.toString()} bytes`);
    }
    this.content = content;
  }

  toString(): string {
    return this.content ?? '';
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    if (this.content === undefined) {
      throw new Error('"content" is undefined');
    }
    const contentBuffer = Buffer.from(this.content);
    const paddedContent = rightPadHexToLength(
      contentBuffer.toString('hex'),
      MEMO_MAX_LENGTH_BYTES * 2
    );
    bufferArray.push(Buffer.from(paddedContent, 'hex'));
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.content = bufferReader.read(MEMO_MAX_LENGTH_BYTES).toString();
  }
}

export class AssetInfo extends StacksMessage {
  address: Address;
  contractName: LengthPrefixedString;
  assetName: LengthPrefixedString;

  constructor(address?: string, contractName?: string, assetName?: string) {
    super();
    this.address = new Address(address);
    this.contractName = new LengthPrefixedString(contractName);
    this.assetName = new LengthPrefixedString(assetName);
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();

    bufferArray.push(this.address.serialize());
    bufferArray.push(this.contractName.serialize());
    bufferArray.push(this.assetName.serialize());

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.address = Address.deserialize(bufferReader);
    this.contractName = LengthPrefixedString.deserialize(bufferReader);
    this.assetName = LengthPrefixedString.deserialize(bufferReader);
  }
}

export class LengthPrefixedList<T extends StacksMessage> extends Array
  implements StacksMessageCodec {
  length = 0;
  lengthPrefixBytes: number;
  typeConstructor?: new () => T;

  constructor(typeConstructor?: new () => T, lengthPrefixBytes?: number) {
    super();
    this.lengthPrefixBytes = lengthPrefixBytes || 4;
    this.typeConstructor = typeConstructor;
  }

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();
    bufferArray.appendHexString(intToHexString(this.length, this.lengthPrefixBytes));
    for (let index = 0; index < this.length; index++) {
      bufferArray.push(this[index].serialize());
    }
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    const length = hexStringToInt(bufferReader.read(this.lengthPrefixBytes).toString('hex'));
    if (this.typeConstructor === undefined) {
      throw new Error('"typeConstructor" is undefined');
    }
    for (let index = 0; index < length; index++) {
      const item = new this.typeConstructor();
      item.deserialize(bufferReader);
      this.push(item);
    }
  }

  static fromArray<T extends StacksMessage>(array: Array<T>): LengthPrefixedList<T> {
    const list = new LengthPrefixedList<T>();
    if (array) {
      for (let index = 0; index < array.length; index++) {
        list.push(array[index]);
      }
    }
    return list;
  }

  static deserialize<T extends StacksMessage>(
    bufferReader: BufferReader,
    typeConstructor: new () => T
  ): LengthPrefixedList<T> {
    const list = new LengthPrefixedList<T>(typeConstructor);
    list.deserialize(bufferReader);
    return list;
  }
}
