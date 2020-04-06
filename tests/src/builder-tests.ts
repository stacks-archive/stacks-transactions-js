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

import { AssetInfo } from '../../src/types';

import {
  TransactionVersion,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
} from '../../src/constants';

import { bufferCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

test('Make STX token transfer', () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(12345);
  const feeRate = new BigNum(0);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const options = {
    memo: memo,
  };

  const transaction = makeSTXTokenTransfer(recipientAddress, amount, feeRate, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000000040015c31b8c1c11c515e244b75806bac48d1399c775000000000000000000000000000' +
    '00000000004ae1e7a04089e596377ab4a0f74dfbae05c615a8223f1896df0f28fc334dc794f6faed38abdb' +
    'c611a0f1816738016afa25b4478e607b4d2a58c3d07925f8e040302000000000016df0ba3e79792be7be5e' +
    '50a370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000' +
    '0000000000000000000';

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

  const transaction = makeSTXTokenTransfer(recipientAddress, amount, feeRate, secretKey, options);

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000000040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00008259ea38f7ac7444e043072f046db6b47cebe0b864fa60fa193eb25b82e0d3bf67073821a57392fbd5' +
    '148827c0b1d62bb679affacdc342cc3fa4011d4f85d0db030200000001000216df0ba3e79792be7be5e50a' +
    '370289accfc8c9e03203000000000000d4310016df0ba3e79792be7be5e50a370289accfc8c9e032000000' +
    '000000303974657374206d656d6f00000000000000000000000000000000000000000000000000';

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
    '80000000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000' +
    '000073d449aa44ede1bc30c757ccf6cf6119f19567728be8a7d160c188c101e4ad79654f5f2345723c962f' +
    '5a465ad0e22a4237c456da46194945ae553d366eee9c4b03020000000001086b762d73746f726500000156' +
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
    '80000000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '00000847ecd645be0141ccbfe7ec25ff9ef1a00cb133623327e351dfb9adb7e09e8f304b0925a3be18f5b1' +
    '984b2d929f425e5849955abde10f1634501a4e31ba3586030200000000021ae6c05355e0c990ffad19a5e9' +
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
  const assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);
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
      assetInfo
    ),
    makeContractFungiblePostCondition(
      postConditionAddress,
      contractName,
      FungibleConditionCode.Equal,
      new BigNum(1),
      assetInfo
    ),
    makeStandardNonFungiblePostCondition(
      postConditionAddress,
      NonFungibleConditionCode.Owns,
      assetInfo,
      tokenAssetName
    ),
    makeContractNonFungiblePostCondition(
      postConditionAddress,
      contractName,
      NonFungibleConditionCode.DoesNotOwn,
      assetInfo,
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
    '80000000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '00000861bcaec8651116ee64b3d228db5c91ad0438659176cc5b719b3aef4fe271ab5ccb437070c3a407a0' +
    '57a91757f0335a70aee7932219934daceba022ac5983ab03020000000600021a5dd8ff3545259925b98252' +
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
    '80000000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '00000847ecd645be0141ccbfe7ec25ff9ef1a00cb133623327e351dfb9adb7e09e8f304b0925a3be18f5b1' +
    '984b2d929f425e5849955abde10f1634501a4e31ba3586030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});
