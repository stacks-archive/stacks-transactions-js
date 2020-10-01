# Changelog

All notable changes to the project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Multi-Sig (P2SH) transaction support
- Support for clarity string types
- Added `createTxWithSignature` method to

## v0.6.1

- Fixed `BufferArray` class so that it does not need to rely on extending the Array native class

## v0.6.0

- Added ability to create sponsored transactions using `sponsorTransaction()`

## v0.5.1

### Changed

- `cvToString()` serializes uints with literal `"u"` prefix.
- `PostCondition` and builders are now exported

## v0.5.0

### Changed

- renamed `makeSmartContractDeploy()` to `makeContractDeploy()`
- tx broadcast now returns a response type which may contain an error
- fixed contract deploy auto fee estimation
- allow buffers to be less than or equal to the size specified in the ABI when validating contract-call args

## v0.4.6

- Updates the testnet network config to use stable `testnet-master.blockstack.org` URL

## v0.4.5

- Add `parseToCV()` utility function to convert string input to the appropriate Clarity value based on the Clarity ABI type specified by the contract function

## v0.4.4

### Added

- Ability to broadcast raw transactions using `broadcastRawTransaction()`
- `abiFunctionToString()` method for converting ABI function typedef to Clarity repr string

### Changed

- Changed the format that the type -> string functions output to match Clarity type repr

## v0.4.2

### Added

- Add cvToString() method for converting ClarityValue objects to their string (source code) representation

### Changed

## v0.4.1

### Added

- ABI validation for contract-call transactions
- Additional methods added to the StacksNetwork interface

### Changed
