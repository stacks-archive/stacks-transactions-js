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
```javascript
const { StacksPrivateKey } = require('stacks-transactions-js');

// Random key
var privateKey = StacksPrivateKey.makeRandom();
// Get public key from private
var publicKey = privateKey.getPublicKey();

// Private key from hex string
var key = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
var privateKey = new StacksPrivateKey(key);
```

## STX Token Transfer Transaction
```javascript
const { makeSTXTokenTransfer } = require('stacks-transactions-js');

var recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
var amount = BigInt(12345);
var feeRate = BigInt(0);
var nonce = BigInt(0);
var secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";
var memo = "test memo";

var transaction = makeSTXTokenTransfer(
  recipientAddress,
  amount,
  feeRate,
  nonce,
  secretKey,
  TransactionVersion.Mainnet,
  memo
);

var serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

## Smart Contract Deploy Transaction
```javascript
const { makeSmartContractDeploy } = require('stacks-transactions-js');

var contractName = 'contract_name';
var code = fs.readFileSync('/path/to/contract.clar').toString();
var secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

var feeRate = BigInt(0);
var nonce = BigInt(0);

var transaction = makeSmartContractDeploy(contractName, code, feeRate, nonce, secretKey, TransactionVersion.Mainnet);

var serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

## Smart Contract Function Call

```javascript
const { makeContractCall, BufferCV } = require('stacks-transactions-js');

var contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
var contractName = 'contract_name';
var functionName = 'contract_function';
var buffer = Buffer.from('foo');
var bufferClarityValue = new BufferCV(buffer);
var functionArgs = [bufferClarityValue];
var secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

var feeRate = BigInt(0);
var nonce = BigInt(0);

var transaction = makeContractCall(
  contractAddress,
  contractName,
  functionName,
  functionArgs,
  feeRate,
  nonce,
  secretKey,
  TransactionVersion.Mainnet
);

var serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

