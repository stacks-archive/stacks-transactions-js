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
  BooleanCV,
} from '../../src/clarity/clarityTypes';
import { BufferReader } from '../../src/utils';

const ADDRESS = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';

function serializeDeserialize<T extends ClarityValue>(value: T): ClarityValue {
  const serializedDeserialized: Buffer = value.serialize();
  const bufferReader = new BufferReader(serializedDeserialized);
  return ClarityValue.deserialize(bufferReader);
}

describe('Clarity Types', () => {
  describe('Serialize Then Deserialize', () => {
    test('TrueCV', () => {
      const trueCV = new TrueCV();
      const serializedDeserialized = serializeDeserialize(trueCV);
      expect(serializedDeserialized).toEqual(trueCV);
    });

    test('FalseCV', () => {
      const falseCV = new FalseCV();
      const serializedDeserialized = serializeDeserialize(falseCV);
      expect(serializedDeserialized).toEqual(falseCV);
    });

    test('NoneCV', () => {
      const noneCV = new NoneCV();
      const serializedDeserialized = serializeDeserialize(noneCV);
      expect(serializedDeserialized).toEqual(noneCV);
    });

    test('SomeCV', () => {
      const someCV = new SomeCV(new TrueCV());
      const serializedDeserialized = serializeDeserialize(someCV);
      expect(serializedDeserialized).toEqual(someCV);
    });

    test('BufferCV', () => {
      const buffer = Buffer.from('this is a test');
      const bufferCV = new BufferCV(buffer);
      const serializedDeserialized = serializeDeserialize(bufferCV);
      expect(serializedDeserialized).toEqual(bufferCV);
    });

    test('IntCV', () => {
      const int = new IntCV(10);
      const serializedDeserialized = serializeDeserialize(int) as IntCV;
      expect(serializedDeserialized.value.toString()).toEqual(int.value.toString());
    });

    test('UIntCV', () => {
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

    test('ListCV', () => {
      const list = new ListCV([new TrueCV(), new FalseCV()]);
      const serializedDeserialized = serializeDeserialize(list);
      expect(serializedDeserialized).toEqual(list);
    });

    test('TupleCV', () => {
      const tuple = new TupleCV({
        c: new TrueCV(),
        b: new FalseCV(),
        a: new TrueCV(),
      });
      const serializedDeserialized = serializeDeserialize(tuple) as TupleCV<any>;
      expect(serializedDeserialized).toEqual(tuple);

      // Test lexicographic ordering of tuple keys
      const lexicographic = tuple.keys().sort((a, b) => {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        return bufA.compare(bufB);
      });
      expect(serializedDeserialized.keys()).toEqual(lexicographic);
    });
  });

  describe('Serialization Test Vectors', () => {
    test('Int 1 Vector', () => {
      const int = new IntCV(1);
      const serialized = int.serialize().toString('hex');
      expect(serialized).toEqual('0000000000000000000000000000000001');
    });

    test('Int -1 Vector', () => {
      const int = new IntCV(-1);
      const serialized = int.serialize().toString('hex');
      expect(serialized).toEqual('00ffffffffffffffffffffffffffffffff');
    });

    test('UInt 1 Vector', () => {
      const uint = new UIntCV(1);
      const serialized = uint.serialize().toString('hex');
      expect(serialized).toEqual('0100000000000000000000000000000001');
    });

    test('Buffer Vector', () => {
      const buffer = new BufferCV(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
      const serialized = buffer.serialize().toString('hex');
      expect(serialized).toEqual('0200000004deadbeef');
    });

    test('True Vector', () => {
      const trueCV = new TrueCV();
      const serialized = trueCV.serialize().toString('hex');
      expect(serialized).toEqual('03');
    });

    test('False Vector', () => {
      const falseCV = new FalseCV();
      const serialized = falseCV.serialize().toString('hex');
      expect(serialized).toEqual('04');
    });

    test('Standard Principal Vector', () => {
      const addressBuffer = Buffer.from([0x11, 0xde, 0xad, 0xbe, 0xef, 0x11, 0xab, 0xab, 0xff, 0xff,
        0x11, 0xde, 0xad, 0xbe, 0xef, 0x11, 0xab, 0xab, 0xff, 0xff]);
      const standardPrincipal = StandardPrincipalCV.fromBuffer(0x00, addressBuffer);
      const serialized = standardPrincipal.serialize().toString('hex');
      expect(serialized).toEqual('050011deadbeef11ababffff11deadbeef11ababffff');
    });

    test('Contract Principal Vector', () => {
      const addressBuffer = Buffer.from([0x11, 0xde, 0xad, 0xbe, 0xef, 0x11, 0xab, 0xab, 0xff, 0xff,
        0x11, 0xde, 0xad, 0xbe, 0xef, 0x11, 0xab, 0xab, 0xff, 0xff]);
      const contractName = "abcd";
      const standardPrincipal = StandardPrincipalCV.fromBuffer(0x00, addressBuffer);
      const contractPrincipal = ContractPrincipalCV.fromStandardPrincipal(contractName, standardPrincipal);
      const serialized = contractPrincipal.serialize().toString('hex');
      expect(serialized).toEqual('060011deadbeef11ababffff11deadbeef11ababffff0461626364');
    });

    test('Response Ok Vector', () => {
      const ok = new ResponseOkCV(new IntCV(-1))
      const serialized = ok.serialize().toString('hex');
      expect(serialized).toEqual('0700ffffffffffffffffffffffffffffffff');
    });

    test('Response Err Vector', () => {
      const err = new ResponseErrorCV(new IntCV(-1))
      const serialized = err.serialize().toString('hex');
      expect(serialized).toEqual('0800ffffffffffffffffffffffffffffffff');
    });

    test('None Vector', () => {
      const none = new NoneCV()
      const serialized = none.serialize().toString('hex');
      expect(serialized).toEqual('09');
    });

    test('Some Vector', () => {
      const some = new SomeCV(new IntCV(-1))
      const serialized = some.serialize().toString('hex');
      expect(serialized).toEqual('0a00ffffffffffffffffffffffffffffffff');
    });

    test('List Vector', () => {
      const list = new ListCV([new IntCV(1), new IntCV(2), new IntCV(3), new IntCV(-4)])
      const serialized = list.serialize().toString('hex');
      expect(serialized).toEqual('0b0000000400000000000000000000000000000000010000000000000000000000000000000002000000000000000000000000000000000300fffffffffffffffffffffffffffffffc');
    });

    test('Tuple Vector', () => {
      const tuple = new TupleCV({
        "baz": new NoneCV(),
        "foobar": new TrueCV()
      })
      const serialized = tuple.serialize().toString('hex');
      expect(serialized).toEqual('0c000000020362617a0906666f6f62617203');
    });
  });
});
