import {
  StacksTransaction
} from './transaction';

import {
  TokenTransferPayload,
  SmartContractPayload,
  ContractCallPayload
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
  AddressHashMode,
} from './constants'

import {
  ClarityValue
} from './clarity/clarityTypes';

export function makeSTXTokenTransfer(
  recipientAddress: string,
  amount: BigInt,
  feeRate: BigInt,
  nonce: BigInt,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet,
  memo?: string,
): StacksTransaction {
  let payload = new TokenTransferPayload(
    recipientAddress,
    amount,
    memo
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

export function makeSmartContractDeploy(
  contractName: string,
  codeBody: string,
  feeRate: BigInt,
  nonce: BigInt,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet
): StacksTransaction {
  let payload = new SmartContractPayload(
    contractName,
    codeBody
  );

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

export function makeContractCall(
  contractAddress: string, 
  contractName: string, 
  functionName: string, 
  functionArgs: ClarityValue[],
  feeRate: BigInt,
  nonce: BigInt,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet
): StacksTransaction {
  let payload = new ContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

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
