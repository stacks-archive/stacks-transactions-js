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
const { StacksPrivateKey } = require('stacks-transactions');

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
const { makeSTXTokenTransfer } = require('stacks-transactions');
const BigNum = require('bn.js');

var recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
var amount = new BigNum(12345);
var feeRate = new BigNum(0);
var nonce = new BigNum(0);
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
const { makeSmartContractDeploy } = require('stacks-transactions');
const BigNum = require('bn.js');

var contractName = 'contract_name';
var code = fs.readFileSync('/path/to/contract.clar').toString();
var secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

var feeRate = new BigNum(0);
var nonce = new BigNum(0);

var transaction = makeSmartContractDeploy(contractName, code, feeRate, nonce, secretKey, TransactionVersion.Mainnet);

var serializedTx = transaction.serialize().toString('hex');
// broadcast the transaction
```

## Smart Contract Function Call

```javascript
const { makeContractCall, BufferCV } = require('stacks-transactions');
const BigNum = require('bn.js');

var contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
var contractName = 'contract_name';
var functionName = 'contract_function';
var buffer = Buffer.from('foo');
var bufferClarityValue = new BufferCV(buffer);
var functionArgs = [bufferClarityValue];
var secretKey = "edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01";

var feeRate = new BigNum(0);
var nonce = new BigNum(0);

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

### Constructing Clarity Values

Building transactions that call functions in deployed clarity contracts requires you to construct valid Clarity Values to pass to the function as arguments. The [Clarity type system](https://github.com/blockstack/stacks-blockchain/blob/master/sip/sip-002-smart-contract-language.md#clarity-type-system) contains the following types:

- `(tuple (key-name-0 key-type-0) (key-name-1 key-type-1) ...)`
  - a typed tuple with named fields.
- `(list max-len entry-type)`
  - a list of maximum length max-len, with entries of type entry-type
- `(response ok-type err-type)`
  - object used by public functions to commit their changes or abort. May be returned or used by other functions as well, however, only public functions have the commit/abort behavior.
- `(optional some-type)`
  - an option type for objects that can either be (some value) or none
- `(buff max-len)`
  - byte buffer or maximum length max-len.
- `principal`
  - object representing a principal (whether a contract principal or standard principal).
- `bool`
  - boolean value ('true or 'false)
- `int`
  - signed 128-bit integer
- `uint`
  - unsigned 128-bit integer

This library contains Typescript types and classes that map to the Clarity types, in order to make it easy to construct well-typed Clarity values in Javascript. These types all extend the abstract class `ClarityValue`.

```javascript

// construct boolean clarity values
const trueCV = new TrueCV();
const falseCV = new FalseCV();

// construct optional clarity values
const noneCV = NoneCV();
const someCV = SomeCV(trueCV);

// construct a buffer clarity value from an existing Buffer
const buffer = Buffer.from('foo');
const bufferCV = new BufferCV(buffer);

// construct signed and unsigned integer clarity values
const intCV = new IntCV(-10);
const uintCV = new UIntCV(10);

// construct principal clarity values
const address = 'SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B';
const standardPrincipalCV = new StandardPrincipalCV(address);
const contractPrincipalCV = new ContractPrincipalCV(address, 'contract-name');

// construct response clarity values
const responseErrorCV = new ResponseErrorCV(trueCV);
const responseOkCV = new ResponseOkCV(falseCV);

// construct tuple clarity values
const tupleCV = new TupleCV({
  'property1': new IntCV(1),
  'property2': new TrueCV()
})

// construct list clarity values
const listCV = new ListCV([trueCV, falseCV])
```

If you develop in Typescript, the type checker will help prevent you from creating wrongly-typed Clarity values. For example, the following code won't compile since in Clarity lists are homogeneous, meaning they can only contain values of a single type.

```typescript
const listCV = new ListCV([new TrueCV, new IntCV(1)]);
```
