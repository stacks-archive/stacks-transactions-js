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
  AssetType,
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
  serializeDeserialize
} from './macros';
import { TrueCV, FalseCV } from '../../src/clarity/clarityTypes';

test('Stacks public key and private keys', () => {
  let privKeyString = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc";
  let pubKeyString = "03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab"; 
  let pubKey = StacksPublicKey.fromPrivateKey(privKeyString);
  expect(pubKey.toString()).toBe(pubKeyString);

  let deserialized = serializeDeserialize(pubKey, StacksPublicKey);
  expect(deserialized.toString()).toBe(pubKeyString);

  let privKey = new StacksPrivateKey(privKeyString);
  expect(privKey.getPublicKey().toString()).toBe(pubKeyString);
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
  let amount = BigInt(2500000);
  let assetType = AssetType.STX;

  let payload = new TokenTransferPayload(
    recipientAddress, 
    amount, 
    "memo (not being included)", 
    assetType
  );

  let deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.assetType).toBe(assetType);
  expect(deserialized.recipientAddress.toString()).toBe(recipientAddress);
  expect(deserialized.amount).toBe(amount);
});

test('Fungible token transfer payload serialization and deserialization', () => {
  let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let amount = BigInt(2500000); 
  let assetType = AssetType.Fungible;
  let assetAddress = "SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21";
  let assetContractName = "contract_name";
  let assetName = "asset_name";
  let assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);

  let payload = new TokenTransferPayload(
    recipientAddress, 
    amount, 
    "memo (not being included)", 
    assetType, 
    assetInfo
  );

  let deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.assetType).toBe(assetType);
  expect(deserialized.assetInfo.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.toString()).toBe(assetName);
  expect(deserialized.recipientAddress.toString()).toBe(recipientAddress);
  expect(deserialized.amount).toBe(amount);
});

test('Non-fungible token transfer payload serialization and deserialization', () => {
  let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let amount = BigInt(2500000);
  let assetType = AssetType.NonFungible;
  let assetAddress = "SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21";
  let assetContractName = "contract_name";
  let assetName = "asset_name";
  let assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);
  let nftAssetName = "nft_asset_name";

  let payload = new TokenTransferPayload(
    recipientAddress, 
    amount, 
    "memo (not being included)", 
    assetType, 
    assetInfo,
    nftAssetName
  );

  let deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.assetType).toBe(assetType);
  expect(deserialized.assetInfo.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.toString()).toBe(assetName);
  expect(deserialized.assetName.toString()).toBe(nftAssetName);
  expect(deserialized.recipientAddress.toString()).toBe(recipientAddress);
  expect(deserialized.amount).toBe(amount);
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
  expect(deserialized.contractName.toString()).toBe(contractName);
  expect(deserialized.codeBody.toString()).toBe(codeBody);
});

test('Coinbase payload serialization and deserialization', () =>{
  let coinbaseBuffer = Buffer.alloc(COINBASE_BUFFER_LENGTH_BYTES, 0);
  coinbaseBuffer.write("coinbase buffer");

  let payload = new CoinbasePayload( 
    coinbaseBuffer
  );

  let deserialized = serializeDeserialize(payload, CoinbasePayload);
  expect(deserialized.coinbaseBuffer.toString()).toBe(coinbaseBuffer.toString());
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
  let amount = BigInt(1000000);

  let postCondition = new STXPostCondition(
    standardPrincipal, 
    conditionCode, 
    amount
  );

  let deserialized = serializeDeserialize(postCondition, STXPostCondition);
  expect(deserialized.postConditionType).toBe(postConditionType);
  expect(deserialized.principal.principalType).toBe(standardPrincipalType);
  expect(deserialized.principal.address.toString()).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount).toBe(amount);
});

test('Fungible post condition serialization and deserialization', () => {
  let postConditionType =  PostConditionType.Fungible;

  let standardPrincipalType = PrincipalType.Standard;
  let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  let standardPrincipal = new StandardPrincipal(address);
  
  let conditionCode = FungibleConditionCode.GreaterEqual;
  let amount = BigInt(1000000);

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
  expect(deserialized.principal.principalType).toBe(standardPrincipalType);
  expect(deserialized.principal.address.toString()).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount).toBe(amount);
  expect(deserialized.assetInfo.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.toString()).toBe(assetName);
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
  expect(deserialized.principal.principalType).toBe(contractPrincipalType);
  expect(deserialized.principal.address.toString()).toBe(address);
  expect(deserialized.principal.contractName.toString()).toBe(contractName);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount).toBe(undefined);
  expect(deserialized.assetInfo.address.toString()).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.toString()).toBe(assetName);
  expect(deserialized.assetName.toString()).toBe(nftAssetName);
});

test('Single spending condition serialization and deserialization', () => {
  let addressHashMode = AddressHashMode.SerializeP2PKH;
  let nonce = BigInt(0);
  let feeRate = BigInt(0);
  let pubKey = "03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab";
  let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
  let spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  let emptySignature = MessageSignature.empty();

  let deserialized = serializeDeserialize(spendingCondition, SingleSigSpendingCondition);
  expect(deserialized.addressHashMode).toBe(addressHashMode);
  expect(deserialized.nonce).toBe(nonce);
  expect(deserialized.feeRate).toBe(feeRate);
  expect(deserialized.signature.toString()).toBe(emptySignature.toString());
});

test('STX token transfer transaction serialization and deserialization', () => {

  let transactionVersion = TransactionVersion.Testnet;
  let chainId = DEFAULT_CHAIN_ID;

  let anchorMode = AnchorMode.Any;
  let postConditionMode = PostConditionMode.Deny;

  let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
  let amount = BigInt(2500000);
  let memo = "memo (not included";
  let assetType = AssetType.STX;

  let payload = new TokenTransferPayload(
    recipientAddress,
    amount,
    memo,
    assetType
  )

  let addressHashMode = AddressHashMode.SerializeP2PKH;
  let nonce = BigInt(0);
  let feeRate = BigInt(0);
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
  expect(deserialized.auth.authType).toBe(authType);
  expect(deserialized.auth.spendingCondition.addressHashMode).toBe(addressHashMode);
  expect(deserialized.auth.spendingCondition.nonce).toBe(nonce);
  expect(deserialized.auth.spendingCondition.feeRate).toBe(feeRate);
  expect(deserialized.anchorMode).toBe(anchorMode);
  expect(deserialized.postConditionMode).toBe(postConditionMode);
  expect(deserialized.postConditions.length).toBe(0);
  expect(deserialized.payload.recipientAddress.toString()).toBe(recipientAddress);
  expect(deserialized.payload.amount).toBe(amount);
  expect(deserialized.payload.assetType).toBe(assetType);
  
});

// test('STX token transfer transaction w/ fungible post condition serialization and deserialization',
//   () => {

//   let transactionVersion = TransactionVersion.Testnet;
//   let chainId = DEFAULT_CHAIN_ID;

//   let anchorMode = AnchorMode.Any;
//   let postConditionMode = PostConditionMode.Deny;

//   let recipientAddress = "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159";
//   let amount = BigInt(2500000);
//   let memo = "memo (not included";
//   let assetType = AssetType.STX;

//   let payload = new TokenTransferPayload(
//     recipientAddress,
//     amount,
//     memo,
//     assetType
//   )

//   let transaction = new StacksTransaction(
//     transactionVersion,
//     null, 
//     payload
//   );

//   let postConditionType =  PostConditionType.STX;
//   let standardPrincipalType = PrincipalType.Standard;
//   let address = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
//   let standardPrincipal = new StandardPrincipal(
//     address
//   );

//   let conditionCode = FungibleConditionCode.Less;
//   let postConditionAmount = BigInt(1000000);

//   let postCondition = new STXPostCondition(
//     standardPrincipal, 
//     conditionCode, 
//     postConditionAmount
//   );

//   let secondPostConditionType =  PostConditionType.STX;
//   let secondSPrincipalType = PrincipalType.Standard;
//   let secondPrincipal = new StandardPrincipal(
//     recipientAddress
//   );

//   let secondConditionCode = FungibleConditionCode.Less;
//   let secondPostConditionAmount = BigInt(1000000);

//   let secondPostCondition = new STXPostCondition(
//     secondPrincipal, 
//     secondConditionCode, 
//     secondPostConditionAmount
//   );

//   transaction.addPostCondition(postCondition);
//   transaction.addPostCondition(secondPostCondition);

//   let deserialized = serializeDeserialize(transaction, StacksTransaction);
//   t.equal(deserialized.version, transactionVersion, 'transaction version matches');
//   t.equal(deserialized.chainId, chainId, 'chain ID matches');

//   // TODO: authorization

//   t.equal(deserialized.anchorMode, anchorMode, 'anchor mode matches');
//   t.equal(deserialized.postConditionMode, postConditionMode, 'post condition mode matches');
//   t.equal(deserialized.postConditions.length, 2, 'has 2 post conditions');
//   t.equal(deserialized.postConditions[0].postConditionType, postConditionType, 
//     'first post condition type matches');
//   t.equal(deserialized.postConditions[0].principal.principalType, standardPrincipalType, 
//     'first post condition principal type matches');
//   t.equal(deserialized.postConditions[0].principal.address.toString(), address, 
//     'first post condition principal address matches');
//   t.equal(deserialized.postConditions[0].conditionCode, conditionCode, 
//     'first post condition code matches');
//   t.equal(deserialized.postConditions[0].amount, postConditionAmount, 
//     'first post condition amount matches');

//   t.equal(deserialized.postConditions[1].postConditionType, secondPostConditionType, 
//     'second post condition type matches');
//   t.equal(deserialized.postConditions[1].principal.principalType, secondSPrincipalType, 
//     'second post condition principal type matches');
//   t.equal(deserialized.postConditions[1].principal.address.toString(), recipientAddress, 
//     'second post condition principal address matches');
//   t.equal(deserialized.postConditions[1].conditionCode, secondConditionCode, 
//     'second post condition code matches');
//   t.equal(deserialized.postConditions[1].amount, secondPostConditionAmount, 
//     'second post condition amount matches');

      
//   t.equal(deserialized.payload.recipientAddress.toString(), recipientAddress, 'recipient address matches');
//   t.equal(deserialized.payload.amount, amount, 'amount matches');
//   t.equal(deserialized.payload.assetType, assetType, 'asset type matches');
  
// });
