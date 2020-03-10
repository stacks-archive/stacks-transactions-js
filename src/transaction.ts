import { 
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  PayloadType,
  AnchorMode,
  PostConditionMode,
  AuthType
} 
from './constants';

import {
  Authorization,
  SpendingCondition
} from './authorization';

import {
  BufferArray,
  BufferReader,
  txidFromData
} from './utils';

import {
  sha512_256
} from './vendor/js-sha512';

import {
  Payload,
  TokenTransferPayload,
  ContractCallPayload,
  SmartContractPayload,
  PoisonPayload,
  CoinbasePayload
} from './payload';

import {
  LengthPrefixedList
} from './types';

import {
  StacksMessage
} from './message';

import {
  PostCondition
} from './postcondition';

import {
  StacksPrivateKey
} from './keys';

export class StacksTransaction extends StacksMessage { 
  version: TransactionVersion;
  chainId: string;
  auth: Authorization;
  anchorMode: AnchorMode;
  payload: TokenTransferPayload | ContractCallPayload 
    | SmartContractPayload | PoisonPayload | CoinbasePayload;
  postConditionMode: PostConditionMode;
  postConditions: LengthPrefixedList<PostCondition>;

  constructor(
    version?: TransactionVersion, 
    auth?: Authorization, 
    payload?: TokenTransferPayload | ContractCallPayload 
    | SmartContractPayload | PoisonPayload | CoinbasePayload
  ) {
    super();
    this.version = version;
    this.auth = auth;
    this.payload = payload;
    this.chainId = DEFAULT_CHAIN_ID;
    this.postConditionMode = PostConditionMode.Deny;
    this.postConditions = new LengthPrefixedList<PostCondition>();

    if (payload) {
      switch (payload.payloadType) {
        case PayloadType.Coinbase: {
          this.anchorMode = AnchorMode.OnChainOnly;
          break;
        }
        case PayloadType.PoisonMicroblock: {
          this.anchorMode = AnchorMode.OnChainOnly;
          break;
        }
        default: {
          this.anchorMode = AnchorMode.Any;
          break;
        }
      }
    }
  }

  signBegin() {
    this.auth.intoInitialSighashAuth();
    return this.txid();
  }

  signSingleSigStandard(privateKey: String) {

  }

  signNextOrigin(sigHash: string, privateKey: StacksPrivateKey): string {
    return this.signAndAppend(
      this.auth.spendingCondition, 
      sigHash, 
      this.auth.authType, 
      privateKey
    );
  }

  signAndAppend(
    condition: SpendingCondition, 
    curSigHash: string, 
    authType: AuthType,
    privateKey: StacksPrivateKey
  ): string {
    let {nextSig, nextSigHash} = SpendingCondition.nextSignature(
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
    let serialized = this.serialize();
    return txidFromData(serialized);
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();

    bufferArray.appendHexString(this.version);
    bufferArray.appendHexString(this.chainId);
    bufferArray.push(this.auth.serialize());
    bufferArray.appendHexString(this.anchorMode);
    bufferArray.appendHexString(this.postConditionMode);
    bufferArray.push(this.postConditions.serialize());
    bufferArray.push(this.payload.serialize());

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.version = bufferReader.read(1).toString("hex") === TransactionVersion.Mainnet
      ? TransactionVersion.Mainnet : TransactionVersion.Testnet;
    this.chainId = bufferReader.read(4).toString("hex");
    this.auth = Authorization.deserialize(bufferReader);
    this.anchorMode = bufferReader.read(1).toString("hex") as AnchorMode;
    this.postConditionMode = bufferReader.read(1).toString("hex") as PostConditionMode;
    this.postConditions = LengthPrefixedList.deserialize(bufferReader, PostCondition);
    this.payload = Payload.deserialize(bufferReader);
  }

}


