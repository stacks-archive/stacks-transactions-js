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
  getNonce,
  TxBroadcastResult,
  TxBroadcastResultOk,
} from '../../src/builders';

import { createAssetInfo } from '../../src/types';

import {
  DEFAULT_CORE_NODE_API_URL,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  TxBroadcastError,
} from '../../src/constants';

import { StacksTestnet, StacksMainnet } from '../../src/network';

import { bufferCV, standardPrincipalCV, bufferCVFromString, serializeCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

import { enableFetchMocks } from 'jest-fetch-mock';
import { ClarityAbi } from '../../src/contract-abi';

enableFetchMocks();

beforeEach(() => {
  fetchMock.resetMocks();
});

test('Make STX token transfer with set tx fee', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo: memo,
  });

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
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  fetchMock.mockOnce(`${estimateFeeRate}`);

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    nonce,
    senderKey,
    memo,
  });

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
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
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
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const postConditions = [
    makeStandardSTXPostCondition(
      recipientAddress,
      FungibleConditionCode.GreaterEqual,
      new BigNum(54321)
    ),
  ];

  const transaction = await makeSTXTokenTransfer({
    recipient: standardPrincipalCV(recipientAddress),
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    postConditions,
  });

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
  const codeBody = fs.readFileSync('./tests/src/contracts/kv-store.clar').toString();
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const fee = new BigNum(0);
  const nonce = new BigNum(0);

  const transaction = await makeSmartContractDeploy({
    contractName,
    codeBody,
    senderKey,
    fee,
    nonce,
    network: new StacksTestnet(),
  });

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
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: new BigNum(1),
    network: new StacksTestnet(),
  });

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
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
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
      bufferCVFromString(tokenAssetName)
    ),
    makeContractNonFungiblePostCondition(
      postConditionAddress,
      contractName,
      NonFungibleConditionCode.DoesNotOwn,
      info,
      bufferCVFromString(tokenAssetName)
    ),
  ];

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: new BigNum(1),
    network: new StacksTestnet(),
    postConditions,
    postConditionMode: PostConditionMode.Deny,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000dcaf5f38038f787babf86644e0251945b93d9bffac610fb3b8c56da9eb2961de04ab66f64aa0b2e1cc' +
    '04172a2b002b8ff34e4b0c3ee430c00331c911325446c203020000000600021a5dd8ff3545259925b98252' +
    '4807686567eec2933f03000000000000000a00031ae6c05355e0c990ffad19a5e9bda394a9c5003429086b' +
    '762d73746f726503000000000000303901021a5dd8ff3545259925b982524807686567eec2933f1ac989ba' +
    '53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d' +
    '61737365742d6e616d650400000000000003e801031a5dd8ff3545259925b982524807686567eec2933f08' +
    '6b762d73746f72651ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f' +
    '6e74726163740f746573742d61737365742d6e616d6501000000000000000102021a5dd8ff3545259925b9' +
    '82524807686567eec2933f1ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d6173736574' +
    '2d636f6e74726163740f746573742d61737365742d6e616d650200000010746f6b656e2d61737365742d6e' +
    '616d651102031a5dd8ff3545259925b982524807686567eec2933f086b762d73746f72651ac989ba53bbb2' +
    '7a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d617373' +
    '65742d6e616d650200000010746f6b656e2d61737365742d6e616d6510021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post condition allow mode', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: new BigNum(1),
    network: new StacksTestnet(),
    postConditionMode: PostConditionMode.Allow,
  });

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
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
  });

  const transactionByteLength = transaction.serialize().byteLength;

  fetchMock.mockOnce(`${estimateFeeRate}`);

  const estimateFee = new BigNum(transactionByteLength * estimateFeeRate);
  const resultEstimateFee = await estimateTransfer(transaction);

  fetchMock.mockOnce(`${estimateFeeRate}`);
  const network = new StacksTestnet();
  const resultEstimateFee2 = await estimateTransfer(transaction, network);

  expect(fetchMock.mock.calls.length).toEqual(2);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(fetchMock.mock.calls[1][0]).toEqual(network.getTransferFeeEstimateApiUrl());
  expect(resultEstimateFee.toNumber()).toEqual(estimateFee.toNumber());
  expect(resultEstimateFee2.toNumber()).toEqual(estimateFee.toNumber());
});

test('Make STX token transfer with fetch account nonce', async () => {
  const nonce = 123;
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const senderKey = 'cb3df38053d132895220b9ce471f6b676db5b9bf0b4adefb55f2118ece2478df01';
  const senderAddress = 'STB44HYPYAT2BB2QE513NSP81HTMYWBJP02HPGK6';
  const memo = 'test memo';
  const network = new StacksTestnet();
  const apiUrl = network.getAccountApiUrl(senderAddress);

  fetchMock.mockOnce(`{"balance":"0", "nonce":${nonce}}`);

  const fetchNonce = await getNonce(senderAddress, network);

  fetchMock.mockOnce(`{"balance":"0", "nonce":${nonce}}`);

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    memo,
    network,
  });

  expect(fetchMock.mock.calls.length).toEqual(2);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(fetchMock.mock.calls[1][0]).toEqual(apiUrl);
  expect(fetchNonce.toNumber()).toEqual(nonce);
  expect(transaction.auth.spendingCondition?.nonce?.toNumber()).toEqual(nonce);
});

test('Transaction broadcast success', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
  });

  fetchMock.mockOnce('mock core node API response');

  const response: TxBroadcastResult = await broadcastTransaction(transaction, network);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getBroadcastApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(transaction.serialize());
  expect((response as TxBroadcastResultOk).ok).toEqual('mock core node API response');
});

test('Transaction broadcast returns error', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
  });

  const rejection = {
    error: 'transaction rejected',
    reason: 'BadNonce',
    reason_data: {
      actual: 3,
      expected: 0,
      is_origin: true,
      principal: 'ST2MVNFYF6H9DCMAV3HVNHTJVVE3CFWT1JYMH1EZB',
    },
    txid: '0x4068179cb9169b969c80518d83890f8b808a70ab998dd227149221be9480a616',
  };

  fetchMock.mockOnce(JSON.stringify(rejection), { status: 400 });

  const result = await broadcastTransaction(transaction, network);
  expect((result as TxBroadcastResultError).error.reason).toEqual(TxBroadcastError.BadNonce);
  expect((result as TxBroadcastResultError).error.data).toEqual(rejection.reason_data);
});

test('Transaction broadcast fails', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = new BigNum(12345);
  const fee = new BigNum(0);
  const nonce = new BigNum(0);
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
  });

  fetchMock.mockOnce('test', { status: 400 });

  await expect(broadcastTransaction(transaction, network)).rejects.toThrow();
});

test('Make contract-call with network ABI validation', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const network = new StacksTestnet();

  const abi = fs.readFileSync('./tests/src/abi/kv-store-abi.json').toString();
  fetchMock.mockOnce(abi);

  await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    senderKey,
    functionArgs: [buffer],
    fee,
    nonce: new BigNum(1),
    network: new StacksTestnet(),
    validateWithAbi: true,
    postConditionMode: PostConditionMode.Allow,
  });

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getAbiApiUrl(contractAddress, contractName));
});

test('Make contract-call with provided ABI validation', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const abi: ClarityAbi = JSON.parse(
    fs.readFileSync('./tests/src/abi/kv-store-abi.json').toString()
  );

  await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    senderKey,
    functionArgs: [buffer],
    fee,
    nonce: new BigNum(1),
    validateWithAbi: abi,
    postConditionMode: PostConditionMode.Allow,
  });
});

test('Make contract-call with network ABI validation failure', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = new BigNum(0);

  const network = new StacksTestnet();

  const abi = fs.readFileSync('./tests/src/abi/kv-store-abi.json').toString();
  // fetchMock.mockOnce(abi);
  fetchMock.mockOnce('failed', { status: 404 });

  let error;
  try {
    await makeContractCall({
      contractAddress,
      contractName,
      functionName,
      senderKey,
      functionArgs: [buffer],
      fee,
      nonce: new BigNum(1),
      network: new StacksTestnet(),
      validateWithAbi: true,
      postConditionMode: PostConditionMode.Allow,
    });
  } catch (e) {
    error = e;
  }

  const abiUrl = network.getAbiApiUrl(contractAddress, contractName);
  expect(error).toEqual(
    new Error(
      `Error fetching contract ABI for contract "kv-store" at address ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE. Response 404: Not Found. Attempted to fetch ${abiUrl} and failed with the message: "failed"`
    )
  );
});

test('Call read-only function', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value?';
  const buffer = bufferCVFromString('foo');
  const network = new StacksTestnet();
  const senderAddress = 'ST2F4BK4GZH6YFBNHYDDGN4T1RKBA7DA1BJZPJEJJ';
  const mockResult = bufferCVFromString('test');

  const options = {
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    network,
    senderAddress,
  };

  const apiUrl = network.getReadOnlyFunctionCallApiUrl(contractAddress, contractName, functionName);
  fetchMock.mockOnce(`{"okay": true, "result": "0x${serializeCV(mockResult).toString('hex')}"}`);

  const result = await callReadOnlyFunction(options);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(result).toEqual(mockResult);
});
