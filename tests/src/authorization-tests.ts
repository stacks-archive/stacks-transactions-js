import {
  SpendingCondition,
  SingleSigSpendingCondition,
  MessageSignature,
} from '../../src/authorization';

import { Address } from '../../src/types';

import { AddressHashMode, AddressVersion, PubKeyEncoding } from '../../src/constants';

import { StacksPrivateKey } from '../../src/keys';

import { serializeDeserialize } from './macros';

import * as BigNum from 'bn.js';

test('ECDSA recoverable signature', () => {
  const privKeyString = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc';
  const messagetoSign = 'eec72e6cd1ce0ac1dd1a0c260f099a8fc72498c80b3447f962fd5d39a3d70921';
  const correctSignature =
    '019901d8b1d67a7b853dc473d0609508ab2519ec370eabfef460aa0fd9234660' +
    '787970968562da9de8b024a7f36f946b2fdcbf39b2f59247267a9d72730f19276b';
  const privKey = new StacksPrivateKey(privKeyString);
  const signature = privKey.sign(messagetoSign).toString();
  expect(signature).toBe(correctSignature);
});

test('Single spending condition serialization and deserialization', () => {
  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const nonce = new BigNum(0);
  const feeRate = new BigNum(0);
  const pubKey = '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab';
  const spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  const emptySignature = MessageSignature.empty();

  const deserialized = serializeDeserialize(spendingCondition, SingleSigSpendingCondition);
  expect(deserialized.addressHashMode).toBe(addressHashMode);
  expect(deserialized.nonce!.toNumber()).toBe(nonce.toNumber());
  expect(deserialized.feeRate!.toNumber()).toBe(feeRate.toNumber());
  expect(deserialized.signature.toString()).toBe(emptySignature.toString());
});

test('Single sig spending condition uncompressed', () => {
  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const nonce = new BigNum(123);
  const feeRate = new BigNum(456);
  const pubKey = '';
  const spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  spendingCondition.signerAddress = Address.fromData(
    AddressVersion.MainnetSingleSig,
    '11'.repeat(20)
  );
  spendingCondition.pubKeyEncoding = PubKeyEncoding.Uncompressed;

  const signature = new MessageSignature('ff'.repeat(65));
  spendingCondition.signature = signature;

  const serializedSpendingCondition = spendingCondition.serialize();

  // prettier-ignore
  const spendingConditionBytesHex = [
    // address hash mode
    AddressHashMode.SerializeP2PKH,
    // signer
    0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 
    0x11, 0x11, 0x11, 0x11, 0x11,
    // nonce
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7b,
    // fee rate
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc8,
    // key encoding,
    PubKeyEncoding.Uncompressed,
    // signature
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff
  ]
  const spendingConditionBytes = Buffer.from(spendingConditionBytesHex);

  expect(serializedSpendingCondition).toEqual(spendingConditionBytes);
});

test('Single sig wpkh spending condition compressed', () => {
  const addressHashMode = AddressHashMode.SerializeP2WPKH;
  const nonce = new BigNum(345);
  const feeRate = new BigNum(456);
  const pubKey = '';
  const spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  spendingCondition.signerAddress = Address.fromData(
    AddressVersion.MainnetSingleSig,
    '11'.repeat(20)
  );
  spendingCondition.pubKeyEncoding = PubKeyEncoding.Compressed;

  const signature = new MessageSignature('fe'.repeat(65));
  spendingCondition.signature = signature;

  const serializedSpendingCondition = spendingCondition.serialize();

  // prettier-ignore
  const spendingConditionBytesHex = [
    // address hash mode
    AddressHashMode.SerializeP2WPKH,
    // signer
    0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 
    0x11, 0x11, 0x11, 0x11, 0x11,
    // nonce
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x59,
    // fee rate
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc8,
    // key encoding
    PubKeyEncoding.Compressed,
    // signature
    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 
    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 
    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 
    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
    0xfe, 0xfe, 0xfe, 0xfe, 0xfe
  ];
  const spendingConditionBytes = Buffer.from(spendingConditionBytesHex);

  expect(serializedSpendingCondition).toEqual(spendingConditionBytes);
});
