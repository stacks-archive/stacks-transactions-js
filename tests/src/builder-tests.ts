import * as fs from 'fs';

import {
  makeSTXTokenTransfer,
  makeSmartContractDeploy,
  makeContractCall,
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeContractFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  makeContractNonFungiblePostCondition,
} from '../../src/builders';

import { createAssetInfo } from '../../src/types';

import {
  TransactionVersion,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  ChainID,
} from '../../src/constants';

import { bufferCV, standardPrincipalCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

test('Make STX token transfer', () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const feeRate = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const options = {
    memo: memo,
  };

  const transaction = makeSTXTokenTransfer(recipient, amount, feeRate, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00008b316d56e35b3b8d03ab3b9dbe05eb44d64c53e7ba3c468f9a78c82a13f2174c32facb0f29faeb2107' +
    '5ec933db935ebc28a8793cc60e14b8ee4ef05f52c94016030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Make STX token transfer with testnet', () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const feeRate = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = makeSTXTokenTransfer(recipient, amount, feeRate, secretKey, {
    version: TransactionVersion.Testnet,
    chainId: ChainID.Testnet,
    memo: memo,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '8080000000040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00014199f63f7e010141a36a4624d032758f54e08ff03b24ed2667463eb405b4d81505631b32a1f13b5737' +
    '1f29a6095b81741b32b5864b178e3546ff2bfb3dc08682030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Make STX token transfer with post conditions', () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(12345);
  const feeRate = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const postConditions = [
    makeStandardSTXPostCondition(
      recipientAddress,
      FungibleConditionCode.GreaterEqual,
      new BigNum(54321)
    ),
  ];

  const options = {
    memo,
    postConditions,
  };

  const transaction = makeSTXTokenTransfer(
    standardPrincipalCV(recipientAddress),
    amount,
    feeRate,
    secretKey,
    options
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '0001601ceb46ef6988c8b226c80fef4051de6acf344dc67a9421d3e734a72ae310104b061e69cee5d9ee7a' +
    '6e1cef17f23b07d7fe4db5fcdb83de0d5f08043a06a36a030200000001000216df0ba3e79792be7be5e50a' +
    '370289accfc8c9e03203000000000000d431000516df0ba3e79792be7be5e50a370289accfc8c9e0320000' +
    '00000000303974657374206d656d6f00000000000000000000000000000000000000000000000000';

  expect(serialized).toBe(tx);
});

test('Make smart contract deploy', () => {
  const contractName = 'kv-store';
  const code = fs.readFileSync('./tests/src/contracts/kv-store.clar').toString();
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const feeRate = new BigNum(0);

  const options = {
    version: TransactionVersion.Testnet,
  };

  const transaction = makeSmartContractDeploy(contractName, code, feeRate, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80000000010400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000' +
    '0000c9dc4064c85e9d595299fd480c4e8d894744a8180c18bbb7003eab47e880e81338e68c3a30b587244b' +
    'a1a3fbe5853cc4a65c593ccbfd1b70b522eea6a74630cc03020000000001086b762d73746f726500000156' +
    '28646566696e652d6d61702073746f72652028286b657920286275666620333229292920282876616c7565' +
    '202862756666203332292929290a0a28646566696e652d7075626c696320286765742d76616c756520286b' +
    '65792028627566662033322929290a20202020286d6174636820286d61702d6765743f2073746f72652028' +
    '286b6579206b65792929290a2020202020202020656e74727920286f6b20286765742076616c756520656e' +
    '74727929290a20202020202020202865727220302929290a0a28646566696e652d7075626c696320287365' +
    '742d76616c756520286b65792028627566662033322929202876616c75652028627566662033322929290a' +
    '2020202028626567696e0a2020202020202020286d61702d7365742073746f72652028286b6579206b6579' +
    '292920282876616c75652076616c75652929290a2020202020202020286f6b2027747275652929290a';

  expect(serialized).toBe(tx);
});

test('Make contract-call', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const feeRate = new BigNum(0);

  const options = {
    nonce: new BigNum(1),
    version: TransactionVersion.Testnet,
  };

  const transaction = makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    feeRate,
    secretKey,
    options
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80000000010400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000bdf1592fef11d55466692063b9b286bb5e9918aefcf99584abede81a615ef10e4ead079d3dc8aec254' +
    '3469837a971aea1c9a3df68ce643bfb87362acab657613030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post conditions', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const postConditionAddress = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
  const assetAddress = 'ST34RKEJKQES7MXQFBT29KSJZD73QK3YNT5N56C6X';
  const assetContractName = 'test-asset-contract';
  const assetName = 'test-asset-name';
  const info = createAssetInfo(assetAddress, assetContractName, assetName);
  const tokenAssetName = 'token-asset-name';

  const feeRate = new BigNum(0);

  const postConditions = [
    makeStandardSTXPostCondition(
      postConditionAddress,
      FungibleConditionCode.GreaterEqual,
      new BigNum(10)
    ),
    makeContractSTXPostCondition(
      contractAddress,
      contractName,
      FungibleConditionCode.GreaterEqual,
      new BigNum(12345)
    ),
    makeStandardFungiblePostCondition(
      postConditionAddress,
      FungibleConditionCode.Less,
      new BigNum(1000),
      info
    ),
    makeContractFungiblePostCondition(
      postConditionAddress,
      contractName,
      FungibleConditionCode.Equal,
      new BigNum(1),
      info
    ),
    makeStandardNonFungiblePostCondition(
      postConditionAddress,
      NonFungibleConditionCode.Owns,
      info,
      tokenAssetName
    ),
    makeContractNonFungiblePostCondition(
      postConditionAddress,
      contractName,
      NonFungibleConditionCode.DoesNotOwn,
      info,
      tokenAssetName
    ),
  ];

  const options = {
    nonce: new BigNum(1),
    version: TransactionVersion.Testnet,
    postConditions,
    postConditMode: PostConditionMode.Deny,
  };

  const transaction = makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    feeRate,
    secretKey,
    options
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80000000010400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0001c479cc4c3048e5e617620859ba8b6c8c1fce4c3b7834e98c19de85866c4a102c51bb872fd047d1bd1b' +
    '8e84081efae5c4bfd7942229b85d9fc83dc4d8ca8c7d3003020000000600021a5dd8ff3545259925b98252' +
    '4807686567eec2933f03000000000000000a00031ae6c05355e0c990ffad19a5e9bda394a9c5003429086b' +
    '762d73746f726503000000000000303901021a5dd8ff3545259925b982524807686567eec2933f1ac989ba' +
    '53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d' +
    '61737365742d6e616d650400000000000003e801031a5dd8ff3545259925b982524807686567eec2933f08' +
    '6b762d73746f72651ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f' +
    '6e74726163740f746573742d61737365742d6e616d6501000000000000000102021a5dd8ff3545259925b9' +
    '82524807686567eec2933f1ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d6173736574' +
    '2d636f6e74726163740f746573742d61737365742d6e616d6510746f6b656e2d61737365742d6e616d6511' +
    '02031a5dd8ff3545259925b982524807686567eec2933f086b762d73746f72651ac989ba53bbb27a76ef5e' +
    '8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d61737365742d6e' +
    '616d6510746f6b656e2d61737365742d6e616d6510021ae6c05355e0c990ffad19a5e9bda394a9c5003429' +
    '086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post condition allow mode', () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const feeRate = new BigNum(0);

  const options = {
    nonce: new BigNum(1),
    version: TransactionVersion.Testnet,
    postConditMode: PostConditionMode.Allow,
  };

  const transaction = makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    feeRate,
    secretKey,
    options
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80000000010400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000bdf1592fef11d55466692063b9b286bb5e9918aefcf99584abede81a615ef10e4ead079d3dc8aec254' +
    '3469837a971aea1c9a3df68ce643bfb87362acab657613030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});
