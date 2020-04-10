import { COINBASE_BUFFER_LENGTH_BYTES, PayloadType, StacksMessageType } from './constants';

import { BufferArray } from './utils';

import {
  Address,
  MemoString,
  address,
  memoString,
  LengthPrefixedString,
  lengthPrefixedString,
  serializeStacksMessage,
  deserializeAddress,
  deserializeLPString,
  deserializeMemoString,
  codeBodyString,
} from './types';

import { ClarityValue, serializeCV, deserializeCV } from './clarity/';

import * as BigNum from 'bn.js';
import { BufferReader } from './binaryReader';

export type Payload =
  | TokenTransferPayload
  | ContractCallPayload
  | SmartContractPayload
  | PoisonPayload
  | CoinbasePayload;

export interface TokenTransferPayload {
  readonly type: StacksMessageType.Payload;
  readonly payloadType: PayloadType.TokenTransfer;
  readonly recipientAddress: Address;
  readonly amount: BigNum;
  readonly memo: MemoString;
}

export function tokenTransferPayload(
  recipientAddress: string | Address,
  amount: BigNum,
  memo?: string | MemoString
): TokenTransferPayload {
  if (typeof recipientAddress === 'string') {
    recipientAddress = address(recipientAddress);
  }
  if (typeof memo === 'string') {
    memo = memoString(memo);
  }

  return {
    type: StacksMessageType.Payload,
    payloadType: PayloadType.TokenTransfer,
    recipientAddress,
    amount,
    memo: memo ? memo : memoString(''),
  };
}

export interface ContractCallPayload {
  readonly type: StacksMessageType.Payload;
  readonly payloadType: PayloadType.ContractCall;
  readonly contractAddress: Address;
  readonly contractName: LengthPrefixedString;
  readonly functionName: LengthPrefixedString;
  readonly functionArgs: ClarityValue[];
}

export function contractCallPayload(
  contractAddress: string | Address,
  contractName: string | LengthPrefixedString,
  functionName: string | LengthPrefixedString,
  functionArgs: ClarityValue[]
): ContractCallPayload {
  if (typeof contractAddress === 'string') {
    contractAddress = address(contractAddress);
  }
  if (typeof contractName === 'string') {
    contractName = lengthPrefixedString(contractName);
  }
  if (typeof functionName === 'string') {
    functionName = lengthPrefixedString(functionName);
  }

  return {
    type: StacksMessageType.Payload,
    payloadType: PayloadType.ContractCall,
    contractAddress,
    contractName,
    functionName,
    functionArgs: functionArgs,
  };
}

export interface SmartContractPayload {
  readonly type: StacksMessageType.Payload;
  readonly payloadType: PayloadType.SmartContract;
  readonly contractName: LengthPrefixedString;
  readonly codeBody: LengthPrefixedString;
}

export function smartContractPayload(
  contractName: string | LengthPrefixedString,
  codeBody: string | LengthPrefixedString
): SmartContractPayload {
  if (typeof contractName === 'string') {
    contractName = lengthPrefixedString(contractName);
  }
  if (typeof codeBody === 'string') {
    codeBody = codeBodyString(codeBody);
  }

  return {
    type: StacksMessageType.Payload,
    payloadType: PayloadType.SmartContract,
    contractName,
    codeBody,
  };
}

export interface PoisonPayload {
  readonly type: StacksMessageType.Payload;
  readonly payloadType: PayloadType.PoisonMicroblock;
}

export function poisonPayload(): PoisonPayload {
  return { type: StacksMessageType.Payload, payloadType: PayloadType.PoisonMicroblock };
}

export interface CoinbasePayload {
  readonly type: StacksMessageType.Payload;
  readonly payloadType: PayloadType.Coinbase;
  readonly coinbaseBuffer: Buffer;
}

export function coinbasePayload(coinbaseBuffer: Buffer): CoinbasePayload {
  if (coinbaseBuffer.byteLength != COINBASE_BUFFER_LENGTH_BYTES) {
    throw Error(`Coinbase buffer size must be ${COINBASE_BUFFER_LENGTH_BYTES} bytes`);
  }
  return { type: StacksMessageType.Payload, payloadType: PayloadType.Coinbase, coinbaseBuffer };
}

export function serializePayload(payload: Payload): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.appendByte(payload.payloadType);

  switch (payload.payloadType) {
    case PayloadType.TokenTransfer:
      bufferArray.push(serializeStacksMessage(payload.recipientAddress));
      bufferArray.push(payload.amount.toArrayLike(Buffer, 'be', 8));
      bufferArray.push(serializeStacksMessage(payload.memo));
      break;
    case PayloadType.ContractCall:
      bufferArray.push(serializeStacksMessage(payload.contractAddress));
      bufferArray.push(serializeStacksMessage(payload.contractName));
      bufferArray.push(serializeStacksMessage(payload.functionName));
      const numArgs = Buffer.alloc(4);
      numArgs.writeUInt32BE(payload.functionArgs.length, 0);
      bufferArray.push(numArgs);
      payload.functionArgs.forEach(arg => {
        bufferArray.push(serializeCV(arg));
      });
      break;
    case PayloadType.SmartContract:
      bufferArray.push(serializeStacksMessage(payload.contractName));
      bufferArray.push(serializeStacksMessage(payload.codeBody));
      break;
    case PayloadType.PoisonMicroblock:
      // TODO: implement
      break;
    case PayloadType.Coinbase:
      bufferArray.push(payload.coinbaseBuffer);
      break;
  }

  return bufferArray.concatBuffer();
}

export function deserializePayload(bufferReader: BufferReader): Payload {
  const payloadType = bufferReader.readUInt8Enum(PayloadType, n => {
    throw new Error(`Cannot recognize PayloadType: ${n}`);
  });

  switch (payloadType) {
    case PayloadType.TokenTransfer:
      const recipientAddress = deserializeAddress(bufferReader);
      const amount = new BigNum(bufferReader.readBuffer(8));
      const memo = deserializeMemoString(bufferReader);
      return tokenTransferPayload(recipientAddress, amount, memo);
    case PayloadType.ContractCall:
      const contractAddress = deserializeAddress(bufferReader);
      const contractCallName = deserializeLPString(bufferReader);
      const functionName = deserializeLPString(bufferReader);
      const functionArgs = [];
      const numberOfArgs = bufferReader.readUInt32BE();
      for (let i = 0; i < numberOfArgs; i++) {
        const clarityValue = deserializeCV(bufferReader);
        functionArgs.push(clarityValue);
      }
      return contractCallPayload(contractAddress, contractCallName, functionName, functionArgs);
    case PayloadType.SmartContract:
      const smartContractName = deserializeLPString(bufferReader);
      const codeBody = deserializeLPString(bufferReader, 4, 100000);
      return smartContractPayload(smartContractName, codeBody);
    case PayloadType.PoisonMicroblock:
      // TODO: implement
      return poisonPayload();
    case PayloadType.Coinbase:
      const coinbaseBuffer = bufferReader.readBuffer(COINBASE_BUFFER_LENGTH_BYTES);
      return coinbasePayload(coinbaseBuffer);
  }
}
