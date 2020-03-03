import {
  StacksTransaction
} from './transaction';

import {
  TokenTransferPayload
} from './payload';

import {
  SingleSigSpendingCondition,
  StandardAuthorization
} from './authorization';

import {
  StacksPrivateKey
} from './keys';

import {
  TransactionSigner
} from './signer';

import {
  TransactionVersion,
  AssetType,
  AddressHashMode,
} from './constants'

export function makeSTXTokenTransfer(
  recipientAddress: string,
  amount: BigInt,
  feeRate: BigInt,
  nonce: BigInt,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet,
  memo?: string,
): StacksTransaction {
  let assetType = AssetType.STX;

  let payload = new TokenTransferPayload(
    recipientAddress,
    amount,
    memo,
    assetType
  )

  let addressHashMode = AddressHashMode.SerializeP2PKH;
  let privKey = new StacksPrivateKey(senderKey);
  let pubKey = privKey.getPublicKey();
  let spendingCondition = new SingleSigSpendingCondition(
    addressHashMode, 
    pubKey.toString(), 
    nonce, 
    feeRate
  );
  let authorization = new StandardAuthorization(spendingCondition);

  let transaction = new StacksTransaction(
    version,
    authorization,
    payload
  );

  let signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}
