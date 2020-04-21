import { StacksTransaction, deserializeTransaction } from '../../src/transaction';

import { StandardAuthorization, SingleSigSpendingCondition } from '../../src/authorization';

import { TokenTransferPayload, createTokenTransferPayload } from '../../src/payload';

import { STXPostCondition, createSTXPostCondition } from '../../src/postcondition';

import { createLPList, createStandardPrincipal } from '../../src/types';

import {
  DEFAULT_CHAIN_ID,
  TransactionVersion,
  AnchorMode,
  PostConditionMode,
  AuthType,
  FungibleConditionCode,
  AddressHashMode,
} from '../../src/constants';

import { hash_p2pkh } from '../../src/utils';

import { createStacksPrivateKey } from '../../src/keys';

import { TransactionSigner } from '../../src/signer';

import * as BigNum from 'bn.js';
import { BufferReader } from '../../src/bufferReader';
import { standardPrincipalCV } from '../../src/clarity';

test('STX token transfer transaction serialization and deserialization', () => {
  const transactionVersion = TransactionVersion.Testnet;
  const chainId = DEFAULT_CHAIN_ID;

  const anchorMode = AnchorMode.Any;
  const postConditionMode = PostConditionMode.Deny;

  const address = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const recipient = createStandardPrincipal(address);
  const recipientCV = standardPrincipalCV(address);
  const amount = new BigNum(2500000);
  const memo = 'memo (not included';

  const payload = createTokenTransferPayload(recipientCV, amount, memo);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const nonce = new BigNum(0);
  const feeRate = new BigNum(0);
  const pubKey = '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab';
  const secretKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const spendingCondition = new SingleSigSpendingCondition(addressHashMode, pubKey, nonce, feeRate);
  const authType = AuthType.Standard;
  const authorization = new StandardAuthorization(spendingCondition);

  const postCondition = createSTXPostCondition(
    recipient,
    FungibleConditionCode.GreaterEqual,
    new BigNum(0)
  );

  const postConditions = createLPList([postCondition]);
  const transaction = new StacksTransaction(
    transactionVersion,
    authorization,
    payload,
    postConditions
  );

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(createStacksPrivateKey(secretKey));
  const signature =
    '01051521ac2ac6e6123dcaf9dba000e0005d9855bcc1bc6b96aaf8b6a385238a2317' +
    'ab21e489aca47af3288cdaebd358b0458a9159cadc314cecb7dd08043c0a6d';

  const serialized = transaction.serialize();
  const deserialized = deserializeTransaction(new BufferReader(serialized));
  expect(deserialized.version).toBe(transactionVersion);
  expect(deserialized.chainId).toBe(chainId);
  expect(deserialized.auth.authType).toBe(authType);
  expect(deserialized.auth.spendingCondition!.addressHashMode).toBe(addressHashMode);
  expect(deserialized.auth.spendingCondition!.nonce!.toNumber()).toBe(nonce.toNumber());
  expect(deserialized.auth.spendingCondition!.feeRate!.toNumber()).toBe(feeRate.toNumber());
  expect(deserialized.anchorMode).toBe(anchorMode);
  expect(deserialized.postConditionMode).toBe(postConditionMode);
  expect(deserialized.postConditions.values.length).toBe(1);

  const deserializedPostCondition = deserialized.postConditions.values[0] as STXPostCondition;
  expect(deserializedPostCondition.principal.address).toStrictEqual(recipient.address);
  expect(deserializedPostCondition.conditionCode).toBe(FungibleConditionCode.GreaterEqual);
  expect(deserializedPostCondition.amount.toNumber()).toBe(0);

  const deserializedPayload = deserialized.payload as TokenTransferPayload;
  expect(deserializedPayload.recipient).toEqual(recipientCV);
  expect(deserializedPayload.amount.toNumber()).toBe(amount.toNumber());
});
