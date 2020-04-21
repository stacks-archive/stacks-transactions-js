import {
  PostConditionType,
  FungibleConditionCode,
  NonFungibleConditionCode,
  StacksMessageType,
} from './constants';

import { BufferArray } from './utils';

import {
  AssetInfo,
  Principal,
  LengthPrefixedString,
  serializePrincipal,
  serializeAssetInfo,
  serializeLPString,
  deserializePrincipal,
  deserializeAssetInfo,
  deserializeLPString,
  createStandardPrincipal,
} from './types';

import * as BigNum from 'bn.js';
import { BufferReader } from './bufferReader';

export type PostCondition = STXPostCondition | FungiblePostCondition | NonFungiblePostCondition;

export interface STXPostCondition {
  readonly type: StacksMessageType.PostCondition;
  readonly conditionType: PostConditionType.STX;
  readonly principal: Principal;
  readonly conditionCode: FungibleConditionCode;
  readonly amount: BigNum;
}

export function createSTXPostCondition(
  principal: Principal,
  conditionCode: FungibleConditionCode,
  amount: BigNum
): STXPostCondition {
  return {
    type: StacksMessageType.PostCondition,
    conditionType: PostConditionType.STX,
    principal,
    conditionCode,
    amount,
  };
}

export interface FungiblePostCondition {
  readonly type: StacksMessageType.PostCondition;
  readonly conditionType: PostConditionType.Fungible;
  readonly principal: Principal;
  readonly conditionCode: FungibleConditionCode;
  readonly amount: BigNum;
  readonly assetInfo: AssetInfo;
}

export function createFungiblePostCondition(
  principal: Principal,
  conditionCode: FungibleConditionCode,
  amount: BigNum,
  assetInfo: AssetInfo
): FungiblePostCondition {
  return {
    type: StacksMessageType.PostCondition,
    conditionType: PostConditionType.Fungible,
    principal,
    conditionCode,
    amount,
    assetInfo,
  };
}

export interface NonFungiblePostCondition {
  readonly type: StacksMessageType.PostCondition;
  readonly conditionType: PostConditionType.NonFungible;
  readonly principal: Principal;
  readonly conditionCode: NonFungibleConditionCode;
  readonly assetInfo: AssetInfo;
  readonly assetName: LengthPrefixedString;
}

export function createNonFungiblePostCondition(
  principal: Principal,
  conditionCode: NonFungibleConditionCode,
  assetInfo: AssetInfo,
  assetName: LengthPrefixedString
): NonFungiblePostCondition {
  return {
    type: StacksMessageType.PostCondition,
    conditionType: PostConditionType.NonFungible,
    principal,
    conditionCode,
    assetInfo,
    assetName,
  };
}

export function serializePostCondition(postCondition: PostCondition): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendByte(postCondition.conditionType);
  bufferArray.push(serializePrincipal(postCondition.principal));

  if (
    postCondition.conditionType === PostConditionType.Fungible ||
    postCondition.conditionType === PostConditionType.NonFungible
  ) {
    bufferArray.push(serializeAssetInfo(postCondition.assetInfo));
  }

  if (postCondition.conditionType === PostConditionType.NonFungible) {
    bufferArray.push(serializeLPString(postCondition.assetName));
  }

  bufferArray.appendByte(postCondition.conditionCode);

  if (
    postCondition.conditionType === PostConditionType.STX ||
    postCondition.conditionType === PostConditionType.Fungible
  ) {
    bufferArray.push(postCondition.amount.toArrayLike(Buffer, 'be', 8));
  }

  return bufferArray.concatBuffer();
}

export function deserializePostCondition(bufferReader: BufferReader): PostCondition {
  const postConditionType = bufferReader.readUInt8Enum(PostConditionType, n => {
    throw new Error(`Could not read ${n} as PostConditionType`);
  });

  const principal = deserializePrincipal(bufferReader);

  let conditionCode;
  let assetInfo;
  let amount;
  switch (postConditionType) {
    case PostConditionType.STX:
      conditionCode = bufferReader.readUInt8Enum(FungibleConditionCode, n => {
        throw new Error(`Could not read ${n} as FungibleConditionCode`);
      });
      amount = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);
      return {
        type: StacksMessageType.PostCondition,
        conditionType: PostConditionType.STX,
        principal,
        conditionCode,
        amount,
      };
    case PostConditionType.Fungible:
      assetInfo = deserializeAssetInfo(bufferReader);
      conditionCode = bufferReader.readUInt8Enum(FungibleConditionCode, n => {
        throw new Error(`Could not read ${n} as FungibleConditionCode`);
      });
      amount = new BigNum(bufferReader.readBuffer(8).toString('hex'), 16);
      return {
        type: StacksMessageType.PostCondition,
        conditionType: PostConditionType.Fungible,
        principal,
        conditionCode,
        amount,
        assetInfo,
      };
    case PostConditionType.NonFungible:
      assetInfo = deserializeAssetInfo(bufferReader);
      const assetName = deserializeLPString(bufferReader);
      conditionCode = bufferReader.readUInt8Enum(NonFungibleConditionCode, n => {
        throw new Error(`Could not read ${n} as FungibleConditionCode`);
      });
      return {
        type: StacksMessageType.PostCondition,
        conditionType: PostConditionType.NonFungible,
        principal,
        conditionCode,
        assetInfo,
        assetName,
      };
  }
}
