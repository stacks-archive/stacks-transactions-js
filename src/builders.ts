import { StacksTransaction } from './transaction';

import { StacksNetwork, StacksMainnet } from './network';

import {
  createTokenTransferPayload,
  createSmartContractPayload,
  createContractCallPayload,
} from './payload';

import { StandardAuthorization, createSingleSigSpendingCondition } from './authorization';

import {
  publicKeyToString,
  createStacksPrivateKey,
  getPublicKey,
  publicKeyToAddress,
} from './keys';

import { TransactionSigner } from './signer';

import {
  PostCondition,
  STXPostCondition,
  FungiblePostCondition,
  NonFungiblePostCondition,
  createSTXPostCondition,
  createFungiblePostCondition,
  createNonFungiblePostCondition,
} from './postcondition';

import {
  AddressHashMode,
  AddressVersion,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  PayloadType,
  AnchorMode,
  TransactionVersion,
  TxRejectedReason,
} from './constants';

import { AssetInfo, createLPList, createStandardPrincipal, createContractPrincipal } from './types';

import { fetchPrivate, cvToHex, parseReadOnlyResponse } from './utils';

import * as BigNum from 'bn.js';
import { ClarityValue, PrincipalCV } from './clarity';
import { validateContractCall, ClarityAbi } from './contract-abi';

/**
 * Lookup the nonce for an address from a core node
 *
 * @param {string} address - the c32check address to look up
 * @param {StacksNetwork} network - the Stacks network to look up address on
 *
 * @return a promise that resolves to an integer
 */
export function getNonce(address: string, network?: StacksNetwork): Promise<BigNum> {
  const defaultNetwork = new StacksMainnet();
  const url = network
    ? network.getAccountApiUrl(address)
    : defaultNetwork.getAccountApiUrl(address);

  return fetchPrivate(url)
    .then(response => response.json())
    .then(response => Promise.resolve(new BigNum(response.nonce)));
}

/**
 * Estimate the total transaction fee in microstacks for a token transfer
 *
 * @param {StacksTransaction} transaction - the token transfer transaction to estimate fees for
 * @param {StacksNetwork} network - the Stacks network to estimate transaction for
 *
 * @return a promise that resolves to number of microstacks per byte
 */
export function estimateTransfer(
  transaction: StacksTransaction,
  network?: StacksNetwork
): Promise<BigNum> {
  if (transaction.payload.payloadType !== PayloadType.TokenTransfer) {
    throw new Error(
      `Transaction fee estimation only possible with ${
        PayloadType[PayloadType.TokenTransfer]
      } transactions. Invoked with: ${PayloadType[transaction.payload.payloadType]}`
    );
  }

  const requestHeaders = {
    Accept: 'application/text',
  };

  const fetchOptions = {
    method: 'GET',
    headers: requestHeaders,
  };

  const defaultNetwork = new StacksMainnet();
  const url = network
    ? network.getTransferFeeEstimateApiUrl()
    : defaultNetwork.getTransferFeeEstimateApiUrl();

  return fetchPrivate(url, fetchOptions)
    .then(response => response.text())
    .then(feeRateResult => {
      const txBytes = new BigNum(transaction.serialize().byteLength);
      const feeRate = new BigNum(feeRateResult);
      return feeRate.mul(txBytes);
    });
}

export type TxBroadcastResultOk = string;
export type TxBroadcastResultRejected = {
  error: string;
  reason: TxRejectedReason;
  reason_data: any;
  txid: string;
};
export type TxBroadcastResult = TxBroadcastResultOk | TxBroadcastResultRejected;

/**
 * Broadcast the signed transaction to a core node
 *
 * @param {StacksTransaction} transaction - the token transfer transaction to broadcast
 * @param {StacksNetwork} network - the Stacks network to broadcast transaction to
 *
 * @returns {Promise} that resolves to a response if the operation succeeds
 */
export async function broadcastTransaction(
  transaction: StacksTransaction,
  network: StacksNetwork
): Promise<TxBroadcastResult> {
  const rawTx = transaction.serialize();
  const url = network.getBroadcastApiUrl();

  return broadcastRawTransaction(rawTx, url);
}

/**
 * Broadcast the signed transaction to a core node
 *
 * @param {Buffer} rawTx - the raw serialized transaction buffer to broadcast
 * @param {string} url - the broadcast endpoint URL
 *
 * @returns {Promise} that resolves to a response if the operation succeeds
 */
export async function broadcastRawTransaction(
  rawTx: Buffer,
  url: string
): Promise<TxBroadcastResult> {
  const requestHeaders = {
    'Content-Type': 'application/octet-stream',
  };

  const options = {
    method: 'POST',
    headers: requestHeaders,
    body: rawTx,
  };

  const response = await fetchPrivate(url, options);
  if (!response.ok) {
    try {
      return await response.json();
    } catch (e) {
      throw Error(`Failed to broadcast transaction: ${e.message}`);
    }
  }

  return await response.text();
}

/**
 * Fetch a contract's ABI
 *
 * @param {string} address - the contracts address
 * @param {string} contractName - the contracts name
 * @param {StacksNetwork} network - the Stacks network to broadcast transaction to
 *
 * @returns {Promise} that resolves to a ClarityAbi if the operation succeeds
 */
export async function getAbi(
  address: string,
  contractName: string,
  network: StacksNetwork
): Promise<ClarityAbi> {
  const options = {
    method: 'GET',
  };

  const url = network.getAbiApiUrl(address, contractName);

  const response = await fetchPrivate(url, options);
  if (!response.ok) {
    let msg = '';
    try {
      msg = await response.text();
    } catch (error) {}
    throw new Error(
      `Error fetching contract ABI for contract "${contractName}" at address ${address}. Response ${response.status}: ${response.statusText}. Attempted to fetch ${url} and failed with the message: "${msg}"`
    );
  }

  return JSON.parse(await response.text());
}

/**
 * STX token transfer transaction options
 *
 * @param  {String|PrincipalCV} recipientAddress - the c32check address of the recipient or a
 *                                                  principal clarity value
 * @param  {BigNum} amount - number of tokens to transfer in microstacks
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {BigNum} fee - transaction fee in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {StacksNetwork} network - the Stacks blockchain network this transaction is destined for
 * @param  {anchorMode} anchorMode - identify how the the transaction should be mined
 * @param  {String} memo - an arbitrary string to include with the transaction, must be less than
 *                          34 bytes
 * @param  {PostConditionMode} postConditionMode - whether post conditions must fully cover all
 *                                                 transferred assets
 * @param  {PostCondition[]} postConditions - an array of post conditions to add to the
 *                                                  transaction
 */
export interface TokenTransferOptions {
  recipient: string | PrincipalCV;
  amount: BigNum;
  senderKey: string;
  fee?: BigNum;
  nonce?: BigNum;
  network?: StacksNetwork;
  anchorMode?: AnchorMode;
  memo?: string;
  postConditionMode?: PostConditionMode;
  postConditions?: PostCondition[];
}

/**
 * Generates a Stacks token transfer transaction
 *
 * Returns a signed Stacks token transfer transaction.
 *
 * @param  {TokenTransferOptions} txOptions - an options object for the token transfer
 *
 * @return {StacksTransaction}
 */
export async function makeSTXTokenTransfer(
  txOptions: TokenTransferOptions
): Promise<StacksTransaction> {
  const defaultOptions = {
    fee: new BigNum(0),
    nonce: new BigNum(0),
    network: new StacksMainnet(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    memo: '',
  };

  const options = Object.assign(defaultOptions, txOptions);

  const payload = createTokenTransferPayload(options.recipient, options.amount, options.memo);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = createStacksPrivateKey(options.senderKey);
  const pubKey = getPublicKey(privKey);
  const spendingCondition = createSingleSigSpendingCondition(
    addressHashMode,
    publicKeyToString(pubKey),
    options.nonce,
    options.fee
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const postConditions: PostCondition[] = [];
  if (options.postConditions && options.postConditions.length > 0) {
    options.postConditions.forEach(postCondition => {
      postConditions.push(postCondition);
    });
  }

  const lpPostConditions = createLPList(postConditions);
  const transaction = new StacksTransaction(
    options.network.version,
    authorization,
    payload,
    lpPostConditions,
    options.postConditionMode,
    defaultOptions.anchorMode,
    options.network.chainId
  );

  if (!txOptions.fee) {
    const txFee = await estimateTransfer(transaction, options.network);
    transaction.setFee(txFee);
  }

  if (!txOptions.nonce) {
    const addressVersion =
      options.network.version === TransactionVersion.Mainnet
        ? AddressVersion.MainnetSingleSig
        : AddressVersion.TestnetSingleSig;
    const senderAddress = publicKeyToAddress(addressVersion, pubKey);
    const txNonce = await getNonce(senderAddress, options.network);
    transaction.setNonce(txNonce);
  }

  if (options.senderKey) {
    const signer = new TransactionSigner(transaction);
    signer.signOrigin(privKey);
  }

  return transaction;
}

/**
 * Contract deploy transaction options
 *
 * @param  {String} contractName - the contract name
 * @param  {String} codeBody - the code body string
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {BigNum} fee - transaction fee in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {StacksNetwork} network - the Stacks blockchain network this transaction is destined for
 * @param  {anchorMode} anchorMode - identify how the the transaction should be mined
 * @param  {PostConditionMode} postConditionMode - whether post conditions must fully cover all
 *                                                 transferred assets
 * @param  {PostCondition[]} postConditions - an array of post conditions to add to the
 *                                                  transaction
 */
export interface ContractDeployOptions {
  contractName: string;
  codeBody: string;
  senderKey: string;
  fee?: BigNum;
  nonce?: BigNum;
  network?: StacksNetwork;
  anchorMode?: AnchorMode;
  postConditionMode?: PostConditionMode;
  postConditions?: PostCondition[];
}

/**
 * Estimate the total transaction fee in microstacks for a contract deploy
 *
 * @param {StacksTransaction} transaction - the token transfer transaction to estimate fees for
 * @param {StacksNetwork} network - the Stacks network to estimate transaction for
 *
 * @return a promise that resolves to number of microstacks per byte
 */
export function estimateContractDeploy(
  transaction: StacksTransaction,
  network?: StacksNetwork
): Promise<BigNum> {
  if (transaction.payload.payloadType !== PayloadType.SmartContract) {
    throw new Error(
      `Contract deploy fee estimation only possible with ${
        PayloadType[PayloadType.SmartContract]
      } transactions. Invoked with: ${PayloadType[transaction.payload.payloadType]}`
    );
  }

  const requestHeaders = {
    Accept: 'application/text',
  };

  const fetchOptions = {
    method: 'GET',
    headers: requestHeaders,
  };

  // Place holder estimate until contract deploy fee estimation is fully implemented on Stacks
  // blockchain core
  const defaultNetwork = new StacksMainnet();
  const url = network
    ? network.getTransferFeeEstimateApiUrl()
    : defaultNetwork.getTransferFeeEstimateApiUrl();

  return fetchPrivate(url, fetchOptions)
    .then(response => response.text())
    .then(feeRateResult => {
      const txBytes = new BigNum(transaction.serialize().byteLength);
      const feeRate = new BigNum(feeRateResult);
      return feeRate.mul(txBytes);
    });
}

/**
 * Generates a Clarity smart contract deploy transaction
 *
 * @param  {ContractDeployOptions} txOptions - an options object for the contract deploy
 *
 * Returns a signed Stacks smart contract deploy transaction.
 *
 * @return {StacksTransaction}
 */
export async function makeContractDeploy(
  txOptions: ContractDeployOptions
): Promise<StacksTransaction> {
  const defaultOptions = {
    fee: new BigNum(0),
    nonce: new BigNum(0),
    network: new StacksMainnet(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
  };

  const options = Object.assign(defaultOptions, txOptions);

  const payload = createSmartContractPayload(options.contractName, options.codeBody);

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = createStacksPrivateKey(options.senderKey);
  const pubKey = getPublicKey(privKey);
  const spendingCondition = createSingleSigSpendingCondition(
    addressHashMode,
    publicKeyToString(pubKey),
    options.nonce,
    options.fee
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const postConditions: PostCondition[] = [];
  if (options.postConditions && options.postConditions.length > 0) {
    options.postConditions.forEach(postCondition => {
      postConditions.push(postCondition);
    });
  }

  const lpPostConditions = createLPList(postConditions);
  const transaction = new StacksTransaction(
    options.network.version,
    authorization,
    payload,
    lpPostConditions,
    options.postConditionMode,
    options.anchorMode,
    options.network.chainId
  );

  if (!txOptions.fee) {
    const txFee = await estimateContractDeploy(transaction, options.network);
    transaction.setFee(txFee);
  }

  if (!txOptions.nonce) {
    const addressVersion =
      options.network.version === TransactionVersion.Mainnet
        ? AddressVersion.MainnetSingleSig
        : AddressVersion.TestnetSingleSig;
    const senderAddress = publicKeyToAddress(addressVersion, pubKey);
    const txNonce = await getNonce(senderAddress, options.network);
    transaction.setNonce(txNonce);
  }

  if (options.senderKey) {
    const signer = new TransactionSigner(transaction);
    signer.signOrigin(privKey);
  }

  return transaction;
}

/**
 * Contract function call transaction options
 * @param  {String} contractAddress - the c32check address of the contract
 * @param  {String} contractName - the contract name
 * @param  {String} functionName - name of the function to be called
 * @param  {[ClarityValue]} functionArgs - an array of Clarity values as arguments to the function call
 * @param  {String} senderKey - hex string sender private key used to sign transaction
 * @param  {BigNum} fee - transaction fee in microstacks
 * @param  {BigNum} nonce - a nonce must be increased monotonically with each new transaction
 * @param  {StacksNetwork} network - the Stacks blockchain network this transaction is destined for
 * @param  {anchorMode} anchorMode - identify how the the transaction should be mined
 * @param  {PostConditionMode} postConditionMode - whether post conditions must fully cover all
 *                                                 transferred assets
 * @param  {PostCondition[]} postConditions - an array of post conditions to add to the
 *                                                  transaction
 */
export interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  senderKey: string;
  fee?: BigNum;
  feeEstimateApiUrl?: string;
  nonce?: BigNum;
  network?: StacksNetwork;
  anchorMode?: AnchorMode;
  postConditionMode?: PostConditionMode;
  postConditions?: PostCondition[];
  validateWithAbi?: boolean | ClarityAbi;
}

/**
 * Estimate the total transaction fee in microstacks for a contract function call
 *
 * @param {StacksTransaction} transaction - the token transfer transaction to estimate fees for
 * @param {StacksNetwork} network - the Stacks network to estimate transaction for
 *
 * @return a promise that resolves to number of microstacks per byte
 */
export function estimateContractFunctionCall(
  transaction: StacksTransaction,
  network?: StacksNetwork
): Promise<BigNum> {
  if (transaction.payload.payloadType !== PayloadType.ContractCall) {
    throw new Error(
      `Contract call fee estimation only possible with ${
        PayloadType[PayloadType.ContractCall]
      } transactions. Invoked with: ${PayloadType[transaction.payload.payloadType]}`
    );
  }

  const requestHeaders = {
    Accept: 'application/text',
  };

  const fetchOptions = {
    method: 'GET',
    headers: requestHeaders,
  };

  // Place holder estimate until contract call fee estimation is fully implemented on Stacks
  // blockchain core
  const defaultNetwork = new StacksMainnet();
  const url = network
    ? network.getTransferFeeEstimateApiUrl()
    : defaultNetwork.getTransferFeeEstimateApiUrl();

  return fetchPrivate(url, fetchOptions)
    .then(response => response.text())
    .then(feeRateResult => {
      const txBytes = new BigNum(transaction.serialize().byteLength);
      const feeRate = new BigNum(feeRateResult);
      return feeRate.mul(txBytes);
    });
}

/**
 * Generates a Clarity smart contract function call transaction
 *
 * @param  {ContractCallOptions} txOptions - an options object for the contract function call
 *
 * Returns a signed Stacks smart contract function call transaction.
 *
 * @return {StacksTransaction}
 */
export async function makeContractCall(txOptions: ContractCallOptions): Promise<StacksTransaction> {
  const defaultOptions = {
    fee: new BigNum(0),
    nonce: new BigNum(0),
    network: new StacksMainnet(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
  };

  const options = Object.assign(defaultOptions, txOptions);

  const payload = createContractCallPayload(
    options.contractAddress,
    options.contractName,
    options.functionName,
    options.functionArgs
  );

  if (options?.validateWithAbi) {
    let abi: ClarityAbi;
    if (typeof options.validateWithAbi === 'boolean') {
      if (options?.network) {
        abi = await getAbi(options.contractAddress, options.contractName, options.network);
      } else {
        throw new Error('Network option must be provided in order to validate with ABI');
      }
    } else {
      abi = options.validateWithAbi;
    }

    validateContractCall(payload, abi);
  }

  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const privKey = createStacksPrivateKey(options.senderKey);
  const pubKey = getPublicKey(privKey);
  const spendingCondition = createSingleSigSpendingCondition(
    addressHashMode,
    publicKeyToString(pubKey),
    options.nonce,
    options.fee
  );
  const authorization = new StandardAuthorization(spendingCondition);

  const postConditions: PostCondition[] = [];
  if (options.postConditions && options.postConditions.length > 0) {
    options.postConditions.forEach(postCondition => {
      postConditions.push(postCondition);
    });
  }

  const lpPostConditions = createLPList(postConditions);
  const transaction = new StacksTransaction(
    options.network.version,
    authorization,
    payload,
    lpPostConditions,
    options.postConditionMode,
    options.anchorMode,
    options.network.chainId
  );

  if (!txOptions.fee) {
    const txFee = await estimateContractFunctionCall(transaction, options.network);
    transaction.setFee(txFee);
  }

  if (!txOptions.nonce) {
    const addressVersion =
      options.network.version === TransactionVersion.Mainnet
        ? AddressVersion.MainnetSingleSig
        : AddressVersion.TestnetSingleSig;
    const senderAddress = publicKeyToAddress(addressVersion, pubKey);
    const txNonce = await getNonce(senderAddress, options.network);
    transaction.setNonce(txNonce);
  }

  if (options.senderKey) {
    const signer = new TransactionSigner(transaction);
    signer.signOrigin(privKey);
  }

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
  return createSTXPostCondition(createStandardPrincipal(address), conditionCode, amount);
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
  return createSTXPostCondition(
    createContractPrincipal(address, contractName),
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
  assetInfo: string | AssetInfo
): FungiblePostCondition {
  return createFungiblePostCondition(
    createStandardPrincipal(address),
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
  assetInfo: string | AssetInfo
): FungiblePostCondition {
  return createFungiblePostCondition(
    createContractPrincipal(address, contractName),
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
 * @param  {ClarityValue} assetName - asset name describing the non-fungible token
 *
 * @return {NonFungiblePostCondition}
 */
export function makeStandardNonFungiblePostCondition(
  address: string,
  conditionCode: NonFungibleConditionCode,
  assetInfo: string | AssetInfo,
  assetName: ClarityValue
): NonFungiblePostCondition {
  return createNonFungiblePostCondition(
    createStandardPrincipal(address),
    conditionCode,
    assetInfo,
    assetName
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
 * @param  {ClarityValue} assetName - asset name describing the non-fungible token
 *
 * @return {NonFungiblePostCondition}
 */
export function makeContractNonFungiblePostCondition(
  address: string,
  contractName: string,
  conditionCode: NonFungibleConditionCode,
  assetInfo: string | AssetInfo,
  assetName: ClarityValue
): NonFungiblePostCondition {
  return createNonFungiblePostCondition(
    createContractPrincipal(address, contractName),
    conditionCode,
    assetInfo,
    assetName
  );
}

/**
 * Read only function options
 *
 * @param  {String} contractAddress - the c32check address of the contract
 * @param  {String} contractName - the contract name
 * @param  {String} functionName - name of the function to be called
 * @param  {[ClarityValue]} functionArgs - an array of Clarity values as arguments to the function call
 * @param  {StacksNetwork} network - the Stacks blockchain network this transaction is destined for
 * @param  {String} senderAddress - the c32check address of the sender
 */

export interface ReadOnlyFunctionOptions {
  contractName: string;
  contractAddress: string;
  functionName: string;
  functionArgs: ClarityValue[];
  network?: StacksNetwork;
  senderAddress: string;
}

/**
 * Calls a read only function from a contract interface
 *
 * @param  {ReadOnlyFunctionOptions} readOnlyFunctionOptions - the options object
 *
 * Returns an object with a status bool (okay) and a result string that is a serialized clarity value in hex format.
 *
 * @return {ClarityValue}
 */
export async function callReadOnlyFunction(
  readOnlyFunctionOptions: ReadOnlyFunctionOptions
): Promise<ClarityValue> {
  const defaultOptions = {
    network: new StacksMainnet(),
  };

  const options = Object.assign(defaultOptions, readOnlyFunctionOptions);

  const {
    contractName,
    contractAddress,
    functionName,
    functionArgs,
    network,
    senderAddress,
  } = options;

  const url = network.getReadOnlyFunctionCallApiUrl(contractAddress, contractName, functionName);

  const args = functionArgs.map(arg => cvToHex(arg));

  const body = JSON.stringify({
    sender: senderAddress,
    arguments: args,
  });

  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json().then(responseJson => parseReadOnlyResponse(responseJson));
}
