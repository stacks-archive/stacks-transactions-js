import { deserializeAddress } from '../../src/types';
import {
  ClarityValue,
  serializeCV,
  deserializeCV,
  trueCV,
  falseCV,
  noneCV,
  someCV,
  bufferCV,
  IntCV,
  intCV,
  uintCV,
  UIntCV,
  standardPrincipalCV,
  contractPrincipalCV,
  responseOkCV,
  responseErrorCV,
  listCV,
  tupleCV,
  TupleCV,
  standardPrincipalCVFromAddress,
} from '../../src/clarity';
import { contractPrincipalCVFromStandard } from '../../src/clarity/types/principalCV';
import { BufferReader } from '../../src/bufferReader';

const ADDRESS = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';

function serializeDeserialize<T extends ClarityValue>(value: T): ClarityValue {
  const serializedDeserialized: Buffer = serializeCV(value);
  const bufferReader = new BufferReader(serializedDeserialized);
  return deserializeCV(bufferReader);
}

describe('Clarity Types', () => {
  describe('Serialize Then Deserialize', () => {
    test('TrueCV', () => {
      const t = trueCV();
      const serializedDeserialized = serializeDeserialize(t);
      expect(serializedDeserialized).toEqual(t);
    });

    test('FalseCV', () => {
      const f = falseCV();
      const serializedDeserialized = serializeDeserialize(f);
      expect(serializedDeserialized).toEqual(f);
    });

    test('NoneCV', () => {
      const n = noneCV();
      const serializedDeserialized = serializeDeserialize(n);
      expect(serializedDeserialized).toEqual(n);
    });

    test('SomeCV', () => {
      const maybeTrue = someCV(trueCV());
      const serializedDeserialized = serializeDeserialize(maybeTrue);
      expect(serializedDeserialized).toEqual(maybeTrue);
    });

    test('BufferCV', () => {
      const buffer = Buffer.from('this is a test');
      const buf = bufferCV(buffer);
      const serializedDeserialized = serializeDeserialize(buf);
      expect(serializedDeserialized).toEqual(buf);
    });

    test('IntCV', () => {
      const int = intCV(10);
      const serializedDeserialized = serializeDeserialize(int) as IntCV;
      expect(serializedDeserialized.value.toString()).toEqual(int.value.toString());
    });

    test('UIntCV', () => {
      const uint = uintCV(10);
      const serializedDeserialized = serializeDeserialize(uint) as UIntCV;
      expect(serializedDeserialized.value.toString()).toEqual(uint.value.toString());
    });

    test('Standard Principal', () => {
      const standardPrincipal = standardPrincipalCV(ADDRESS);
      const serializedDeserialized = serializeDeserialize(standardPrincipal);
      expect(serializedDeserialized).toEqual(standardPrincipal);
    });

    test('Contract Principal', () => {
      const contractPrincipal = contractPrincipalCV(ADDRESS, 'test-contract');
      const serializedDeserialized = serializeDeserialize(contractPrincipal);
      expect(serializedDeserialized).toEqual(contractPrincipal);
    });

    test('Response Ok', () => {
      const responseOk = responseOkCV(trueCV());
      const serializedDeserialized = serializeDeserialize(responseOk);
      expect(serializedDeserialized).toEqual(responseOk);
    });

    test('Response Error', () => {
      const responseErr = responseErrorCV(trueCV());
      const serializedDeserialized = serializeDeserialize(responseErr);
      expect(serializedDeserialized).toEqual(responseErr);
    });

    test('ListCV', () => {
      const list = listCV([trueCV(), falseCV(), trueCV()]);
      const serializedDeserialized = serializeDeserialize(list);
      expect(serializedDeserialized).toEqual(list);
    });

    test('TupleCV', () => {
      const tuple = tupleCV({
        c: trueCV(),
        b: falseCV(),
        a: trueCV(),
      });
      const serializedDeserialized = serializeDeserialize(tuple) as TupleCV;
      expect(serializedDeserialized).toEqual(tuple);

      // Test lexicographic ordering of tuple keys
      const lexicographic = Object.keys(tuple.data).sort((a, b) => {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        return bufA.compare(bufB);
      });
      expect(Object.keys(serializedDeserialized.data)).toEqual(lexicographic);
    });
  });

  describe('Serialization Test Vectors', () => {
    test('Int 1 Vector', () => {
      const int = intCV(1);
      const serialized = serializeCV(int).toString('hex');
      expect(serialized).toEqual('0000000000000000000000000000000001');
    });

    test('Int -1 Vector', () => {
      const int = intCV(-1);
      const serialized = serializeCV(int).toString('hex');
      expect(serialized).toEqual('00ffffffffffffffffffffffffffffffff');
    });

    test('UInt 1 Vector', () => {
      const uint = uintCV(1);
      const serialized = serializeCV(uint).toString('hex');
      expect(serialized).toEqual('0100000000000000000000000000000001');
    });

    test('Buffer Vector', () => {
      const buffer = bufferCV(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
      const serialized = serializeCV(buffer).toString('hex');
      expect(serialized).toEqual('0200000004deadbeef');
    });

    test('True Vector', () => {
      const t = trueCV();
      const serialized = serializeCV(t).toString('hex');
      expect(serialized).toEqual('03');
    });

    test('False Vector', () => {
      const f = falseCV();
      const serialized = serializeCV(f).toString('hex');
      expect(serialized).toEqual('04');
    });

    test('Standard Principal Vector', () => {
      const addressBuffer = Buffer.from([
        0x11,
        0xde,
        0xad,
        0xbe,
        0xef,
        0x11,
        0xab,
        0xab,
        0xff,
        0xff,
        0x11,
        0xde,
        0xad,
        0xbe,
        0xef,
        0x11,
        0xab,
        0xab,
        0xff,
        0xff,
      ]);
      const bufferReader = new BufferReader(Buffer.concat([Buffer.from([0x00]), addressBuffer]));
      const standardPrincipal = standardPrincipalCVFromAddress(deserializeAddress(bufferReader));
      const serialized = serializeCV(standardPrincipal).toString('hex');
      expect(serialized).toEqual('050011deadbeef11ababffff11deadbeef11ababffff');
    });

    test('Contract Principal Vector', () => {
      const addressBuffer = Buffer.from([
        0x11,
        0xde,
        0xad,
        0xbe,
        0xef,
        0x11,
        0xab,
        0xab,
        0xff,
        0xff,
        0x11,
        0xde,
        0xad,
        0xbe,
        0xef,
        0x11,
        0xab,
        0xab,
        0xff,
        0xff,
      ]);
      const contractName = 'abcd';
      const bufferReader = new BufferReader(Buffer.concat([Buffer.from([0x00]), addressBuffer]));
      const standardPrincipal = standardPrincipalCVFromAddress(deserializeAddress(bufferReader));
      const contractPrincipal = contractPrincipalCVFromStandard(standardPrincipal, contractName);
      const serialized = serializeCV(contractPrincipal).toString('hex');
      expect(serialized).toEqual('060011deadbeef11ababffff11deadbeef11ababffff0461626364');
    });

    test('Response Ok Vector', () => {
      const ok = responseOkCV(intCV(-1));
      const serialized = serializeCV(ok).toString('hex');
      expect(serialized).toEqual('0700ffffffffffffffffffffffffffffffff');
    });

    test('Response Err Vector', () => {
      const err = responseErrorCV(intCV(-1));
      const serialized = serializeCV(err).toString('hex');
      expect(serialized).toEqual('0800ffffffffffffffffffffffffffffffff');
    });

    test('None Vector', () => {
      const none = noneCV();
      const serialized = serializeCV(none).toString('hex');
      expect(serialized).toEqual('09');
    });

    test('Some Vector', () => {
      const some = someCV(intCV(-1));
      const serialized = serializeCV(some).toString('hex');
      expect(serialized).toEqual('0a00ffffffffffffffffffffffffffffffff');
    });

    test('List Vector', () => {
      const list = listCV([intCV(1), intCV(2), intCV(3), intCV(-4)]);
      const serialized = serializeCV(list).toString('hex');
      expect(serialized).toEqual(
        '0b0000000400000000000000000000000000000000010000000000000000000000000000000002000000000000000000000000000000000300fffffffffffffffffffffffffffffffc'
      );
    });

    test('Tuple Vector', () => {
      const tuple = tupleCV({
        baz: noneCV(),
        foobar: trueCV(),
      });
      const serialized = serializeCV(tuple).toString('hex');
      expect(serialized).toEqual('0c000000020362617a0906666f6f62617203');
    });
  });
});
