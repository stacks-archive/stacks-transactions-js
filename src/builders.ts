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

/** 
 * Generates a Stacks token transfer transaction
 *
 * Returns a signed Stacks token transfer transaction.
 * 
 * @param  {String} recipientAddress - the c32check address of the recipient
 * @param  {BigInt} amount - number of tokens to transfer in microstacks
 * @param  {BigInt} feeRate - transaction fee rate in microstacks
 * @param  {BigInt} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 * @param  {String} memo - an arbitrary string to include with the transaction, must be less than
 *                          34 bytes
 *
 * @return {StacksTransaction}
 */
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

/** 
 * Generates a Clarity smart contract deploy transaction
 *
 * Returns a signed Stacks smart contract deploy transaction.
 * 
 * @param  {String} contractName - the contract name
 * @param  {String} codeBody - the code body string
 * @param  {BigInt} feeRate - transaction fee rate in microstacks
 * @param  {BigInt} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 *
 * @return {StacksTransaction}
 */
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

/** 
 * Generates a Clarity smart contract function call transaction
 *
 * Returns a signed Stacks smart contract deploy transaction.
 *
 * @param  {String} contractAddress - the c32check address of the contract
 * @param  {String} contractName - the contract name
 * @param  {String} functionName - name of the function to be called
 * @param  {[ClarityValue]} functionArgs - an array of Clarity values as arguments to the function call
 * @param  {BigInt} feeRate - transaction fee rate in microstacks
 * @param  {BigInt} nonce - a nonce must be increased monotonically with each new transaction
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
