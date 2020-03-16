# Stacks Transactions JS
The Javascript library for generating Stacks 2.0 transactions. 

## Installation

```
$ npm install stacks-transaction-js
```

## Overview
This library supports the creation of the following Stacks 2.0 transaction types:

1. STX token transfer
2. Smart contract deploy
3. Smart contract function call

## Key Generation
```
// Random key
let privateKey = StacksPrivateKey.makeRandom();
// Get public key from private
let publicKey = privateKey.getPublicKey();

// Private key from hex string
let key = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
let privateKey = new StacksPrivateKey(key);
```

## STX Token Transfer Transaction
```
let recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
let amount = BigInt(12345);
let feeRate = BigInt(0);
let nonce = BigInt(0);
let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
let memo = "test memo";

let transaction = makeSTXTokenTransfer(
  recipientAddress,
  amount,
  feeRate,
  nonce,
  secretKey,
  TransactionVersion.Mainnet,
  memo
);

let serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

## Smart Contract Deploy Transaction
```
let contractName = 'contract_name';
let code = fs.readFileSync('/path/to/contract.clar').toString();
let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

let feeRate = BigInt(0);
let nonce = BigInt(0);

let transaction = makeSmartContractDeploy(contractName, code, feeRate, nonce, secretKey, TransactionVersion.Mainnet);

let serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

## Smart Contract Function Call
```
let contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
let contractName = 'contract_name';
let functionName = 'contract_function';
let buffer = Buffer.from('foo');
let bufferClarityValue = new BufferCV(buffer);
let functionArgs = [bufferClarityValue];
let secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

let feeRate = BigInt(0);
let nonce = BigInt(0);

let transaction = makeContractCall(
  contractAddress,
  contractName,
  functionName,
  functionArgs,
  feeRate,
  nonce,
  secretKey,
  TransactionVersion.Mainnet
);

let serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

