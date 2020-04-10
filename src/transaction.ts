import * as _ from 'lodash';

import {
  DEFAULT_CORE_NODE_API_URL,
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  PayloadType,
  AnchorMode,
  PostConditionMode,
  AuthType,
} from './constants';

import { Authorization, SpendingCondition } from './authorization';

import { BufferArray, BufferReader, txidFromData, fetchPrivate } from './utils';

import {
  Payload,
  TokenTransferPayload,
  ContractCallPayload,
  SmartContractPayload,
  PoisonPayload,
  CoinbasePayload,
} from './payload';

import { LengthPrefixedList } from './types';

import { StacksMessage } from './message';

import { PostCondition } from './postcondition';

import { StacksPrivateKey } from './keys';

export class StacksTransaction extends StacksMessage {
  version?: TransactionVersion;
  chainId?: string;
  auth?: Authorization;
  anchorMode?: AnchorMode;
  payload?:
    | TokenTransferPayload
    | ContractCallPayload
    | SmartContractPayload
    | PoisonPayload
    | CoinbasePayload;
  postConditionMode: PostConditionMode;
  postConditions: LengthPrefixedList<PostCondition>;

  constructor(
    version?: TransactionVersion,
    auth?: Authorization,
    payload?:
      | TokenTransferPayload
      | ContractCallPayload
      | SmartContractPayload
      | PoisonPayload
      | CoinbasePayload
  ) {
    super();
    this.version = version;
    this.auth = auth;
    this.payload = payload;
    this.chainId = DEFAULT_CHAIN_ID;
    this.postConditionMode = PostConditionMode.Deny;
    this.postConditions = new LengthPrefixedList<PostCondition>();

    if (payload !== undefined) {
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
        default: {
          throw new Error(`Unexpected transaction payload type: ${payload.payloadType}`);
        }
      }
    }
  }

  signBegin() {
    const tx = _.cloneDeep(this);
    if (tx.auth === undefined) {
      throw new Error('"auth" is undefined');
    }
    tx.auth = tx.auth.intoInitialSighashAuth();
    return tx.txid();
  }

  signNextOrigin(sigHash: string, privateKey: StacksPrivateKey): string {
    if (this.auth === undefined) {
      throw new Error('"auth" is undefined');
    }
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
    if (condition.feeRate === undefined) {
      throw new Error('"condition.feeRate" is undefined');
    }
    if (condition.nonce === undefined) {
      throw new Error('"condition.nonce" is undefined');
    }
    const { nextSig, nextSigHash } = SpendingCondition.nextSignature(
      curSigHash,
      authType,
      condition.feeRate,
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

  addPostCondition(postCondition: PostCondition) {
    this.postConditions.push(postCondition);
  }

  txid(): string {
    const serialized = this.serialize();
    return txidFromData(serialized);
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
    bufferArray.appendHexString(this.chainId);
    bufferArray.push(this.auth.serialize());
    bufferArray.appendByte(this.anchorMode);
    bufferArray.appendByte(this.postConditionMode);
    bufferArray.push(this.postConditions.serialize());
    bufferArray.push(this.payload.serialize());

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.version =
      bufferReader.readByte() === TransactionVersion.Mainnet
        ? TransactionVersion.Mainnet
        : TransactionVersion.Testnet;
    this.chainId = bufferReader.read(4).toString('hex');
    this.auth = Authorization.deserialize(bufferReader);
    this.anchorMode = bufferReader.readByte() as AnchorMode;
    this.postConditionMode = bufferReader.readByte() as PostConditionMode;
    this.postConditions = LengthPrefixedList.deserialize(bufferReader, PostCondition);
    this.payload = Payload.deserialize(bufferReader);
  }

  /**
   * Broadcast the signed transaction to a core node
   *
   * @param {String} apiURL - specify the core node URL to broadcast to
   *
   * @returns {Promise} that resolves to a response if the operation succeeds
   */
  broadcast(apiURL?: string) {
    const tx = this.serialize().toString('hex');

    const requestHeaders = {
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    };

    const options = {
      method: 'POST',
      headers: requestHeaders,
      body: tx,
    };

    const url = apiURL || DEFAULT_CORE_NODE_API_URL;

    return fetchPrivate(url, options).then(response => {
      if (response.ok) {
        return response.text();
        // return response.json();
      } else if (response.status === 400) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error('Remote endpoint error');
      }
    });
  }
}
