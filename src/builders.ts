import { StacksTransaction } from './transaction';

import { TokenTransferPayload, SmartContractPayload, ContractCallPayload } from './payload';

import { SingleSigSpendingCondition, StandardAuthorization } from './authorization';

import { StacksPrivateKey } from './keys';

import { TransactionSigner } from './signer';

import { PostCondition, STXPostCondition, FungiblePostCondition, NonFungiblePostCondition } 
from './postcondition';

import { TransactionVersion, AddressHashMode, FungibleConditionCode, NonFungibleConditionCode } 
from './constants';

import { StandardPrincipal, ContractPrincipal, AssetInfo } from './types';

import { ClarityValue } from './clarity';

import * as BigNum from 'bn.js';

/**
 * STX token transfer transaction options
 *
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 * @param  {String} memo - an arbitrary string to include with the transaction, must be less than
 *                          34 bytes
 * @param  {Array<PostCondition>} postConditions - an array of post conditions to add to the 
 *                                                  transaction
 *
 * @return {StacksTransaction}
 */
export interface TokenTransferOptions {
  nonce?: BigNum,
  version?: TransactionVersion,
  memo?: string,
  postConditions?: Array<PostCondition>
}

/**
 * Generates a Stacks token transfer transaction
 *
 * Returns a signed Stacks token transfer transaction.
 *
 * @param  {String} recipientAddress - the c32check address of the recipient
 * @param  {BigNum} amount - number of tokens to transfer in microstacks
 * @param  {BigNum} feeRate - transaction fee rate in microstacks
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {TokenTransferOptions} options - an options object for the token transfer
 *
 * @return {StacksTransaction}
 */
export function makeSTXTokenTransfer(
  recipientAddress: string,
  amount: BigNum,
  feeRate: BigNum,
  senderKey: string,
  options?: TokenTransferOptions
): StacksTransaction {
  let defaultOptions = {
    nonce: new BigNum(0),
    version: TransactionVersion.Mainnet,
    memo: "",
  };

  let normalizedOptions = Object.assign(defaultOptions, options);

  const payload = new TokenTransferPayload(recipientAddress, amount, normalizedOptions.memo);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = new StacksPrivateKey(senderKey);
  const pubKey = privKey.getPublicKey();
  const spendingCondition = new SingleSigSpendingCondition(
    addressHashMode,
    pubKey.toString(),
    normalizedOptions.nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(normalizedOptions.version, authorization, payload);

  if (normalizedOptions.postConditions && normalizedOptions.postConditions.length > 0) {
    normalizedOptions.postConditions.forEach((postCondition) => {
      transaction.addPostCondition(postCondition);
    })
  }
  
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

/**
 * Contract deploy transaction options
 *
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 * @param  {Array<PostCondition>} postConditions - an array of post conditions to add to the 
 *                                                  transaction
 *
 * @return {StacksTransaction}
 */
export interface ContractDeployOptions {
  nonce?: BigNum,
  version?: TransactionVersion,
  postConditions?: Array<PostCondition>
}

/**
 * Generates a Clarity smart contract deploy transaction
 *
 * Returns a signed Stacks smart contract deploy transaction.
 *
 * @param  {String} contractName - the contract name
 * @param  {String} codeBody - the code body string
 * @param  {BigNum} feeRate - transaction fee rate in microstacks
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 *
 * @return {StacksTransaction}
 */
export function makeSmartContractDeploy(
  contractName: string,
  codeBody: string,
  feeRate: BigNum,
  senderKey: string,
  options?: ContractDeployOptions
): StacksTransaction {
  let defaultOptions = {
    nonce: new BigNum(0),
    version: TransactionVersion.Mainnet,
  };

  let normalizedOptions = Object.assign(defaultOptions, options);

  const payload = new SmartContractPayload(contractName, codeBody);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = new StacksPrivateKey(senderKey);
  const pubKey = privKey.getPublicKey();
  const spendingCondition = new SingleSigSpendingCondition(
    addressHashMode,
    pubKey.toString(),
    normalizedOptions.nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(normalizedOptions.version, authorization, payload);

  if (normalizedOptions.postConditions && normalizedOptions.postConditions.length > 0) {
    normalizedOptions.postConditions.forEach((postCondition) => {
      transaction.addPostCondition(postCondition);
    })
  }

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

/**
 * Contract function call transaction options
 *
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {TransactionVersion} version - can be set to mainnet or testnet
 * @param  {Array<PostCondition>} postConditions - an array of post conditions to add to the 
 *                                                  transaction
 *
 * @return {StacksTransaction}
 */
export interface ContractCallOptions {
  nonce?: BigNum,
  version?: TransactionVersion,
  postConditions?: Array<PostCondition>
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
  senderKey: string,
  options?: ContractCallOptions
): StacksTransaction {
  let defaultOptions = {
    nonce: new BigNum(0),
    version: TransactionVersion.Mainnet,
  };

  let normalizedOptions = Object.assign(defaultOptions, options);

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
    normalizedOptions.nonce,
    feeRate
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const transaction = new StacksTransaction(normalizedOptions.version, authorization, payload);

  if (normalizedOptions.postConditions && normalizedOptions.postConditions.length > 0) {
    normalizedOptions.postConditions.forEach((postCondition) => {
      transaction.addPostCondition(postCondition);
    })
  }

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKey);

  return transaction;
}

/**
 * Generates a STX post condition with a standard principal
 *
 * Returns a STX post condition object
 *
 * @param  {String} address - the c32check address
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {BigNum} amount - the amount of STX tokens
 *
 * @return {STXPostCondition}
 */
export function makeStandardSTXPostCondition(
  address: string,
  conditionCode: FungibleConditionCode,
  amount: BigNum
): STXPostCondition {
  return new STXPostCondition(
    new StandardPrincipal(address),
    conditionCode,
    amount
  );
}

/**
 * Generates a STX post condition with a contract principal
 *
 * Returns a STX post condition object
 *
 * @param  {String} address - the c32check address of the contract
 * @param  {String} contractName - the name of the contract
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {BigNum} amount - the amount of STX tokens
 *
 * @return {STXPostCondition}
 */
export function makeContractSTXPostCondition(
  address: string,
  contractName: string,
  conditionCode: FungibleConditionCode,
  amount: BigNum
): STXPostCondition {
  return new STXPostCondition(
    new ContractPrincipal(address, contractName),
    conditionCode,
    amount
  );
}

/**
 * Generates a fungible token post condition with a standard principal
 *
 * Returns a fungible token post condition object
 *
 * @param  {String} address - the c32check address
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {BigNum} amount - the amount of fungible tokens
 * @param  {AssetInfo} assetInfo - asset info describing the fungible token
 *
 * @return {FungiblePostCondition}
 */
export function makeStandardFungiblePostCondition(
  address: string,
  conditionCode: FungibleConditionCode,
  amount: BigNum,
  assetInfo: AssetInfo
): FungiblePostCondition {
  return new FungiblePostCondition(
    new StandardPrincipal(address),
    conditionCode,
    amount,
    assetInfo
  );
}

/**
 * Generates a fungible token post condition with a contract principal
 *
 * Returns a fungible token post condition object
 *
 * @param  {String} address - the c32check address
 * @param  {String} contractName - the name of the contract
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {BigNum} amount - the amount of fungible tokens
 * @param  {AssetInfo} assetInfo - asset info describing the fungible token
 *
 * @return {FungiblePostCondition}
 */
export function makeContractFungiblePostCondition(
  address: string,
  contractName: string,
  conditionCode: FungibleConditionCode,
  amount: BigNum,
  assetInfo: AssetInfo
): FungiblePostCondition {
  return new FungiblePostCondition(
    new ContractPrincipal(address, contractName),
    conditionCode,
    amount,
    assetInfo
  );
}

/**
 * Generates a non-fungible token post condition with a standard principal
 *
 * Returns a non-fungible token post condition object
 *
 * @param  {String} address - the c32check address
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {AssetInfo} assetInfo - asset info describing the non-fungible token
 *
 * @return {NonFungiblePostCondition}
 */
export function makeStandardNonFungiblePostCondition(
  address: string,
  conditionCode: NonFungibleConditionCode,
  assetInfo: AssetInfo
): NonFungiblePostCondition {
  return new NonFungiblePostCondition(
    new StandardPrincipal(address),
    conditionCode,
    assetInfo
  );
}

/**
 * Generates a non-fungible token post condition with a contract principal
 *
 * Returns a non-fungible token post condition object
 *
 * @param  {String} address - the c32check address
 * @param  {String} contractName - the name of the contract
 * @param  {FungibleConditionCode} conditionCode - the condition code
 * @param  {AssetInfo} assetInfo - asset info describing the non-fungible token
 *
 * @return {NonFungiblePostCondition}
 */
export function makeContractNonFungiblePostCondition(
  address: string,
  contractName: string,
  conditionCode: NonFungibleConditionCode,
  assetInfo: AssetInfo
): NonFungiblePostCondition {
  return new NonFungiblePostCondition(
    new ContractPrincipal(address, contractName),
    conditionCode,
    assetInfo
  );
}