import {
  TokenTransferPayload,
  ContractCallPayload,
  SmartContractPayload,
  CoinbasePayload,
} from '../../src/payload';

import { serializeDeserialize } from './macros';

import { trueCV, falseCV } from '../../src/clarity';

import * as BigNum from 'bn.js';

import { COINBASE_BUFFER_LENGTH_BYTES } from '../../src/constants';

test('STX token transfer payload serialization and deserialization', () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(2500000);

  const payload = new TokenTransferPayload(recipientAddress, amount, 'memo (not being included)');

  const deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.recipientPrincipal!.address.toString()).toBe(recipientAddress);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
});

test('STX token transfer to contract payload serialization and deserialization', () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const recipientContractName = 'hello-world';
  const recipientPrincipal = `${recipientAddress}.${recipientContractName}`
  const amount = new BigNum(2500000);

  const payload = new TokenTransferPayload(recipientPrincipal, amount, 'memo (not being included)');

  const deserialized = serializeDeserialize(payload, TokenTransferPayload);
  expect(deserialized.payloadType).toBe(payload.payloadType);
  expect(deserialized.recipientPrincipal!.address.toString()).toBe(recipientAddress);
  expect(deserialized.recipientPrincipal!.contractName.toString()).toBe(recipientContractName);
  expect(deserialized.amount!.toNumber()).toBe(amount.toNumber());
});

test('Contract call payload serialization and deserialization', () => {
  const contractAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const contractName = 'contract_name';
  const functionName = 'function_name';
  const args = [trueCV(), falseCV()];

  const payload = new ContractCallPayload(contractAddress, contractName, functionName, args);

  const deserialized = serializeDeserialize(payload, ContractCallPayload);
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

  const payload = new SmartContractPayload(contractName, codeBody);

  const deserialized = serializeDeserialize(payload, SmartContractPayload);
  expect(deserialized.contractName!.toString()).toBe(contractName);
  expect(deserialized.codeBody!.toString()).toBe(codeBody);
});

test('Coinbase payload serialization and deserialization', () => {
  const coinbaseBuffer = Buffer.alloc(COINBASE_BUFFER_LENGTH_BYTES, 0);
  coinbaseBuffer.write('coinbase buffer');

  const payload = new CoinbasePayload(coinbaseBuffer);

  const deserialized = serializeDeserialize(payload, CoinbasePayload);
  expect(deserialized.coinbaseBuffer!.toString()).toBe(coinbaseBuffer.toString());
});
