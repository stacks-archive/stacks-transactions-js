import { COINBASE_BUFFER_LENGTH_BYTES, PayloadType, AssetType, PrincipalType } from './constants';

import { BufferArray, BufferReader } from './utils';

import { Address, LengthPrefixedString, CodeBodyString, AssetInfo, MemoString, Principal } from './types';

import { StacksMessage } from './message';

import { ClarityValue, serializeCV, deserializeCV } from './clarity/';

import * as BigNum from 'bn.js';

export class Payload extends StacksMessage {
  payloadType?: PayloadType;

  assetType?: AssetType;
  assetInfo?: AssetInfo;
  assetName?: LengthPrefixedString;
  recipientPrincipal?: Principal;
  amount?: BigNum;
  memo?: MemoString;

  contractAddress?: Address;
  contractName?: LengthPrefixedString;
  functionName?: LengthPrefixedString;
  functionArgs?: ClarityValue[];

  codeBody?: CodeBodyString;

  coinbaseBuffer?: Buffer;

  serialize(): Buffer {
    const bufferArray: BufferArray = new BufferArray();

    if (this.payloadType === undefined) {
      throw new Error('"payloadType" is undefined');
    }
    bufferArray.appendByte(this.payloadType);

    switch (this.payloadType) {
      case PayloadType.TokenTransfer:
        if (this.recipientPrincipal === undefined) {
          throw new Error('"recipientAddress" is undefined');
        }
        if (this.recipientPrincipal.principalType === PrincipalType.Standard) {
          bufferArray.push(Buffer.from([0x05]));
          bufferArray.push(this.recipientPrincipal.address.serialize());
        } else if (this.recipientPrincipal.principalType === PrincipalType.Contract) {
          bufferArray.push(Buffer.from([0x06]));
          bufferArray.push(this.recipientPrincipal.address.serialize());
          bufferArray.push(this.recipientPrincipal.contractName.serialize());
        } else {
          throw new Error(
            `unsupported recipient principal type: ${this.recipientPrincipal.principalType}`
          );
        }
        // bufferArray.push(this.recipientAddress.serialize());
        if (this.amount === undefined) {
          throw new Error('"amount" is undefined');
        }
        bufferArray.push(this.amount.toArrayLike(Buffer, 'be', 8));
        if (this.memo === undefined) {
          throw new Error('"memo" is undefined');
        }
        bufferArray.push(this.memo.serialize());
        break;
      case PayloadType.ContractCall:
        if (this.contractAddress === undefined) {
          throw new Error('"contractAddress" is undefined');
        }
        if (this.contractName === undefined) {
          throw new Error('"contractName" is undefined');
        }
        if (this.functionName === undefined) {
          throw new Error('"functionName" is undefined');
        }
        if (this.functionArgs === undefined) {
          throw new Error('"functionArgs" is undefined');
        }
        bufferArray.push(this.contractAddress.serialize());
        bufferArray.push(this.contractName.serialize());
        bufferArray.push(this.functionName.serialize());
        const numArgs = Buffer.alloc(4);
        numArgs.writeUInt32BE(this.functionArgs.length, 0);
        bufferArray.push(numArgs);
        this.functionArgs.forEach(arg => {
          bufferArray.push(serializeCV(arg));
        });
        break;
      case PayloadType.SmartContract:
        if (this.contractName === undefined) {
          throw new Error('"contractName" is undefined');
        }
        if (this.codeBody === undefined) {
          throw new Error('"codeBody" is undefined');
        }
        bufferArray.push(this.contractName.serialize());
        bufferArray.push(this.codeBody.serialize());
        break;
      case PayloadType.PoisonMicroblock:
        // TODO: implement
        break;
      case PayloadType.Coinbase:
        if (this.coinbaseBuffer === undefined) {
          throw new Error('"coinbaseBuffer" is undefined');
        }
        if (this.coinbaseBuffer.byteLength != COINBASE_BUFFER_LENGTH_BYTES) {
          throw Error(`Coinbase buffer size must be ${COINBASE_BUFFER_LENGTH_BYTES} bytes`);
        }
        bufferArray.push(this.coinbaseBuffer);
        break;
      default:
        throw new Error(
          `Unexpected transaction payload type while serializing: ${this.payloadType}`
        );
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.payloadType = bufferReader.readByte() as PayloadType;
    switch (this.payloadType) {
      case PayloadType.TokenTransfer:
        const recipientPrincipalType = bufferReader.readByte();
        if (recipientPrincipalType === 0x05) {
          this.recipientPrincipal = new Principal(
            PrincipalType.Standard,
            Address.deserialize(bufferReader).toString()
          );
        } else if (recipientPrincipalType === 0x06) {
          this.recipientPrincipal = new Principal(
            PrincipalType.Contract,
            Address.deserialize(bufferReader).toString(),
            LengthPrefixedString.deserialize(bufferReader).content
          );
        } else {
          throw new Error(`Unexpected recipient principal type ${recipientPrincipalType}`);
        }
        this.amount = new BigNum(bufferReader.read(8).toString('hex'), 16);
        this.memo = LengthPrefixedString.deserialize(bufferReader);
        break;
      case PayloadType.ContractCall:
        this.contractAddress = Address.deserialize(bufferReader);
        this.contractName = LengthPrefixedString.deserialize(bufferReader);
        this.functionName = LengthPrefixedString.deserialize(bufferReader);
        this.functionArgs = [];
        const numberOfArgs = bufferReader.read(4).readUInt32BE(0);
        for (let i = 0; i < numberOfArgs; i++) {
          const clarityValue = deserializeCV(bufferReader);
          this.functionArgs.push(clarityValue);
        }
        break;
      case PayloadType.SmartContract:
        this.contractName = LengthPrefixedString.deserialize(bufferReader);
        this.codeBody = CodeBodyString.deserialize(bufferReader);
        break;
      case PayloadType.PoisonMicroblock:
        // TODO: implement
        break;
      case PayloadType.Coinbase:
        this.coinbaseBuffer = bufferReader.read(COINBASE_BUFFER_LENGTH_BYTES);
        break;
      default:
        throw new Error(
          `Unexpected transaction payload type while deserializing: ${this.payloadType}`
        );
    }
  }
}

export class TokenTransferPayload extends Payload {
  constructor(recipientPrincipal?: string, amount?: BigNum, memo?: string) {
    super();
    this.payloadType = PayloadType.TokenTransfer;
    if (recipientPrincipal) {
      if (recipientPrincipal.includes('.')) {
        const [address, contractName] = recipientPrincipal.split('.');
        this.recipientPrincipal = new Principal(PrincipalType.Contract, address, contractName);
      } else {
        this.recipientPrincipal = new Principal(PrincipalType.Standard, recipientPrincipal);
      }
    }
    this.amount = amount;
    this.memo = memo ? new MemoString(memo) : new MemoString('');
  }
}

export class ContractCallPayload extends Payload {
  constructor(
    contractAddress?: string,
    contractName?: string,
    functionName?: string,
    functionArgs?: ClarityValue[]
  ) {
    super();
    this.payloadType = PayloadType.ContractCall;
    this.contractAddress = new Address(contractAddress);
    this.contractName = new LengthPrefixedString(contractName);
    this.functionName = new LengthPrefixedString(functionName);
    this.functionArgs = functionArgs;
  }
}

export class SmartContractPayload extends Payload {
  constructor(contractName?: string, codeBody?: string) {
    super();
    this.payloadType = PayloadType.SmartContract;
    this.contractName = new LengthPrefixedString(contractName);
    this.codeBody = new CodeBodyString(codeBody); // code body max length?
  }
}

export class PoisonPayload extends Payload {
  constructor() {
    super();
    this.payloadType = PayloadType.PoisonMicroblock;
  }
}

export class CoinbasePayload extends Payload {
  constructor(coinbaseBuffer?: Buffer) {
    super();
    this.payloadType = PayloadType.Coinbase;
    this.coinbaseBuffer = coinbaseBuffer;
  }
}
