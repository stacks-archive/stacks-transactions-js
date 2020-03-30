# Stacks Transactions JS
The JavaScript library for generating Stacks 2.0 transactions. 

## Installation

```
npm install @blockstack/stacks-transactions
```

## Overview
This library supports the creation of the following Stacks 2.0 transaction types:

1. STX token transfer
2. Smart contract deploy
3. Smart contract function call

## Key Generation
```javascript
import { StacksPrivateKey } from '@blockstack/stacks-transactions';

// Random key
const privateKey = StacksPrivateKey.makeRandom();
// Get public key from private
const publicKey = privateKey.getPublicKey();

// Private key from hex string
const key = 'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01';
const privateKey = new StacksPrivateKey(key);
```

## STX Token Transfer Transaction

```javascript
import { 
  makeSTXTokenTransfer, makeStandardSTXPostCondition 
} from '@blockstack/stacks-transactions';
const BigNum = require('bn.js');

const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
const amount = new BigNum(12345);
const feeRate = new BigNum(0); // Fee estimation to be implemented
const secretKey = 'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01';

const options = {
  memo: "test memo",
  nonce: new BigNum(0) // The nonce needs to be manually specified for now
};

const transaction = makeSTXTokenTransfer(
  recipientAddress,
  amount,
  feeRate,
  secretKey,
  options
);

const serializedTx = transaction.serialize().toString('hex');
transaction.broadcast(); // Not yet implemented
```

## Smart Contract Deploy Transaction

```javascript
import { makeSmartContractDeploy } from '@blockstack/stacks-transactions';
const BigNum = require('bn.js');

const contractName = 'contract_name';
const code = fs.readFileSync('/path/to/contract.clar').toString();
const secretKey = 'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01';
const feeRate = new BigNum(0); // Fee estimation to be implemented

const options = {
  nonce: new BigNum(0) // The nonce needs to be manually specified for now
};

const transaction = makeSmartContractDeploy(
  contractName, 
  code, 
  feeRate, 
  secretKey
  options
);

const serializedTx = transaction.serialize().toString('hex');
transaction.broadcast(); // Not yet implemented
```

## Smart Contract Function Call

```javascript
import { makeContractCall, BufferCV } from '@blockstack/stacks-transactions';
const BigNum = require('bn.js');

const contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
const contractName = 'contract_name';
const functionName = 'contract_function';
const buffer = Buffer.from('foo');
const bufferClarityValue = new BufferCV(buffer);
const functionArgs = [bufferClarityValue];
const secretKey = 'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01';
const feeRate = new BigNum(0); // Fee estimation to be implemented

// Add an optional post condition
// See below for details on constructing post conditions
const postConditionAddress = 'SP2ZD731ANQZT6J4K3F5N8A40ZXWXC1XFXHVVQFKE';
const postConditionCode = FungibleConditionCode.GreaterEqual;
const postConditionAmount = new BigNum(1000000);
const postConditions = [
  makeStandardSTXPostCondition(
    postConditionAddress, 
    postConditionCode, 
    postConditionAmount
  )
];

const options = {
  postConditions,
  nonce: new BigNum(0) // The nonce needs to be manually specified for now
};

const transaction = makeContractCall(
  contractAddress,
  contractName,
  functionName,
  functionArgs,
  feeRate,
  secretKey,
  options
);

const serializedTx = transaction.serialize().toString('hex');
transaction.broadcast(); // Not yet implemented
```

## Constructing Clarity Values

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

## Post Conditions
Three types of post conditions can be added to transactions: 

1. STX post condition
2. Fungible token post condition
3. Non-Fungible token post condition

For details see: https://github.com/blockstack/stacks-blockchain/blob/master/sip/sip-005-blocks-and-transactions.md#transaction-post-conditions

### STX post condition
```javascript
// With a standard principal
const postConditionAddress = 'SP2ZD731ANQZT6J4K3F5N8A40ZXWXC1XFXHVVQFKE';
const postConditionCode = FungibleConditionCode.GreaterEqual;
const postConditionAmount = new BigNum(12345);

const standardSTXPostCondition = makeStandardSTXPostCondition(
  postConditionAddress,
  postConditionCode,
  postConditionAmount
);

// With a contract principal
const contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
const contractName = 'test-contract';

const contractSTXPostCondition = makeContractSTXPostCondition(
  contractAddress,
  contractName,
  postConditionCode,
  postConditionAmount
);
```

### Fungible token post condition
```javascript
// With a standard principal
const postConditionAddress = 'SP2ZD731ANQZT6J4K3F5N8A40ZXWXC1XFXHVVQFKE';
const postConditionCode = FungibleConditionCode.GreaterEqual;
const postConditionAmount = new BigNum(12345);
const assetAddress = 'SP62M8MEFH32WGSB7XSF9WJZD7TQB48VQB5ANWSJ';
const assetContractName = 'test-asset-contract';
const fungibleAssetInfo = new AssetInfo(
  assetAddress,
  assetContractName
)

const standardFungiblePostCondition = makeStandardFungiblePostCondition(
  postConditionAddress,
  postConditionCode,
  postConditionAmount,
  fungibleAssetInfo 
);

// With a contract principal
const contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
const contractName = 'test-contract';
const assetAddress = 'SP62M8MEFH32WGSB7XSF9WJZD7TQB48VQB5ANWSJ';
const assetContractName = 'test-asset-contract';
const fungibleAssetInfo = new AssetInfo(
  assetAddress,
  assetContractName
)

const contractFungiblePostCondition = makeContractFungiblePostCondition(
  contractAddress,
  contractName,
  postConditionCode,
  postConditionAmount,
  fungibleAssetInfo
);
```

### Non-fungible token post condition
```javascript
// With a standard principal
const postConditionAddress = 'SP2ZD731ANQZT6J4K3F5N8A40ZXWXC1XFXHVVQFKE';
const postConditionCode = NonFungibleConditionCode.Owns;
const assetAddress = 'SP62M8MEFH32WGSB7XSF9WJZD7TQB48VQB5ANWSJ';
const assetContractName = 'test-asset-contract';
const assetName = 'test-asset';
const tokenAssetName = 'test-token-asset';
const nonFungibleAssetInfo = new AssetInfo(
  assetAddress,
  assetContractName,
  assetName
)

const standardNonFungiblePostCondition = makeStandardNonFungiblePostCondition(
  postConditionAddress,
  postConditionCode,
  nonFungibleAssetInfo,
  tokenAssetName
);

// With a contract principal
const contractAddress = 'SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X';
const contractName = 'test-contract';

const contractNonFungiblePostCondition = makeContractNonFungiblePostCondition(
  contractAddress,
  contractName,
  postConditionCode,
  nonFungibleAssetInfo,
  tokenAssetName
);
```
