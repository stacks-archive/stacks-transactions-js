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

/**
 * Type IDs corresponding to each of the Clarity value types as described here:
 * {@link https://github.com/blockstack/blockstack-core/blob/sip/sip-005/sip/sip-005-blocks-and-transactions.md#clarity-value-representation}
 */
export enum ClarityType {
  Int = '00',
  UInt = '01',
  Buffer = '02',
  BoolTrue = '03',
  BoolFalse = '04',
  PrincipalStandard = '05',
  PrincipalContract = '06',
  ResponseOk = '07',
  ResponseErr = '08',
  OptionalNone = '09',
  OptionalSome = '0a',
  List = '0b',
  Tuple = '0c',
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
