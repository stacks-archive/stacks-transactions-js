import {
  STXPostCondition,
  FungiblePostCondition,
  NonFungiblePostCondition
} from '../../src/postcondition';

import {
  AssetInfo,
  StandardPrincipal,
  ContractPrincipal
} from '../../src/types';

import {
  PrincipalType,
  PostConditionType,
  FungibleConditionCode,
  NonFungibleConditionCode
} from '../../src/constants';

import { serializeDeserialize } from './macros';

import * as BigNum from 'bn.js';

test('Post condition principal serialization and deserialization', () => {
  const standardPrincipalType = PrincipalType.Standard;
  const contractPrincipalType = PrincipalType.Contract;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const contractName = 'principal-contract-name';

  const standardPrincipal = new StandardPrincipal(address);

  const standardDeserialized = serializeDeserialize(standardPrincipal, StandardPrincipal);
  expect(standardDeserialized.principalType).toBe(standardPrincipalType);
  expect(standardDeserialized.address.toString()).toBe(address);

  const contractPrincipal = new ContractPrincipal(address, contractName);

  const contractDeserialized = serializeDeserialize(contractPrincipal, ContractPrincipal);
  expect(contractDeserialized.principalType).toBe(contractPrincipalType);
  expect(contractDeserialized.address.toString()).toBe(address);
  expect(contractDeserialized.contractName.toString()).toBe(contractName);
});

test('STX post condition serialization and deserialization', () => {
  const postConditionType = PostConditionType.STX;

  const standardPrincipalType = PrincipalType.Standard;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const standardPrincipal = new StandardPrincipal(address);

  const conditionCode = FungibleConditionCode.GreaterEqual;
  const amount = new BigNum(1000000);

  const postCondition = new STXPostCondition(standardPrincipal, conditionCode, amount);

  const deserialized = serializeDeserialize(postCondition, STXPostCondition);
  expect(deserialized.postConditionType).toBe(postConditionType);
  expect(deserialized.principal!.principalType).toBe(standardPrincipalType);
  expect(deserialized.principal!.address.toString()).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
});

test('Fungible post condition serialization and deserialization', () => {
  const postConditionType = PostConditionType.Fungible;

  const standardPrincipalType = PrincipalType.Standard;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const standardPrincipal = new StandardPrincipal(address);

  const conditionCode = FungibleConditionCode.GreaterEqual;
  const amount = new BigNum(1000000);

  const assetAddress = 'SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21';
  const assetContractName = 'contract_name';
  const assetName = 'asset_name';
  const assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);

  const postCondition = new FungiblePostCondition(
    standardPrincipal,
    conditionCode,
    amount,
    assetInfo
  );

  const deserialized = serializeDeserialize(postCondition, FungiblePostCondition);
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
  const postConditionType = PostConditionType.NonFungible;

  const contractPrincipalType = PrincipalType.Contract;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const contractName = 'contract-name';
  const contractPrincipal = new ContractPrincipal(address, contractName);

  const conditionCode = NonFungibleConditionCode.Owns;

  const assetAddress = 'SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21';
  const assetContractName = 'contract_name';
  const assetName = 'asset_name';
  const assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);

  const nftAssetName = 'nft_asset_name';

  const postCondition = new NonFungiblePostCondition(
    contractPrincipal,
    conditionCode,
    assetInfo,
    nftAssetName
  );

  const deserialized = serializeDeserialize(postCondition, NonFungiblePostCondition);
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