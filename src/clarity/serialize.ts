import { LengthPrefixedString } from '../types';
import {
  BooleanCV,
  OptionalCV,
  BufferCV,
  IntCV,
  UIntCV,
  StandardPrincipalCV,
  ContractPrincipalCV,
  ResponseCV,
  ListCV,
  TupleCV,
  ClarityType,
  ClarityValue,
} from '.';
import { BufferArray } from '../utils';

function bufferWithTypeID(typeId: ClarityType, buffer: Buffer): Buffer {
  const id = Buffer.from(typeId, 'hex');
  return Buffer.concat([id, buffer]);
}

function serializeBoolCV(value: BooleanCV): Buffer {
  return Buffer.from(value.type, 'hex');
}

function serializeOptionalCV(cv: OptionalCV): Buffer {
  if (cv.type === ClarityType.OptionalNone) {
    return Buffer.from(cv.type, 'hex');
  } else {
    return bufferWithTypeID(cv.type, serializeCV(cv.value));
  }
}

function serializeBufferCV(cv: BufferCV): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(cv.buffer.length, 0);
  return bufferWithTypeID(cv.type, Buffer.concat([length, cv.buffer]));
}

function serializeIntCV(cv: IntCV | UIntCV): Buffer {
  const buffer = cv.value.toArrayLike(Buffer, 'be', 16);
  return bufferWithTypeID(cv.type, buffer);
}

function serializeStandardPrincipalCV(cv: StandardPrincipalCV): Buffer {
  return bufferWithTypeID(cv.type, cv.address.serialize());
}

function serializeContractPrincipalCV(cv: ContractPrincipalCV): Buffer {
  return bufferWithTypeID(
    cv.type,
    Buffer.concat([cv.address.serialize(), cv.contractName.serialize()])
  );
}

function serializeResponseCV(cv: ResponseCV) {
  return bufferWithTypeID(cv.type, serializeCV(cv.value));
}

function serializeListCV(cv: ListCV) {
  const buffers = new BufferArray();

  const length = Buffer.alloc(4);
  length.writeUInt32BE(cv.list.length, 0);
  buffers.push(length);

  for (const value of cv.list) {
    const serializedValue = serializeCV(value);
    buffers.push(serializedValue);
  }

  return bufferWithTypeID(cv.type, buffers.concatBuffer());
}

function serializeTupleCV(cv: TupleCV) {
  const buffers = new BufferArray();

  const length = Buffer.alloc(4);
  length.writeUInt32BE(Object.keys(cv.data).length, 0);
  buffers.push(length);

  const lexicographicOrder = Object.keys(cv.data).sort((a, b) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.compare(bufB);
  });

  for (const key of lexicographicOrder) {
    const nameWithLength = new LengthPrefixedString(key);
    buffers.push(nameWithLength.serialize());

    const serializedValue = serializeCV(cv.data[key]);
    buffers.push(serializedValue);
  }

  return bufferWithTypeID(cv.type, buffers.concatBuffer());
}

export function serializeCV(value: ClarityValue): Buffer {
  switch (value.type) {
    case ClarityType.BoolTrue:
    case ClarityType.BoolFalse:
      return serializeBoolCV(value);
    case ClarityType.OptionalNone:
    case ClarityType.OptionalSome:
      return serializeOptionalCV(value);
    case ClarityType.Buffer:
      return serializeBufferCV(value);
    case ClarityType.Int:
    case ClarityType.UInt:
      return serializeIntCV(value);
    case ClarityType.PrincipalStandard:
      return serializeStandardPrincipalCV(value);
    case ClarityType.PrincipalContract:
      return serializeContractPrincipalCV(value);
    case ClarityType.ResponseOk:
    case ClarityType.ResponseErr:
      return serializeResponseCV(value);
    case ClarityType.List:
      return serializeListCV(value);
    case ClarityType.Tuple:
      return serializeTupleCV(value);
  }
}
