import { 
  PostConditionType,
  FungibleConditionCode,
  NonFungibleConditionCode
} 
from './constants';

import {
  BufferArray,
  BufferReader,
  bigIntToHexString,
  hexStringToBigInt
} from './utils';

import {
  AssetInfo,
  Principal,
  LengthPrefixedString
} from './types';

import {
  StacksMessage
} from './message';

export class PostCondition extends StacksMessage {
  postConditionType?: PostConditionType;
  principal?: Principal;
  conditionCode?: FungibleConditionCode | NonFungibleConditionCode;
  assetInfo?: AssetInfo;
  assetName?: LengthPrefixedString;
  amount?: BigInt;

  constructor(
    postConditionType?: PostConditionType, 
    principal?: Principal, 
    conditionCode?: FungibleConditionCode | NonFungibleConditionCode,
    amount?: BigInt,
    assetInfo?: AssetInfo,
    assetName?: string
  ) {
    super();
    this.postConditionType = postConditionType;
    this.principal = principal;
    this.conditionCode = conditionCode;
    this.amount = amount;
    this.assetInfo = assetInfo;
    this.assetName = assetName != undefined ? new LengthPrefixedString(assetName) : undefined;
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    if (this.postConditionType === undefined) {
      throw new Error('"postConditionType" is undefined');
    }
    bufferArray.appendHexString(this.postConditionType);
    if (this.principal === undefined) {
      throw new Error('"principal" is undefined');
    }
    bufferArray.push(this.principal.serialize());
    
    if (this.postConditionType === PostConditionType.Fungible 
      || this.postConditionType === PostConditionType.NonFungible
    ) {
      if (this.assetInfo === undefined) {
        throw new Error('"assetInfo" is undefined');
      }
      bufferArray.push(this.assetInfo.serialize());
    }

    if (this.postConditionType === PostConditionType.NonFungible) {
      if (this.assetName === undefined) {
        throw new Error('"assetName" is undefined');
      }
      bufferArray.push(this.assetName.serialize());
    }

    if (this.conditionCode === undefined) {
      throw new Error('"conditionCode" is undefined');
    }
    bufferArray.appendHexString(this.conditionCode);

    if (this.postConditionType === PostConditionType.STX 
      || this.postConditionType === PostConditionType.Fungible
    ) {
      if (this.amount === undefined) {
        throw new Error('"amount" is undefined');
      }
      bufferArray.appendHexString(bigIntToHexString(this.amount));
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.postConditionType = bufferReader.read(1).toString("hex") as PostConditionType; 
    this.principal = Principal.deserialize(bufferReader);

    if (this.postConditionType === PostConditionType.Fungible 
      || this.postConditionType === PostConditionType.NonFungible
    ) {
      this.assetInfo = AssetInfo.deserialize(bufferReader);
    }

    if (this.postConditionType === PostConditionType.NonFungible) {
      this.assetName = LengthPrefixedString.deserialize(bufferReader);
    }

    this.conditionCode = bufferReader.read(1).toString("hex") as 
      (FungibleConditionCode | NonFungibleConditionCode);

    if (this.postConditionType === PostConditionType.STX 
      || this.postConditionType === PostConditionType.Fungible
    ) {
      this.amount = hexStringToBigInt(bufferReader.read(8).toString('hex'));
    }
  }
}

export class STXPostCondition extends PostCondition {
  constructor(
    principal?: Principal, 
    conditionCode?: FungibleConditionCode,
    amount?: BigInt
  ) {
    super(
      PostConditionType.STX, 
      principal, 
      conditionCode, 
      amount
    );
  }
}

export class FungiblePostCondition extends PostCondition {
  constructor(
    principal?: Principal, 
    conditionCode?: FungibleConditionCode,
    amount?: BigInt,
    assetInfo?: AssetInfo
  ) {
    super(
      PostConditionType.Fungible, 
      principal, 
      conditionCode, 
      amount, 
      assetInfo
    );
  }
}

export class NonFungiblePostCondition extends PostCondition {
  constructor(
    principal?: Principal, 
    conditionCode?: NonFungibleConditionCode,
    assetInfo?: AssetInfo,
    assetName?: string
  ) {
    super(
      PostConditionType.NonFungible, 
      principal, 
      conditionCode, 
      undefined, 
      assetInfo, 
      assetName
    );
  }
}