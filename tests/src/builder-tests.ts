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
  estimateTransfer,
  broadcastTransaction,
} from '../../src/builders';

import { createAssetInfo } from '../../src/types';

import {
  DEFAULT_CORE_NODE_API_URL,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
} from '../../src/constants';

import { StacksTestnet, StacksMainnet } from '../../src/network';

import { bufferCV, standardPrincipalCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

import { enableFetchMocks } from 'jest-fetch-mock';

enableFetchMocks();

beforeEach(() => {
  fetchMock.resetMocks();
});

test('Make STX token transfer with set tx fee', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const options = {
    fee,
    memo: memo,
  };

  const transaction = await makeSTXTokenTransfer(recipient, amount, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00008b316d56e35b3b8d03ab3b9dbe05eb44d64c53e7ba3c468f9a78c82a13f2174c32facb0f29faeb2107' +
    '5ec933db935ebc28a8793cc60e14b8ee4ef05f52c94016030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Make STX token transfer with fee estimate', async () => {
  const apiUrl = `${DEFAULT_CORE_NODE_API_URL}/v2/fees/transfer`;
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const estimateFeeRate = 1;
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const options = {
    memo: memo,
  };

  fetchMock.mockOnce(`${estimateFeeRate}`);

  const transaction = await makeSTXTokenTransfer(recipient, amount, secretKey, options);
  const fee = new BigNum(transaction.serialize().byteLength * estimateFeeRate);

  expect(transaction.auth.spendingCondition?.fee?.toNumber()).toEqual(fee.toNumber());

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c775000000000000000000000000000000b4' +
    '0001e5ac1152f6018fbfded102268b22086666150823d0ae57f4023bde058a7ff0b279076db25b358b8833' +
    '2efba7a8a75e7ccd08207af62d799e6eb8b0357ad55558030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(serialized).toBe(tx);
});

test('Make STX token transfer with testnet', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer(recipient, amount, secretKey, {
    fee,
    network: new StacksTestnet(),
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

test('Make STX token transfer with post conditions', async () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
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
    fee,
    memo,
    postConditions,
  };

  const transaction = await makeSTXTokenTransfer(
    standardPrincipalCV(recipientAddress),
    amount,
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

test('Make smart contract deploy', async () => {
  const contractName = 'kv-store';
  const code = fs.readFileSync('./tests/src/contracts/kv-store.clar').toString();
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const fee = new BigNum(0);

  const options = {
    fee,
    network: new StacksTestnet(),
  };

  const transaction = await makeSmartContractDeploy(contractName, code, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000' +
    '0000c9c499f85df311348f81520268e11acadb8be0df1bb8db85989f71e32db7192e2806a1179fce6bf775' +
    '932b28976c9e78c645d7acac8eefaf416a14f4fd14a49303020000000001086b762d73746f726500000156' +
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

test('Make contract-call', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const options = {
    fee,
    nonce: new BigNum(1),
    network: new StacksTestnet(),
  };

  const transaction = await makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    secretKey,
    options
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000b2c4262b8716891ee4a3361b31b3847cdb3d4897538f0f7716a3720686aee96f01be6610141c6afb36' +
    'f32c60575147b7e08191bae5cf9706c528adf46f28473e030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post conditions', async () => {
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

  const fee = new BigNum(0);

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

  const transaction = await makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    secretKey,
    {
      fee,
      nonce: new BigNum(1),
      network: new StacksTestnet(),
      postConditions,
      postConditionMode: PostConditionMode.Deny,
    }
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '00006d8cc28f1348a5373372631170e4c95cd6b3e594514af3ebf0eccafe11b500c64923e8581df3ef4424' +
    '9b7d1993d23857b249da0c7135a3d8604040f66e4c728803020000000600021a5dd8ff3545259925b98252' +
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

test('Make contract-call with post condition allow mode', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const secretKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const transaction = await makeContractCall(
    contractAddress,
    contractName,
    functionName,
    [buffer],
    secretKey,
    {
      fee,
      nonce: new BigNum(1),
      network: new StacksTestnet(),
      postConditionMode: PostConditionMode.Allow,
    }
  );

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c50034290000000000000001000000000000000' +
    '0000074ba5083c1b444e5d1eb7bc7add66a9a511f57fc4b2514f5b0e54892962d5b453ea0ec6e473bc695' +
    '22fd3fdd9104b7a354f830ad7ceabd0b3f2859d15697ad9b030100000000021ae6c05355e0c990ffad19a' +
    '5e9bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Estimate token transfer fee', async () => {
  const apiUrl = `${DEFAULT_CORE_NODE_API_URL}/v2/fees/transfer`;
  const estimateFeeRate = 1;

  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const options = {
    fee,
    memo: memo,
  };

  const transaction = await makeSTXTokenTransfer(recipient, amount, secretKey, options);
  const transactionByteLength = transaction.serialize().byteLength;

  fetchMock.mockOnce(`${estimateFeeRate}`);

  const estimateFee = new BigNum(transactionByteLength * estimateFeeRate);
  const resultEstimateFee = await estimateTransfer(transaction);

  fetchMock.mockOnce(`${estimateFeeRate}`);
  const network = new StacksTestnet();
  const resultEstimateFee2 = await estimateTransfer(transaction, network);

  expect(fetchMock.mock.calls.length).toEqual(2);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(fetchMock.mock.calls[1][0]).toEqual(network.transferFeeEstimateApiUrl);
  expect(resultEstimateFee.toNumber()).toEqual(estimateFee.toNumber());
  expect(resultEstimateFee2.toNumber()).toEqual(estimateFee.toNumber());
});

test('Transaction broadcast', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const options = {
    fee,
    memo: memo,
  };

  const transaction = await makeSTXTokenTransfer(recipient, amount, secretKey, options);

  fetchMock.mockOnce('mock core node API response');

  broadcastTransaction(transaction, network);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.broadcastApiUrl);
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(transaction.serialize());
});
