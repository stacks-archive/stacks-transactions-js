import { readFileSync } from 'fs';
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
} from '../../src/clarity';
import { validateContractCall, ClarityAbi, abiFunctionToString } from '../../src/contract-abi';
import { oneLineTrim } from 'common-tags';

const TEST_ABI: ClarityAbi = JSON.parse(readFileSync('./tests/src/abi/test-abi.json').toString());

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
    oneLineTrim`
    Clarity function \`tuple-test\` expects argument 1 to be of type 
      (tuple 
        (key1 bool) 
        (key2 int) 
        (key3 uint) 
        (key4 principal) 
        (key5 (buff 3)) 
        (key6 (optional bool)) 
        (key7 (response bool bool)) 
        (key8 (list 2 bool))), not 
      (tuple 
        (key1 bool) 
        (key2 int) 
        (key3 uint) 
        (key4 principal) 
        (key5 (buff 3)) 
        (key6 (optional none)) 
        (key7 (responseError bool)) 
        (key8 bool))`
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
    oneLineTrim`
    Clarity function \`tuple-test\` expects argument 1 to be of type 
    (tuple 
      (key1 bool) 
      (key2 int) 
      (key3 uint) 
      (key4 principal) 
      (key5 (buff 3)) 
      (key6 (optional bool)) 
      (key7 (response bool bool)) 
      (key8 (list 2 bool))), not 
    (tuple 
      (wrong-key bool) 
      (key2 int) 
      (key3 uint) 
      (key4 principal) 
      (key5 (buff 3)) 
      (key6 (optional bool)) 
      (key7 (responseOk bool)) 
      (key9 (list 2 bool)))
    `
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

test('Validation fails when ABI has multiple functions with the same nam', () => {
  const abi: ClarityAbi = {
    functions: [
      {
        name: 'get-value',
        access: 'public',
        args: [{ name: 'key', type: { buffer: { length: 3 } } }],
        outputs: {
          type: { response: { ok: { buffer: { length: 3 } }, error: 'int128' } },
        },
      },
      {
        name: 'get-value',
        access: 'public',
        args: [{ name: 'key', type: { buffer: { length: 3 } } }],
        outputs: {
          type: { response: { ok: { buffer: { length: 3 } }, error: 'int128' } },
        },
      },
    ],
    variables: [],
    maps: [],
    fungible_tokens: [],
    non_fungible_tokens: [],
  };

  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const functionArgs = [trueCV(), falseCV()];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  expect(() => validateContractCall(payload, abi)).toThrow(
    'Malformed ABI. Contains multiple functions with the name get-value'
  );
});

test('Validation fails when abi is missing specified function', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const functionArgs = [trueCV(), falseCV()];

  const payload = createContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  expect(() => validateContractCall(payload, TEST_ABI)).toThrow(
    "ABI doesn't contain a function with the name get-value"
  );
});

test('ABI function to repr string', () => {
  expect(abiFunctionToString(TEST_ABI.functions[1])).toEqual('(define-public (hello (arg1 int)))');
});
