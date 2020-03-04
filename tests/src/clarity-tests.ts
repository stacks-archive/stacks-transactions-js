import {
  TrueCV,
  ClarityValue,
  FalseCV,
  NoneCV,
  SomeCV,
  BufferCV,
  IntCV,
  UIntCV,
  StandardPrincipalCV,
  ContractPrincipalCV,
  ResponseOkCV,
  ResponseErrorCV,
  ListCV,
  TupleCV,
} from '../../src/clarity/clarityTypes';
import { BufferReader } from '../../src/utils';

const ADDRESS = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';

function serializeDeserialize<T extends ClarityValue>(value: T): ClarityValue {
  const serializedDeserialized: Buffer = value.serialize();
  const bufferReader = new BufferReader(serializedDeserialized);
  return ClarityValue.deserialize(bufferReader);
}

describe('Clarity Types Serialization/Deserialization', () => {
  test('True', () => {
    const trueCV = new TrueCV();
    const serializedDeserialized = serializeDeserialize(trueCV);
    expect(serializedDeserialized).toEqual(trueCV);
  });

  test('False', () => {
    const falseCV = new FalseCV();
    const serializedDeserialized = serializeDeserialize(falseCV);
    expect(serializedDeserialized).toEqual(falseCV);
  });

  test('None', () => {
    const noneCV = new NoneCV();
    const serializedDeserialized = serializeDeserialize(noneCV);
    expect(serializedDeserialized).toEqual(noneCV);
  });

  test('Some', () => {
    const someCV = new SomeCV(new TrueCV());
    const serializedDeserialized = serializeDeserialize(someCV);
    expect(serializedDeserialized).toEqual(someCV);
  });

  test('Buffer', () => {
    const buffer = new Buffer('this is a test');
    const bufferCV = new BufferCV(buffer);
    const serializedDeserialized = serializeDeserialize(bufferCV);
    expect(serializedDeserialized).toEqual(bufferCV);
  });

  test('Int', () => {
    const int = new IntCV(10);
    const serializedDeserialized = serializeDeserialize(int) as IntCV;
    expect(serializedDeserialized.value.toString()).toEqual(int.value.toString());
  });

  test('UInt', () => {
    const uint = new UIntCV(10);
    const serializedDeserialized = serializeDeserialize(uint) as UIntCV;
    expect(serializedDeserialized.value.toString()).toEqual(uint.value.toString());
  });

  test('Standard Principal', () => {
    const standardPrincipal = new StandardPrincipalCV(ADDRESS);
    const serializedDeserialized = serializeDeserialize(standardPrincipal);
    expect(serializedDeserialized).toEqual(standardPrincipal);
  });

  test('Contract Principal', () => {
    const contractPrincipal = new ContractPrincipalCV(ADDRESS, 'test-contract');
    const serializedDeserialized = serializeDeserialize(contractPrincipal);
    expect(serializedDeserialized).toEqual(contractPrincipal);
  });

  test('Response Ok', () => {
    const responseOk = new ResponseOkCV(new TrueCV());
    const serializedDeserialized = serializeDeserialize(responseOk);
    expect(serializedDeserialized).toEqual(responseOk);
  });

  test('Response Error', () => {
    const responseErr = new ResponseErrorCV(new TrueCV());
    const serializedDeserialized = serializeDeserialize(responseErr);
    expect(serializedDeserialized).toEqual(responseErr);
  });

  test('Optional None', () => {
    const none = new NoneCV();
    const serializedDeserialized = serializeDeserialize(none);
    expect(serializedDeserialized).toEqual(none);
  });

  test('Optional Some', () => {
    const some = new SomeCV(new IntCV(9));
    const serializedDeserialized = serializeDeserialize(some);
    expect(serializedDeserialized).toEqual(some);
  });

  test('List', () => {
    const list = new ListCV([new TrueCV(), new FalseCV()]);
    const serializedDeserialized = serializeDeserialize(list);
    expect(serializedDeserialized).toEqual(list);
  });

  test('Tuple', () => {
    const tuple = new TupleCV({
      one: new TrueCV(),
      two: new FalseCV(),
    });
    const serializedDeserialized = serializeDeserialize(tuple);
    expect(serializedDeserialized).toEqual(tuple);
  });
});
