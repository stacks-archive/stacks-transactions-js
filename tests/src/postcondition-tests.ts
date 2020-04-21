import {
  STXPostCondition,
  FungiblePostCondition,
  NonFungiblePostCondition,
  createSTXPostCondition,
  createFungiblePostCondition,
  createNonFungiblePostCondition,
} from '../../src/postcondition';

import {
  StandardPrincipal,
  ContractPrincipal,
  createStandardPrincipal,
  addressToString,
  createContractPrincipal,
  createAssetInfo,
  createLPString,
} from '../../src/types';

import {
  PrincipalType,
  PostConditionType,
  FungibleConditionCode,
  NonFungibleConditionCode,
  StacksMessageType,
} from '../../src/constants';

import { serializeDeserialize } from './macros';

import * as BigNum from 'bn.js';

test('Post condition principal serialization and deserialization', () => {
  const standardPrincipalPrefix = PrincipalType.Standard;
  const contractPrincipalPrefix = PrincipalType.Contract;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const contractName = 'principal-contract-name';

  const sp = createStandardPrincipal(address);

  const standardDeserialized = serializeDeserialize(
    sp,
    StacksMessageType.Principal
  ) as StandardPrincipal;
  expect(standardDeserialized.prefix).toBe(standardPrincipalPrefix);
  expect(addressToString(standardDeserialized.address)).toBe(address);

  const cp = createContractPrincipal(address, contractName);

  const contractDeserialized = serializeDeserialize(
    cp,
    StacksMessageType.Principal
  ) as ContractPrincipal;
  expect(contractDeserialized.prefix).toBe(contractPrincipalPrefix);
  expect(addressToString(contractDeserialized.address)).toBe(address);
  expect(contractDeserialized.contractName.content).toBe(contractName);
});

test('STX post condition serialization and deserialization', () => {
  const postConditionType = PostConditionType.STX;

  const standardPrincipalType = PrincipalType.Standard;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const sp = createStandardPrincipal(address);

  const conditionCode = FungibleConditionCode.GreaterEqual;
  const amount = new BigNum(1000000);

  const postCondition = createSTXPostCondition(sp, conditionCode, amount);

  const deserialized = serializeDeserialize(
    postCondition,
    StacksMessageType.PostCondition
  ) as STXPostCondition;
  expect(deserialized.conditionType).toBe(postConditionType);
  expect(deserialized.principal.prefix).toBe(standardPrincipalType);
  expect(addressToString(deserialized.principal.address)).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount.toNumber()).toBe(amount.toNumber());
});

test('Fungible post condition serialization and deserialization', () => {
  const postConditionType = PostConditionType.Fungible;

  const standardPrincipalType = PrincipalType.Standard;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const principal = createStandardPrincipal(address);

  const conditionCode = FungibleConditionCode.GreaterEqual;
  const amount = new BigNum(1000000);

  const assetAddress = 'SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21';
  const assetContractName = 'contract_name';
  const assetName = 'asset_name';
  const info = createAssetInfo(assetAddress, assetContractName, assetName);

  const postCondition = createFungiblePostCondition(principal, conditionCode, amount, info);

  const deserialized = serializeDeserialize(
    postCondition,
    StacksMessageType.PostCondition
  ) as FungiblePostCondition;
  expect(deserialized.conditionType).toBe(postConditionType);
  expect(deserialized.principal.prefix).toBe(standardPrincipalType);
  expect(addressToString(deserialized.principal.address)).toBe(address);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(deserialized.amount.toNumber()).toBe(amount.toNumber());
  expect(addressToString(deserialized.assetInfo.address)).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.content).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.content).toBe(assetName);
});

test('Non-fungible post condition serialization and deserialization', () => {
  const postConditionType = PostConditionType.NonFungible;

  const contractPrincipalType = PrincipalType.Contract;
  const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
  const contractName = 'contract-name';
  const principal = createContractPrincipal(address, contractName);

  const conditionCode = NonFungibleConditionCode.Owns;

  const assetAddress = 'SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21';
  const assetContractName = 'contract_name';
  const assetName = 'asset_name';
  const info = createAssetInfo(assetAddress, assetContractName, assetName);

  const nftAssetName = createLPString('nft_asset_name');

  const postCondition = createNonFungiblePostCondition(
    principal,
    conditionCode,
    info,
    nftAssetName
  );

  const deserialized = serializeDeserialize(
    postCondition,
    StacksMessageType.PostCondition
  ) as NonFungiblePostCondition;
  expect(deserialized.conditionType).toBe(postConditionType);
  expect(deserialized.principal.prefix).toBe(contractPrincipalType);
  expect(addressToString(deserialized.principal.address)).toBe(address);
  expect((deserialized.principal as ContractPrincipal).contractName.content).toBe(contractName);
  expect(deserialized.conditionCode).toBe(conditionCode);
  expect(addressToString(deserialized.assetInfo.address)).toBe(assetAddress);
  expect(deserialized.assetInfo.contractName.content).toBe(assetContractName);
  expect(deserialized.assetInfo.assetName.content).toBe(assetName);
  expect(deserialized.assetName).toEqual(nftAssetName);
});
