import {
  TokenTransferPayload,
  ContractCallPayload,
  SmartContractPayload,
  CoinbasePayload,
  smartContractPayload,
  coinbasePayload,
  contractCallPayload,
  tokenTransferPayload,
} from '../../src/payload';

import { serializeDeserialize } from './macros';

import { trueCV, falseCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

import { COINBASE_BUFFER_LENGTH_BYTES, StacksMessageType } from '../../src/constants';
import { addressToString } from '../../src';

test('STX token transfer payload serialization and deserialization', () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(2500000);

  const payload = tokenTransferPayload(recipientAddress, amount, 'memo (not being included)');

  const deserialized = serializeDeserialize(
    payload,
    StacksMessageType.Payload
  ) as TokenTransferPayload;
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(addressToString(deserialized.recipientAddress)).toBe(recipientAddress);
  expect(deserialized.amount.toNumber()).toBe(amount.toNumber());
});

test('Contract call payload serialization and deserialization', () => {
  const contractAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const contractName = 'contract_name';
  const functionName = 'function_name';
  const args = [trueCV(), falseCV()];

  const payload = contractCallPayload(contractAddress, contractName, functionName, args);

  const deserialized = serializeDeserialize(
    payload,
    StacksMessageType.Payload
  ) as ContractCallPayload;
  expect(deserialized).toEqual(payload);
});

test('Smart contract payload serialization and deserialization', () => {
  const contractName = 'contract_name';
  const codeBody =
    '(define-map store ((key (buff 32))) ((value (buff 32))))' +
    '(define-public (get-value (key (buff 32)))' +
    '   (match (map-get? store ((key key)))' +
    '       entry (ok (get value entry))' +
    '       (err 0)))' +
    '(define-public (set-value (key (buff 32)) (value (buff 32)))' +
    '   (begin' +
    '       (map-set store ((key key)) ((value value)))' +
    "       (ok 'true)))";

  const payload = smartContractPayload(contractName, codeBody);

  const deserialized = serializeDeserialize(
    payload,
    StacksMessageType.Payload
  ) as SmartContractPayload;
  expect(deserialized.contractName.content).toBe(contractName);
  expect(deserialized.codeBody.content).toBe(codeBody);
});

test('Coinbase payload serialization and deserialization', () => {
  const coinbaseBuffer = Buffer.alloc(COINBASE_BUFFER_LENGTH_BYTES, 0);
  coinbaseBuffer.write('coinbase buffer');

  const payload = coinbasePayload(coinbaseBuffer);

  const deserialized = serializeDeserialize(payload, StacksMessageType.Payload) as CoinbasePayload;
  expect(deserialized.coinbaseBuffer.toString()).toBe(coinbaseBuffer.toString());
});
