import * as _ from 'lodash';

import {
  DEFAULT_CORE_NODE_API_URL,
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  PayloadType,
  AnchorMode,
  PostConditionMode,
  AuthType,
  StacksMessageType,
  ChainID,
} from './constants';

import { Authorization, SpendingCondition } from './authorization';

import { BufferArray, txidFromData, sha512_256, fetchPrivate } from './utils';

import { Payload, serializePayload, deserializePayload } from './payload';

import { LengthPrefixedList, serializeLPList, deserializeLPList, createLPList } from './types';

import { StacksPrivateKey } from './keys';

import { BufferReader } from './bufferReader';

import * as BigNum from 'bn.js';

export class StacksTransaction {
  version: TransactionVersion;
  chainId: ChainID;
  auth: Authorization;
  anchorMode: AnchorMode;
  payload: Payload;
  postConditionMode: PostConditionMode;
  postConditions: LengthPrefixedList;

  constructor(
    version: TransactionVersion,
    auth: Authorization,
    payload: Payload,
    postConditions?: LengthPrefixedList,
    postConditionMode?: PostConditionMode,
    anchorMode?: AnchorMode,
    chainId?: ChainID
  ) {
    this.version = version;
    this.auth = auth;
    this.payload = payload;
    this.chainId = chainId ?? DEFAULT_CHAIN_ID;
    this.postConditionMode = postConditionMode ?? PostConditionMode.Deny;
    this.postConditions = postConditions ?? createLPList([]);

    if (anchorMode) {
      this.anchorMode = anchorMode;
    } else {
      switch (payload.payloadType) {
        case PayloadType.Coinbase:
        case PayloadType.PoisonMicroblock: {
          this.anchorMode = AnchorMode.OnChainOnly;
          break;
        }
        case PayloadType.ContractCall:
        case PayloadType.SmartContract:
        case PayloadType.TokenTransfer: {
          this.anchorMode = AnchorMode.Any;
          break;
        }
      }
    }
  }

  signBegin() {
    const tx = _.cloneDeep(this);
    tx.auth = tx.auth.intoInitialSighashAuth();
    return tx.txid();
  }

  signNextOrigin(sigHash: string, privateKey: StacksPrivateKey): string {
    if (this.auth.spendingCondition === undefined) {
      throw new Error('"auth.spendingCondition" is undefined');
    }
    if (this.auth.authType === undefined) {
      throw new Error('"auth.authType" is undefined');
    }
    return this.signAndAppend(this.auth.spendingCondition, sigHash, this.auth.authType, privateKey);
  }

  signAndAppend(
    condition: SpendingCondition,
    curSigHash: string,
    authType: AuthType,
    privateKey: StacksPrivateKey
  ): string {
    if (condition.fee === undefined) {
      throw new Error('"condition.fee" is undefined');
    }
    if (condition.nonce === undefined) {
      throw new Error('"condition.nonce" is undefined');
    }
    const { nextSig, nextSigHash } = SpendingCondition.nextSignature(
      curSigHash,
      authType,
      condition.fee,
      condition.nonce,
      privateKey
    );
    if (condition.singleSig()) {
      condition.signature = nextSig;
    } else {
      // condition.pushSignature();
    }

    return nextSigHash;
  }

  txid(): string {
    const serialized = this.serialize();
    return txidFromData(serialized);
  }

  /**
   * Set the total fee to be paid for this transaction
   *
   * @param {BigNum} fee - the fee amount in microstacks
   */
  setFee(amount: BigNum) {
    this.auth.setFee(amount);
  }

  /**
   * Set the transaction nonce
   *
   * @param {BigNum} nonce - the nonce value
   */
  setNonce(nonce: BigNum) {
    this.auth.setNonce(nonce);
  }

  serialize(): Buffer {
    if (this.version === undefined) {
      throw new Error('"version" is undefined');
    }
    if (this.chainId === undefined) {
      throw new Error('"chainId" is undefined');
    }
    if (this.auth === undefined) {
      throw new Error('"auth" is undefined');
    }
    if (this.anchorMode === undefined) {
      throw new Error('"anchorMode" is undefined');
    }
    if (this.payload === undefined) {
      throw new Error('"payload" is undefined');
    }

    const bufferArray: BufferArray = new BufferArray();

    bufferArray.appendByte(this.version);
    const chainIdBuffer = Buffer.alloc(4);
    chainIdBuffer.writeUInt32BE(this.chainId, 0);
    bufferArray.push(chainIdBuffer);
    bufferArray.push(this.auth.serialize());
    bufferArray.appendByte(this.anchorMode);
    bufferArray.appendByte(this.postConditionMode);
    bufferArray.push(serializeLPList(this.postConditions));
    bufferArray.push(serializePayload(this.payload));

    return bufferArray.concatBuffer();
  }
}

export function deserializeTransaction(bufferReader: BufferReader) {
  const version = bufferReader.readUInt8Enum(TransactionVersion, n => {
    throw new Error(`Could not parse ${n} as TransactionVersion`);
  });
  const chainId = bufferReader.readUInt32BE();
  const auth = Authorization.deserialize(bufferReader);
  const anchorMode = bufferReader.readUInt8Enum(AnchorMode, n => {
    throw new Error(`Could not parse ${n} as AnchorMode`);
  });
  const postConditionMode = bufferReader.readUInt8Enum(PostConditionMode, n => {
    throw new Error(`Could not parse ${n} as PostConditionMode`);
  });
  const postConditions = deserializeLPList(bufferReader, StacksMessageType.PostCondition);
  const payload = deserializePayload(bufferReader);

  return new StacksTransaction(
    version,
    auth,
    payload,
    postConditions,
    postConditionMode,
    anchorMode,
    chainId
  );
}
