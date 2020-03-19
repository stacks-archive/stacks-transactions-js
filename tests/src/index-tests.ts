import * as fs from 'fs';

import { 
  StacksTransaction,
} from '../../src/transaction';

import {
  StandardAuthorization,
  SponsoredAuthorization,
  SingleSigSpendingCondition,
  MessageSignature
} from '../../src/authorization'

import {
  TokenTransferPayload,
  ContractCallPayload,
  SmartContractPayload,
  PoisonPayload,
  CoinbasePayload,
} from '../../src/payload';

import {
  STXPostCondition,
  FungiblePostCondition,
  NonFungiblePostCondition
} from '../../src/postcondition';

import { 
  Address,
  LengthPrefixedString,
  LengthPrefixedList,
  AssetInfo,
  StandardPrincipal,
  ContractPrincipal
} from "../../src/types";

import { 
  COINBASE_BUFFER_LENGTH_BYTES,
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  AnchorMode,
  PostConditionMode,
  AuthType,
  PayloadType,
  PrincipalType,
  PostConditionType,
  FungibleConditionCode,
  NonFungibleConditionCode,
  AddressHashMode
} 
from '../../src/constants';

import {
  BufferReader,
  hash_p2pkh
} from '../../src/utils';

import {
  StacksPublicKey,
  StacksPrivateKey
} from '../../src/keys';

import {
  TransactionSigner
} from '../../src/signer';

import {
  makeSTXTokenTransfer,
  makeSmartContractDeploy,
  makeContractCall
} from '../../src/builders';

import {
  serializeDeserialize
} from './macros';

import { 
  TrueCV, 
  FalseCV, 
  BufferCV
} from '../../src/clarity/clarityTypes';


import * as BigNum from 'bn.js';

const SECRET_KEY = "e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801";
const PUBLIC_KEY = "02215340da140268f8a472af9c2b67952fe0a68337665482dae84886adea0945c1";
const STACKS_ADDRESS = "ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE";

test('Stacks public key and private keys', () => {
  let privKeyString = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc";
  let pubKeyString = "04ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab" 
    + "5b435d20ea91337cdd8c30dd7427bb098a5355e9c9bfad43797899b8137237cf"; 
  let pubKey = StacksPublicKey.fromPrivateKey(privKeyString);
  expect(pubKey.toString()).toBe(pubKeyString);

  let deserialized = serializeDeserialize(pubKey, StacksPublicKey);
  expect(deserialized.toString()).toBe(pubKeyString);

  let privKey = new StacksPrivateKey(privKeyString);
  expect(privKey.getPublicKey().toString()).toBe(pubKeyString);

  let randomKey = StacksPrivateKey.makeRandom();
  expect(randomKey.toString().length).toEqual(64);
});

test('ECDSA recoverable signature', () => {
  let privKeyString = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc";
  let messagetoSign = "eec72e6cd1ce0ac1dd1a0c260f099a8fc72498c80b3447f962fd5d39a3d70921";
  let correctSignature = "019901d8b1d67a7b853dc473d0609508ab2519ec370eabfef460aa0fd9234660" 
    + "787970968562da9de8b024a7f36f946b2fdcbf39b2f59247267a9d72730f19276b";
  let privKey = new StacksPrivateKey(privKeyString);
  let signature = privKey.sign(messagetoSign).toString();
  expect(signature).toBe(correctSignature);
});

test('Length prefixed strings serialization and deserialization', () => {
  let testString = 'test message string';
  let lpString = new LengthPrefixedString(testString);
  let deserialized = serializeDeserialize(lpString, LengthPrefixedString);
  expect(deserialized.content).toBe(testString);

  let longTestString = 'a'.repeat(129);
  let longString = new LengthPrefixedString(longTestString);

  expect(() => longString.serialize()).toThrow('String length exceeds maximum bytes 128');
});

test('Length prefixed list serialization and deserialization', () => {
  let addressList = [
    new Address('SP9YX31TK12T0EZKWP3GZXX8AM37JDQHAWM7VBTH'),
    new Address('SP26KJ60PHEBVMJ7DD515T3VEMM4XWJG7GMWSDFC2'),
    new Address('SP3ZZXBQXNA8296BV0D6W38FK3SK0XWM26EFT4M8C'),
    new Address('SP3E6KW7QVBBGBZDSNWWPX9672Z4MZPRRM2X68KKM'),
    new Address('SP15ZKFY43G0P3XBW95RHK82PYDT8B38QYFRY75EV')
  ];

  let lpList = new LengthPrefixedList<Address>();
  for (let index = 0; index < addressList.length; index++) {
    lpList.push(addressList[index]);
  }
  let serialized = lpList.serialize();
  
  let bufferReader = new BufferReader(serialized);
  let deserialized = LengthPrefixedList.deserialize(bufferReader, Address);

  expect(deserialized.length).toBe(addressList.length);

  for (let index = 0; index < addressList.length; index++) {
    expect(deserialized[index].toString()).toBe(addressList[index].toString());
  }
});

test('C32check addresses serialization and deserialization', () => {
  let c32AddressString = 'SP9YX31TK12T0EZKWP3GZXX8AM37JDQHAWM7VBTH';
  let address = new Address(c32AddressString);
  let deserialized = serializeDeserialize(address, Address);
  expect(deserialized.toString()).toBe(c32AddressString);
});

test('Asset info serialization and deserialization', () => {
  let assetAddress = "SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21";
  let assetContractName = "contract_name";
  let assetName = "asset_name";
  let assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);
  let deserialized = serializeDeserialize(assetInfo, AssetInfo);
  expect(deserialized.address.toString()).toBe(assetAddress);
  expect(deserialized.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetName.toString()).toBe(assetName);
});

test('STX token transfer payload serialization and deserialization', () => {
  let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let amount = new BigNum(2500000);

  let payload = new TokenTransferPayload(
    recipientAddress, 
    amount, 
    "memo (not being included)", 
  );

  let deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.recipientAddress!.toString()).toBe(recipientAddress);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
});

test('Contract call payload serialization and deserialization', () => {
  let contractAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let contractName = "contract_name";
  let functionName = "function_name";
  let args = [new TrueCV(), new FalseCV()];

  let payload = new ContractCallPayload(
    contractAddress, 
    contractName, 
    functionName,
    args
  );

  let deserialized = serializeDeserialize(payload, ContractCallPayload);
  expect(deserialized).toEqual(payload);
});

test('Smart contract payload serialization and deserialization', () => {
  let contractName = "contract_name";
  let codeBody = 
  "(define-map store ((key (buff 32))) ((value (buff 32))))" +
  "(define-public (get-value (key (buff 32)))" +
  "   (match (map-get? store ((key key)))" +
  "       entry (ok (get value entry))" +
  "       (err 0)))" +
  "(define-public (set-value (key (buff 32)) (value (buff 32)))" +
  "   (begin" +
  "       (map-set store ((key key)) ((value value)))" +
  "       (ok 'true)))";

  let payload = new SmartContractPayload( 
    contractName, 
    codeBody
  );

  let deserialized = serializeDeserialize(payload, SmartContractPayload);
  expect(deserialized.contractName!.toString()).toBe(contractName);
  expect(deserialized.codeBody!.toString()).toBe(codeBody);
});

test('Coinbase payload serialization and deserialization', () =>{
  let coinbaseBuffer = Buffer.alloc(COINBASE_BUFFER_LENGTH_BYTES, 0);
  coinbaseBuffer.write("coinbase buffer");

  let payload = new CoinbasePayload( 
    coinbaseBuffer
  );

  let deserialized = serializeDeserialize(payload, CoinbasePayload);
  expect(deserialized.coinbaseBuffer!.toString()).toBe(coinbaseBuffer.toString());
});

test('Post condition principal serialization and deserialization', () => {
  let standardPrincipalType = PrincipalType.Standard;
  let contractPrincipalType = PrincipalType.Contract;
  let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  let contractName = "principal-contract-name";

  let standardPrincipal = new StandardPrincipal(
    address
  );

  let standardDeserialized = serializeDeserialize(standardPrincipal, StandardPrincipal);
  expect(standardDeserialized.principalType).toBe(standardPrincipalType);
  expect(standardDeserialized.address.toString()).toBe(address);

  let contractPrincipal = new ContractPrincipal(
    address,
    contractName
  )

  let contractDeserialized = serializeDeserialize(contractPrincipal, ContractPrincipal);
  expect(contractDeserialized.principalType).toBe(contractPrincipalType);
  expect(contractDeserialized.address.toString()).toBe(address);
  expect(contractDeserialized.contractName.toString()).toBe(contractName);
});

test('STX post condition serialization and deserialization', () => {
  let postConditionType =  PostConditionType.STX;

  let standardPrincipalType = PrincipalType.Standard;
  let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  let standardPrincipal = new StandardPrincipal(
    address
  );
  
  let conditionCode = FungibleConditionCode.GreaterEqual;
  let amount = new BigNum(1000000);

  let postCondition = new STXPostCondition(
    standardPrincipal, 
    conditionCode, 
    amount
  );

  let deserialized = serializeDeserialize(postCondition, STXPostCondition);
  expect(deserialized.postConditionType).toBe(postConditionType);
  expect(deserialized.principal!.principalType).toBe(standardPrincipalType);
  expect(deserialized.principal!.address.toString()).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
});

test('Fungible post condition serialization and deserialization', () => {
  let postConditionType =  PostConditionType.Fungible;

  let standardPrincipalType = PrincipalType.Standard;
  let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  let standardPrincipal = new StandardPrincipal(address);
  
  let conditionCode = FungibleConditionCode.GreaterEqual;
  let amount = new BigNum(1000000);

  let assetAddress = "SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21";
  let assetContractName = "contract_name";
  let assetName = "asset_name";
  let assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);

  let postCondition = new FungiblePostCondition(
    standardPrincipal, 
    conditionCode, 
    amount, 
    assetInfo
  );

  let deserialized = serializeDeserialize(postCondition, FungiblePostCondition);
  expect(deserialized.postConditionType).toBe(postConditionType);
  expect(deserialized.principal!.principalType).toBe(standardPrincipalType);
  expect(deserialized.principal!.address.toString()).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
  expect(deserialized.assetInfo!.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo!.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo!.assetName.toString()).toBe(assetName);
});

test('Non-fungible post condition serialization and deserialization', () => {
  let postConditionType =  PostConditionType.NonFungible;

  let contractPrincipalType = PrincipalType.Contract;
  let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  let contractName = "contract-name";
  let contractPrincipal = new ContractPrincipal(
    address,
    contractName
  );
  
  let conditionCode = NonFungibleConditionCode.Owns;

  let assetAddress = "SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21";
  let assetContractName = "contract_name";
  let assetName = "asset_name";
  let assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);

  let nftAssetName = "nft_asset_name";

  let postCondition = new NonFungiblePostCondition(
    contractPrincipal, 
    conditionCode, 
    assetInfo,
    nftAssetName
  );

  let deserialized = serializeDeserialize(postCondition, NonFungiblePostCondition);
  expect(deserialized.postConditionType).toBe(postConditionType);
  expect(deserialized.principal!.principalType).toBe(contractPrincipalType);
  expect(deserialized.principal!.address.toString()).toBe(address);
  expect(deserialized.principal!.contractName.toString()).toBe(contractName);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount).toBe(undefined);
  expect(deserialized.assetInfo!.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo!.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo!.assetName.toString()).toBe(assetName);
  expect(deserialized.assetName!.toString()).toBe(nftAssetName);
});

test('Single spending condition serialization and deserialization', () => {
  let addressHashMode = AddressHashMode.SerializeP2PKH;
  let nonce = new BigNum(0);
  let feeRate = new BigNum(0);
  let pubKey = "03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab";
  let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
  let spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  let emptySignature = MessageSignature.empty();

  let deserialized = serializeDeserialize(spendingCondition, SingleSigSpendingCondition);
  expect(deserialized.addressHashMode).toBe(addressHashMode);
  expect(deserialized.nonce!.toNumber()).toBe(nonce.toNumber());
  expect(deserialized.feeRate!.toNumber()).toBe(feeRate.toNumber());
  expect(deserialized.signature.toString()).toBe(emptySignature.toString());
});

test('STX token transfer transaction serialization and deserialization', () => {

  let transactionVersion = TransactionVersion.Testnet;
  let chainId = DEFAULT_CHAIN_ID;

  let anchorMode = AnchorMode.Any;
  let postConditionMode = PostConditionMode.Deny;

  let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let amount = new BigNum(2500000);
  let memo = "memo (not included";

  let payload = new TokenTransferPayload(
    recipientAddress,
    amount,
    memo
  )

  let addressHashMode = AddressHashMode.SerializeP2PKH;
  let nonce = new BigNum(0);
  let feeRate = new BigNum(0);
  let pubKey = "03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab";
  let pubKeyHash = hash_p2pkh(pubKey);
  let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
  let spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  let authType = AuthType.Standard;
  let authorization = new StandardAuthorization(spendingCondition);

  let transaction = new StacksTransaction(
    transactionVersion,
    authorization,
    payload
  );

  let signer = new TransactionSigner(transaction);
  signer.signOrigin(new StacksPrivateKey(secretKey));
  let signature = '01051521ac2ac6e6123dcaf9dba000e0005d9855bcc1bc6b96aaf8b6a385238a2317' 
    + 'ab21e489aca47af3288cdaebd358b0458a9159cadc314cecb7dd08043c0a6d';

  let deserialized = serializeDeserialize(transaction, StacksTransaction);
  expect(deserialized.version).toBe(transactionVersion);
  expect(deserialized.chainId).toBe(chainId);
  expect(deserialized.auth!.authType).toBe(authType);
  expect(deserialized.auth!.spendingCondition!.addressHashMode).toBe(addressHashMode);
  expect(deserialized.auth!.spendingCondition!.nonce!.toNumber()).toBe(nonce.toNumber());
  expect(deserialized.auth!.spendingCondition!.feeRate!.toNumber()).toBe(feeRate.toNumber());
  expect(deserialized.anchorMode).toBe(anchorMode);
  expect(deserialized.postConditionMode).toBe(postConditionMode);
  expect(deserialized.postConditions.length).toBe(0);
  expect(deserialized.payload!.recipientAddress!.toString()).toBe(recipientAddress);
  expect(deserialized.payload!.amount!.toNumber()).toBe(amount.toNumber());
});

test('Make STX token transfer', () => {
  let recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  let amount = new BigNum(12345);
  let feeRate = new BigNum(0);
  let nonce = new BigNum(0);
  let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
  let memo = "test memo";

  let transaction = makeSTXTokenTransfer(
    recipientAddress,
    amount,
    feeRate,
    nonce,
    secretKey,
    TransactionVersion.Mainnet,
    memo
  );

  let serialized = transaction.serialize().toString('hex');

  let tx = '0000000000040015c31b8c1c11c515e244b75806bac48d1399c775000000000000000000000000000' 
    + '00000000004ae1e7a04089e596377ab4a0f74dfbae05c615a8223f1896df0f28fc334dc794f6faed38abdb' 
    + 'c611a0f1816738016afa25b4478e607b4d2a58c3d07925f8e040302000000000016df0ba3e79792be7be5e' 
    + '50a370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000' 
    + '0000000000000000000';

  expect(serialized).toBe(tx);
});

test('Make smart contract deploy', () => {
  let contractName = 'kv-store';
  let code = fs.readFileSync('./tests/src/contracts/kv-store.clar').toString();

  let feeRate = new BigNum(0);
  let nonce = new BigNum(0);

  let transaction = makeSmartContractDeploy(contractName, code, feeRate, nonce, SECRET_KEY, TransactionVersion.Testnet);

  let serialized = transaction.serialize().toString('hex');

  let tx = '80000000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000000073d449aa44ede1bc30c757ccf6cf6119f19567728be8a7d160c188c101e4ad79654f5f2345723c962f5a465ad0e22a4237c456da46194945ae553d366eee9c4b03020000000001086b762d73746f72650000015628646566696e652d6d61702073746f72652028286b657920286275666620333229292920282876616c7565202862756666203332292929290a0a28646566696e652d7075626c696320286765742d76616c756520286b65792028627566662033322929290a20202020286d6174636820286d61702d6765743f2073746f72652028286b6579206b65792929290a2020202020202020656e74727920286f6b20286765742076616c756520656e74727929290a20202020202020202865727220302929290a0a28646566696e652d7075626c696320287365742d76616c756520286b65792028627566662033322929202876616c75652028627566662033322929290a2020202028626567696e0a2020202020202020286d61702d7365742073746f72652028286b6579206b6579292920282876616c75652076616c75652929290a2020202020202020286f6b2027747275652929290a';

  expect(serialized).toBe(tx);
});

test('Make contract-call', () => {
  let contractName = 'kv-store';
  let functionName = 'get-value';
  let buffer = Buffer.from('foo');
  let bufferCV = new BufferCV(buffer);

  let feeRate = BigInt(0);
  let nonce = BigInt(1);

  let transaction = makeContractCall(
    STACKS_ADDRESS,
    contractName,
    functionName,
    [bufferCV],
    feeRate,
    nonce,
    SECRET_KEY,
    TransactionVersion.Testnet
  );

  let serialized = transaction.serialize().toString('hex');

  let tx = '80000000000400e6c05355e0c990ffad19a5e9bda394a9c50034290000000000000001000000000000000000000847ecd645be0141ccbfe7ec25ff9ef1a00cb133623327e351dfb9adb7e09e8f304b0925a3be18f5b1984b2d929f425e5849955abde10f1634501a4e31ba3586030200000000021ae6c05355e0c990ffad19a5e9bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});
