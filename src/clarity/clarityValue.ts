import {
  BooleanCV,
  OptionalCV,
  BufferCV,
  IntCV,
  UIntCV,
  StandardPrincipalCV,
  ContractPrincipalCV,
  ResponseErrorCV,
  ResponseOkCV,
  ListCV,
  TupleCV,
} from '.';
import { principalToString } from './types/principalCV';
import { CLARITY_INT_SIZE } from '../constants';

/**
 * Type IDs corresponding to each of the Clarity value types as described here:
 * {@link https://github.com/blockstack/blockstack-core/blob/sip/sip-005/sip/sip-005-blocks-and-transactions.md#clarity-value-representation}
 */
export enum ClarityType {
  Int = 0x00,
  UInt = 0x01,
  Buffer = 0x02,
  BoolTrue = 0x03,
  BoolFalse = 0x04,
  PrincipalStandard = 0x05,
  PrincipalContract = 0x06,
  ResponseOk = 0x07,
  ResponseErr = 0x08,
  OptionalNone = 0x09,
  OptionalSome = 0x0a,
  List = 0x0b,
  Tuple = 0x0c,
}

export type ClarityValue =
  | BooleanCV
  | OptionalCV
  | BufferCV
  | IntCV
  | UIntCV
  | StandardPrincipalCV
  | ContractPrincipalCV
  | ResponseErrorCV
  | ResponseOkCV
  | ListCV
  | TupleCV;

export function cvToString(val: ClarityValue, encoding?: 'ascii' | 'hex'): string {
  switch (val.type) {
    case ClarityType.BoolTrue:
      return 'true';
    case ClarityType.BoolFalse:
      return 'false';
    case ClarityType.Int:
      return val.value.fromTwos(CLARITY_INT_SIZE).toString();
    case ClarityType.UInt:
      return val.value.toString();
    case ClarityType.Buffer:
      const bufferString =
        encoding === 'hex' ? val.buffer.toString('hex') : val.buffer.toString('ascii');
      return `"${bufferString}"`;
    case ClarityType.OptionalNone:
      return 'none';
    case ClarityType.OptionalSome:
      return `(some ${cvToString(val.value, encoding)})`;
    case ClarityType.ResponseErr:
      return `(err ${cvToString(val.value, encoding)})`;
    case ClarityType.ResponseOk:
      return `(ok ${cvToString(val.value, encoding)})`;
    case ClarityType.PrincipalStandard:
    case ClarityType.PrincipalContract:
      return principalToString(val);
    case ClarityType.List:
      return `(list ${val.list.map(v => cvToString(v, encoding)).join(' ')})`;
    case ClarityType.Tuple:
      return `(tuple ${Object.keys(val.data)
        .map(key => `(${key} ${cvToString(val.data[key], encoding)})`)
        .join(' ')})`;
  }
}

export function getCVTypeString(val: ClarityValue): string {
  switch (val.type) {
    case ClarityType.BoolTrue:
    case ClarityType.BoolFalse:
      return 'bool';
    case ClarityType.Int:
      return 'int128';
    case ClarityType.UInt:
      return 'uint128';
    case ClarityType.Buffer:
      return `buffer(${val.buffer.length})`;
    case ClarityType.OptionalNone:
      return 'optional(none)';
    case ClarityType.OptionalSome:
      return `optional(${getCVTypeString(val.value)})`;
    case ClarityType.ResponseErr:
      return `responseError(${getCVTypeString(val.value)})`;
    case ClarityType.ResponseOk:
      return `responseOk(${getCVTypeString(val.value)})`;
    case ClarityType.PrincipalStandard:
    case ClarityType.PrincipalContract:
      return 'principal';
    case ClarityType.List:
      return `list(${getCVTypeString(val.list[0])},${val.list.length})`;
    case ClarityType.Tuple:
      return `tuple(${Object.keys(val.data)
        .map(key => JSON.stringify(key) + ':' + getCVTypeString(val.data[key]))
        .join(',')})`;
  }
}
