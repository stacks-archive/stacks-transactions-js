import * as fs from 'fs';
import { createContractCallPayload } from '../../src/payload';
import {
  trueCV,
  intCV,
  tupleCV,
  uintCV,
  standardPrincipalCV,
  bufferCVFromString,
  someCV,
  falseCV,
  listCV,
  responseOkCV,
  responseErrorCV,
  noneCV,
  ClarityValue,
} from '../../src';
import { validateContractCall, ClarityAbi } from '../../src/contract-abi';

const TEST_ABI: ClarityAbi = JSON.parse(
  fs.readFileSync('./tests/src/abi/test-abi.json').toString()
);

test('ABI validation', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'test';
  const functionName = 'tuple-test';
  const functionArgs = [
    tupleCV({
      key1: trueCV(),
      key2: intCV(-1),
      key3: uintCV(1),
      key4: standardPrincipalCV('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B'),
      key5: bufferCVFromString('foo'),
      key6: someCV(falseCV()),
      key7: responseOkCV(trueCV()),
      key8: listCV([trueCV(), falseCV()]),
    }),
  ];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  validateContractCall(payload, TEST_ABI);
});

test('ABI validation fail, tuple mistyped', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'test';
  const functionName = 'tuple-test';
  const functionArgs = [
    tupleCV({
      key1: trueCV(),
      key2: intCV(-1),
      key3: uintCV(1),
      key4: standardPrincipalCV('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B'),
      key5: bufferCVFromString('foo'),
      key6: noneCV(),
      key7: responseErrorCV(trueCV()),
      key8: falseCV(),
    }),
  ];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  expect(() => validateContractCall(payload, TEST_ABI)).toThrow(
    'Clarity function `tuple-test` expects argument 0 to be of type tuple("key1":bool,"key2":int128,"key3":uint128,"key4":principal,"key5":buffer(3),"key6":optional(bool),"key7":response(bool,bool),"key8":list(bool,2))'
  );
});

test('ABI validation fail, tuple wrong key', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'tuple-test';
  const functionArgs = [
    tupleCV({
      'wrong-key': trueCV(),
      key2: intCV(-1),
      key3: uintCV(1),
      key4: standardPrincipalCV('SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B'),
      key5: bufferCVFromString('foo'),
      key6: someCV(falseCV()),
      key7: responseOkCV(trueCV()),
      key9: listCV([trueCV(), falseCV()]),
    }),
  ];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  expect(() => validateContractCall(payload, TEST_ABI)).toThrow(
    'Clarity function `tuple-test` expects argument 0 to be of type tuple("key1":bool,"key2":int128,"key3":uint128,"key4":principal,"key5":buffer(3),"key6":optional(bool),"key7":response(bool,bool),"key8":list(bool,2))'
  );
});

test('ABI validation fail, wrong number of args', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'tuple-test';
  const functionArgs = [trueCV(), falseCV()];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  expect(() => validateContractCall(payload, TEST_ABI)).toThrow(
    'Clarity function expects 1 argument(s) but received 2'
  );
});
