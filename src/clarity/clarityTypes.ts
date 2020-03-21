import * as BigNum from 'bn.js';
import { LengthPrefixedString, Address } from '../types';
import { CLARITY_INT_SIZE, ClarityType } from '../constants';
import { BufferReader, BufferArray } from '../utils';

const prefixTypeID = (typeId: ClarityType, buffer: Buffer): Buffer => {
  const id = Buffer.from(typeId, 'hex');
  return Buffer.concat([id, buffer]);
};

abstract class ClarityValue {
  abstract type: ClarityType;
  abstract serialize(): Buffer;

  static deserialize(bufferReader: BufferReader): ClarityValue {
    return readCV(bufferReader);
  }
}

function readCV(bufferReader: BufferReader): ClarityValue {
    const type = bufferReader.read(1).toString('hex') as ClarityType;

    switch (type) {
      case ClarityType.Int:
        return new IntCV(bufferReader.read(16));

      case ClarityType.UInt:
        return new UIntCV(bufferReader.read(16));

      case ClarityType.Buffer:
        const bufferLength = bufferReader.read(4).readUInt32BE(0);
        return new BufferCV(bufferReader.read(bufferLength));

      case ClarityType.BoolTrue:
        return new TrueCV();

      case ClarityType.BoolFalse:
        return new FalseCV();

      case ClarityType.PrincipalStandard:
        return StandardPrincipalCV.deserialize(bufferReader);

      case ClarityType.PrincipalContract:
        return ContractPrincipalCV.deserialize(bufferReader);

      case ClarityType.ResponseOk:
        return new ResponseOkCV(readCV(bufferReader));

      case ClarityType.ResponseErr:
        return new ResponseErrorCV(readCV(bufferReader));

      case ClarityType.OptionalNone:
        return new NoneCV();

      case ClarityType.OptionalSome:
        return new SomeCV(readCV(bufferReader));

      case ClarityType.List:
        const listLength = bufferReader.read(4).readUInt32BE(0);
        const listContents: ClarityValue[] = [];
        for (let i = 0; i < listLength; i++) {
          listContents.push(readCV(bufferReader));
        }
        return new ListCV(listContents);

      case ClarityType.Tuple:
        const tupleLength = bufferReader.read(4).readUInt32BE(0);
        const tupleContents: { [key: string]: ClarityValue } = {};
        for (let i = 0; i < tupleLength; i++) {
          let clarityName = LengthPrefixedString.deserialize(bufferReader).content;
          if (clarityName === undefined) {
            throw new Error('"content" is undefined');
          }
          tupleContents[clarityName] = readCV(bufferReader);
        }
        return new TupleCV(tupleContents);
    }
}

class TrueCV extends ClarityValue {
  readonly type = ClarityType.BoolTrue;
  serialize() { return Buffer.from(this.type, 'hex') };
}

class FalseCV implements ClarityValue {
  readonly type = ClarityType.BoolFalse;
  serialize() { return Buffer.from(this.type, 'hex') };
}

type BooleanCV = TrueCV | FalseCV;

const trueCV = () => new TrueCV() as BooleanCV;
const falseCV = () => new FalseCV() as BooleanCV;

class NoneCV extends ClarityValue {
  readonly type = ClarityType.OptionalNone;
  serialize() { return Buffer.from(this.type, 'hex') };
}

class SomeCV<T extends ClarityValue> extends ClarityValue {
  readonly type = ClarityType.OptionalSome;
  readonly value: T;

  constructor(v: T) {
    super();
    this.value = v;
  }

  serialize() { return prefixTypeID(this.type, this.value.serialize()) };
}

type OptionalCV<T extends ClarityValue> = NoneCV | SomeCV<T>;

const noneCV = <T extends ClarityValue>() => new NoneCV() as OptionalCV<T>;
const someCV = <T extends ClarityValue>(val: T) => new SomeCV(val) as OptionalCV<T>;

class BufferCV extends ClarityValue {
  readonly type = ClarityType.Buffer;
  readonly buffer: Buffer;

  constructor(buffer: Buffer) {
    super();
    if (buffer.length > 1000000) {
      throw new Error('Cannot construct clarity buffer that is greater than 1MB');
    }

    this.buffer = buffer;
  }

  serialize() {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(this.buffer.length, 0);
    return prefixTypeID(this.type, Buffer.concat([length, this.buffer]))
  }
}

class IntCV extends ClarityValue {
  readonly type = ClarityType.Int;
  readonly value: BigNum;

  constructor(value: number | string | Buffer) {
    super();

    const bn = new BigNum(value);
    this.value = bn.toTwos(CLARITY_INT_SIZE);

    if (this.value.bitLength() > CLARITY_INT_SIZE) {
      throw new Error('Cannot construct clarity integer from value greater than INT_SIZE bits');
    }
  }

  serialize() {
    const buffer = this.value.toArrayLike(Buffer, 'be', 16);
    return prefixTypeID(this.type, buffer);
  }
}

const intCV = (val: number | string | Buffer) => new IntCV(val);

class UIntCV extends ClarityValue {
  readonly type = ClarityType.UInt;
  readonly value: BigNum;

  constructor(value: number | string | Buffer) {
    super();
    const bn = new BigNum(value);
    this.value = bn.toTwos(CLARITY_INT_SIZE);

    if (this.value.isNeg()) {
      throw new Error('Cannot construct unsigned clarity integer from negative value');
    } else if (this.value.bitLength() > CLARITY_INT_SIZE) {
      throw new Error('Cannot construct unsigned clarity integer from value greater than 128 bits');
    }
  }

  serialize() {
    const buffer = this.value.toArrayLike(Buffer, 'be', 16);
    return prefixTypeID(this.type, buffer);
  }
}

const uintCV = (val: number | string | Buffer) => new UIntCV(val);

class StandardPrincipalCV extends ClarityValue {
  readonly type = ClarityType.PrincipalStandard;
  private address?: Address;

  constructor(address?: string) {
    super();
    if (address) {
      this.address = new Address(address);
    }
  }

  getAddress() { 
    return this.address;
  }

  serialize() {
    if (this.address === undefined) {
      throw new Error('"address" is undefined');
    }
    return prefixTypeID(this.type, this.address.serialize());
  }

  deserialize(bufferReader: BufferReader) {
    this.address = Address.deserialize(bufferReader);
    return this;
  }

  fromBuffer(version: number, buffer: Buffer) {
    const bufferReader = new BufferReader(Buffer.concat([Buffer.from([version]), buffer]))
    this.address = Address.deserialize(bufferReader);
    return this;
  }

  static deserialize(bufferReader: BufferReader) {
    return (new this()).deserialize(bufferReader);
  }

  static fromBuffer(version: number, buffer: Buffer) {
    return (new this()).fromBuffer(version, buffer);
  }

}

const standardPrincipalCV = (address: string) => new StandardPrincipalCV(address);

class ContractPrincipalCV extends ClarityValue {
  readonly type = ClarityType.PrincipalContract;
  private address?: Address;
  private contractName?: LengthPrefixedString;

  constructor(address?: string, name?: string) {
    super();
    if (address)
      this.address = new Address(address);

    if (name) {
      if (Buffer.byteLength(name) >= 128) {
        throw new Error('Contract name must be less than 128 bytes');
      } else {
        this.contractName = new LengthPrefixedString(name);
      }
    }
  }

  serialize() {
    if (this.address === undefined) {
      throw new Error('"address" is undefined');
    }
    if (this.contractName === undefined) {
      throw new Error('"contractName" is undefined');
    }
    return prefixTypeID(this.type, Buffer.concat([this.address.serialize(), this.contractName.serialize()]));
  }

  deserialize(bufferReader: BufferReader) {
    this.address = Address.deserialize(bufferReader);
    this.contractName = LengthPrefixedString.deserialize(bufferReader);
    return this;
  }

  fromStandardPrincipal(name: string, standardPrincipal: StandardPrincipalCV) {
    this.address = standardPrincipal.getAddress();
    this.contractName = new LengthPrefixedString(name);
    return this;
  }

  static deserialize(bufferReader: BufferReader) {
    return (new this()).deserialize(bufferReader);
  }

  static fromStandardPrincipal(name: string, standardPrincipal: StandardPrincipalCV) {
    return (new this()).fromStandardPrincipal(name, standardPrincipal);
  }
}

const contractPrincipalCV = (address: string, name: string) => new ContractPrincipalCV(address, name);

class ResponseErrorCV<T extends ClarityValue> extends ClarityValue {
  readonly type = ClarityType.ResponseErr;
  private value: T;

  constructor(v: T) {
    super();
    this.value = v;
  }

  serialize() { return prefixTypeID(this.type, this.value.serialize()) };
}

class ResponseOkCV<T extends ClarityValue> extends ClarityValue {
  readonly type = ClarityType.ResponseOk;
  private value: T;

  constructor(v: T) {
    super();
    this.value = v;
  }

  serialize() { return prefixTypeID(this.type, this.value.serialize()) };
}

function isClarityName(name: string) {
  const regex = /^[a-zA-Z]([a-zA-Z0-9]|[-_!?+<>=/*])*$|^[-+=/*]$|^[<>]=?$/;
  return regex.test(name) && name.length < 128;
}

class TupleCV<T extends { [key: string]: ClarityValue }> extends ClarityValue {
  readonly type = ClarityType.Tuple;
  private data: T;

  constructor(data: T) {
    super();
    for (const key in data) {
      if (!isClarityName(key)) {
        throw new Error(`"${key}" is not a valid Clarity name`);
      }
    }
    this.data = data;
  }

  get(key: string) {
    return this.data[key];
  }

  keys() {
    return Object.keys(this.data);
  }

  serialize() {
    const buffers = new BufferArray();

    const length = Buffer.alloc(4);
    length.writeUInt32BE(Object.keys(this.data).length, 0);
    buffers.push(length);

    const lexicographicOrder = this.keys().sort((a, b) => {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      return bufA.compare(bufB);
    })

    for (let key of lexicographicOrder) {
      const nameWithLength = new LengthPrefixedString(key);
      buffers.push(nameWithLength.serialize());

      // Serialized value
      const serializedValue = this.data[key].serialize();
      buffers.push(serializedValue);
    }

    return prefixTypeID(this.type, buffers.concatBuffer());
  }
}

const tupleCV = <T extends { [key: string]: ClarityValue }>(data: T) => new TupleCV<T>(data);

class ListCV<T extends ClarityValue> extends ClarityValue {
  readonly type = ClarityType.List;
  private list: T[];

  constructor(list: T[]) {
    super();
    this.list = list;
  }

  push(item: T) {
    this.list.push(item);
  }

  serialize() {
    const buffers = new BufferArray();

    const length = Buffer.alloc(4);
    length.writeUInt32BE(this.list.length, 0);
    buffers.push(length);

    for (let value of this.list) {
      const serializedValue = value.serialize();
      buffers.push(serializedValue);
    }

    return prefixTypeID(this.type, buffers.concatBuffer());
  }
}

const listCV = <T extends ClarityValue>(list: T[]) => new ListCV<T>(list);

// Export types
export {
  UIntCV,
  IntCV,
  BufferCV,
  StandardPrincipalCV,
  ContractPrincipalCV,
  TrueCV,
  FalseCV,
  BooleanCV,
  NoneCV,
  SomeCV,
  OptionalCV,
  ResponseOkCV,
  ResponseErrorCV,
  ListCV,
  TupleCV,
  ClarityValue,
};

// Export helper functions
export { uintCV, intCV, standardPrincipalCV, contractPrincipalCV, trueCV, falseCV, noneCV, someCV, listCV, tupleCV };
