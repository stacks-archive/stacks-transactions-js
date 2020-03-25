import { StacksTransaction } from './transaction';

import { TokenTransferPayload, SmartContractPayload, ContractCallPayload } from './payload';

import { SingleSigSpendingCondition, StandardAuthorization } from './authorization';

import { StacksPrivateKey } from './keys';

import { TransactionSigner } from './signer';

import { PostCondition, STXPostCondition } from './postcondition';

import { TransactionVersion, AddressHashMode, FungibleConditionCode, PrincipalType } 
from './constants';

import { Principal } from './types';

import { ClarityValue } from './clarity';

import * as BigNum from 'bn.js';

/**
 * Generates a Stacks token transfer transaction
 *
 * Returns a signed Stacks token transfer transaction.
 *
 * @param  {String} recipientAddress - the c32check address of the recipient
 * @param  {BigNum} amount - number of tokens to transfer in microstacks
 * @param  {BigNum} feeRate - transaction fee rate in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 * @param  {String} memo - an arbitrary string to include with the transaction, must be less than
 *                          34 bytes
 *
 * @return {StacksTransaction}
 */
export function makeSTXTokenTransfer(
  recipientAddress: string,
  amount: BigNum,
  feeRate: BigNum,
  nonce: BigNum,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet,
  memo?: string,
  postConditions?: Array<PostCondition>
): StacksTransaction {
  const payload = new TokenTransferPayload(recipientAddress, amount, memo);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = new StacksPrivateKey(senderKey);
  const pubKey = privKey.getPublicKey();
  const spendingCondition = new SingleSigSpendingCondition(
    addressHashMode,
    pubKey.toString(),
    nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(version, authorization, payload);

  if (postConditions && postConditions.length > 0) {
    postConditions.forEach((postCondition) => {
      transaction.addPostCondition(postCondition);
    })
  }
  
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

/**
 * Generates a Clarity smart contract deploy transaction
 *
 * Returns a signed Stacks smart contract deploy transaction.
 *
 * @param  {String} contractName - the contract name
 * @param  {String} codeBody - the code body string
 * @param  {BigNum} feeRate - transaction fee rate in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 *
 * @return {StacksTransaction}
 */
export function makeSmartContractDeploy(
  contractName: string,
  codeBody: string,
  feeRate: BigNum,
  nonce: BigNum,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet,
  postConditions?: Array<PostCondition>
): StacksTransaction {
  const payload = new SmartContractPayload(contractName, codeBody);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = new StacksPrivateKey(senderKey);
  const pubKey = privKey.getPublicKey();
  const spendingCondition = new SingleSigSpendingCondition(
    addressHashMode,
    pubKey.toString(),
    nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(version, authorization, payload);

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

/**
 * Generates a Clarity smart contract function call transaction
 *
 * Returns a signed Stacks smart contract deploy transaction.
 *
 * @param  {String} contractAddress - the c32check address of the contract
 * @param  {String} contractName - the contract name
 * @param  {String} functionName - name of the function to be called
 * @param  {[ClarityValue]} functionArgs - an array of Clarity values as arguments to the function call
 * @param  {BigNum} feeRate - transaction fee rate in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 *
 * @return {StacksTransaction}
 */
export function makeContractCall(
  contractAddress: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  feeRate: BigNum,
  nonce: BigNum,
  senderKey: string,
  version: TransactionVersion = TransactionVersion.Mainnet,
  postConditions?: Array<PostCondition>
): StacksTransaction {
  const payload = new ContractCallPayload(
    contractAddress,
    contractName,
    functionName,
    functionArgs
  );

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = new StacksPrivateKey(senderKey);
  const pubKey = privKey.getPublicKey();
  const spendingCondition = new SingleSigSpendingCondition(
    addressHashMode,
    pubKey.toString(),
    nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(version, authorization, payload);

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

export function makeSTXPostCondition(
  address: string,
  conditionCode: FungibleConditionCode,
  amount: BigNum
): STXPostCondition {
  return new STXPostCondition(
    new Principal(PrincipalType.Standard, address),
    conditionCode,
    amount
  )
}
