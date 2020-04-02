import { StacksTransaction } from '../../src/transaction';

import { StandardAuthorization, SingleSigSpendingCondition } from '../../src/authorization';

import { TokenTransferPayload } from '../../src/payload';

import { STXPostCondition } from '../../src/postcondition';

import { StandardPrincipal } from '../../src/types';

import {
  COINBASE_BUFFER_LENGTH_BYTES,
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  AnchorMode,
  PostConditionMode,
  AuthType,
  FungibleConditionCode,
  AddressHashMode,
} from '../../src/constants';

import { hash_p2pkh } from '../../src/utils';

import { StacksPrivateKey } from '../../src/keys';

import { TransactionSigner } from '../../src/signer';

import { serializeDeserialize } from './macros';

import * as BigNum from 'bn.js';
import { c32addressDecode } from 'c32check';

test('STX token transfer transaction serialization and deserialization', () => {
  const transactionVersion = TransactionVersion.Testnet;
  const chainId = DEFAULT_CHAIN_ID;

  const anchorMode = AnchorMode.Any;
  const postConditionMode = PostConditionMode.Deny;

  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = new BigNum(2500000);
  const memo = 'memo (not included';

  const payload = new TokenTransferPayload(recipientAddress, amount, memo);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const nonce = new BigNum(0);
  const feeRate = new BigNum(0);
  const pubKey = '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab';
  const pubKeyHash = hash_p2pkh(pubKey);
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  const authType = AuthType.Standard;
  const authorization = new StandardAuthorization(spendingCondition);

  const postCondition = new STXPostCondition(
    new StandardPrincipal(recipientAddress),
    FungibleConditionCode.GreaterEqual,
    new BigNum(0)
  );

  const transaction = new StacksTransaction(transactionVersion, authorization, payload);

  transaction.addPostCondition(postCondition);

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(new StacksPrivateKey(secretKey));
  const signature =
    '01051521ac2ac6e6123dcaf9dba000e0005d9855bcc1bc6b96aaf8b6a385238a2317' +
    'ab21e489aca47af3288cdaebd358b0458a9159cadc314cecb7dd08043c0a6d';

  const deserialized = serializeDeserialize(transaction, StacksTransaction);
  expect(deserialized.version).toBe(transactionVersion);
  expect(deserialized.chainId).toBe(chainId);
  expect(deserialized.auth!.authType).toBe(authType);
  expect(deserialized.auth!.spendingCondition!.addressHashMode).toBe(addressHashMode);
  expect(deserialized.auth!.spendingCondition!.nonce!.toNumber()).toBe(nonce.toNumber());
  expect(deserialized.auth!.spendingCondition!.feeRate!.toNumber()).toBe(feeRate.toNumber());
  expect(deserialized.anchorMode).toBe(anchorMode);
  expect(deserialized.postConditionMode).toBe(postConditionMode);
  expect(deserialized.postConditions.length).toBe(1);
  expect(deserialized.postConditions[0].principal.address!.toString()).toBe(recipientAddress);
  expect(deserialized.postConditions[0].conditionCode).toBe(FungibleConditionCode.GreaterEqual);
  expect(deserialized.postConditions[0].amount.toNumber()).toBe(0);
  expect(deserialized.payload!.recipientAddress!.toString()).toBe(recipientAddress);
  expect(deserialized.payload!.amount!.toNumber()).toBe(amount.toNumber());
});
