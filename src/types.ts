import { 
  MAX_STRING_LENGTH_BYTES,
  PrincipalType
} 
from './constants';

import {
  BufferArray,
  BufferReader,
  intToHexString,
  hexStringToInt,
  exceedsMaxLengthBytes
} from './utils';

import {
  c32addressDecode,
  c32address
} from 'c32check';

import {
  StacksMessageCodec,
  StacksMessage
} from './message'

export class Address extends StacksMessage {
  version: number;
  data: string;

  constructor(c32AddressString?: string) {
    super();
    if (c32AddressString) {
      let addressData = c32addressDecode(c32AddressString);
      this.version = addressData[0];
      this.data = addressData[1];
    }
  }

  toC32AddressString(): string { 
    return c32address(this.version, this.data).toString();
  }

  toString(): string {
    return this.toC32AddressString();
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();

    bufferArray.appendHexString(this.version.toString());
    bufferArray.appendHexString(this.data)

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.version = parseInt(bufferReader.read(1).toString('hex'));
    this.data = bufferReader.read(20).toString('hex');
  }
}

export class Principal extends StacksMessage {
  principalType: PrincipalType;
  address: Address;
  contractName: LengthPrefixedString;

  constructor(principalType?: PrincipalType, address?: string, contractName?: string) {
    super();
    this.principalType = principalType;
    this.address = new Address(address);
    this.contractName = new LengthPrefixedString(contractName);
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    bufferArray.appendHexString(this.principalType);
    bufferArray.push(this.address.serialize());
    if (this.principalType == PrincipalType.Contract) {
      bufferArray.push(this.contractName.serialize());
    }
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.principalType = bufferReader.read(1).toString("hex") as PrincipalType;
    this.address = Address.deserialize(bufferReader);
    if (this.principalType == PrincipalType.Contract) {
      this.contractName = LengthPrefixedString.deserialize(bufferReader);
    }
  }
}

export class StandardPrincipal extends Principal {
  constructor(address?: string) {
    super(
      PrincipalType.Standard,
      address
    );
  }
}

export class ContractPrincipal extends Principal {
  constructor(address?: string, contractName?: string) {
    super(
      PrincipalType.Contract,
      address,
      contractName
    );
  }
}

export class LengthPrefixedString extends StacksMessage {
  content: string;
  lengthPrefixBytes: number;
  maxLengthBytes: number;

  constructor(content?: string, lengthPrefixBytes?: number, maxLengthBytes?: number) {
    super();
    this.content = content;
    this.lengthPrefixBytes = lengthPrefixBytes || 1;
    this.maxLengthBytes = maxLengthBytes || MAX_STRING_LENGTH_BYTES;
  }

  toString(): string {
    return this.content;
  }

  serialize(): Buffer {
    if (exceedsMaxLengthBytes(this.content, this.maxLengthBytes)) {
      throw new Error('String length exceeds maximum bytes ' + this.maxLengthBytes.toString());
    }

    let bufferArray: BufferArray = new BufferArray();
    let contentBuffer = Buffer.from(this.content);
    let length = contentBuffer.byteLength;
    bufferArray.appendHexString(intToHexString(length, this.lengthPrefixBytes));
    bufferArray.push(Buffer.from(this.content));
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    let length = bufferReader.read(this.lengthPrefixBytes).toString("hex");
    this.content = bufferReader.read(hexStringToInt(length)).toString();
  }
}

export class CodeBodyString extends LengthPrefixedString {
  constructor(content?: string) {
    let lengthPrefixBytes = 4;
    let maxLengthBytes = 100000;
    super(content, lengthPrefixBytes, maxLengthBytes);
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
    let bufferArray: BufferArray = new BufferArray();

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
  length: number;
  lengthPrefixBytes: number;
  typeConstructor: new () => T;

  constructor(typeConstructor?: new () => T, lengthPrefixBytes?: number) {
    super();
    this.lengthPrefixBytes = lengthPrefixBytes || 4;
    this.typeConstructor = typeConstructor;
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    bufferArray.appendHexString(intToHexString(this.length, this.lengthPrefixBytes));
    for (let index = 0; index < this.length; index++) {
      bufferArray.push(this[index].serialize());
    }
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    let length = hexStringToInt(bufferReader.read(this.lengthPrefixBytes).toString("hex"));
    for (let index = 0; index < length; index++) {
      let item = new this.typeConstructor();
      item.deserialize(bufferReader);
      this.push(item);
    }
  } 

  static fromArray<T extends StacksMessage>(array: Array<T>): LengthPrefixedList<T> {
    let list = new LengthPrefixedList<T>();
    if (array) {
      for (let index = 0; index < array.length; index++) {
        list.push(array[index]);
      }
    }
    return list;
  }

  static deserialize<T extends StacksMessage>(
    bufferReader: BufferReader, 
    typeConstructor: new () => T): LengthPrefixedList<T> 
  {
    let list = new LengthPrefixedList<T>(typeConstructor);
    list.deserialize(bufferReader);
    return list;
  }
}
