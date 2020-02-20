const DEFAULT_CHAIN_ID = "00000000"; // Main Stacks blockchain chain ID 0x00000000 
const MAX_STRING_LENGTH_BYTES = 128;
const COINBASE_BUFFER_LENGTH_BYTES = 32;
const RECOVERABLE_ECDSA_SIG_LENGTH_BYTES = 65
const COMPRESSED_PUBKEY_LENGTH_BYTES = 32;
const UNCOMPRESSED_PUBKEY_LENGTH_BYTES = 64;

enum PayloadType {
  TokenTransfer = "00",
  ContractCall = "01",
  SmartContract = "02",
  PoisonMicroblock = "03",
  Coinbase = "04"
}

enum AnchorMode {
  Any = "01",
  OnChainOnly = "02",
  OffChainOnly = "03"
}

enum TransactionVersion {
  Mainnet = "00",
  Testnet = "80"
}

enum PostConditionMode {
  Allow = "01",
  Deny = "02"
}

enum PostConditionType {
  STX = "00",
  Fungible = "01",
  NonFungible = "02"
}

enum AuthType {
  Standard = "04", 
  Sponsored = "05"
}

enum AddressHashMode {
  // serialization modes for public keys to addresses.
  // We support four different modes due to legacy compatibility with Stacks v1 addresses:
  SerializeP2PKH = "00",          // hash160(public-key), same as bitcoin's p2pkh
  SerializeP2SH = "01",           // hash160(multisig-redeem-script), same as bitcoin's multisig p2sh
  SerializeP2WPKH = "02",         // hash160(segwit-program-00(p2pkh)), same as bitcoin's p2sh-p2wpkh
  SerializeP2WSH = "03"           // hash160(segwit-program-00(public-keys)), same as bitcoin's p2sh-p2wsh
}

enum PubKeyEncoding {
  Compressed = "00",
  Uncompressed = "01"
}

enum FungibleConditionCode {
  Equal = "01",
  Greater = "02",
  GreaterEqual = "03",
  Less = "04",
  LessEqual = "05"
}

enum NonFungibleConditionCode {
  DoesNotOwn = "10",
  Owns = "11"
}

enum PrincipalType { 
  Origin = "01",
  Standard = "02",
  Contract = "03"
}

enum AssetType {
  STX = "00",
  Fungible = "01",
  NonFungible = "02"
}

export {
  MAX_STRING_LENGTH_BYTES,
  COINBASE_BUFFER_LENGTH_BYTES,
  DEFAULT_CHAIN_ID,
  RECOVERABLE_ECDSA_SIG_LENGTH_BYTES,
  COMPRESSED_PUBKEY_LENGTH_BYTES,
  UNCOMPRESSED_PUBKEY_LENGTH_BYTES,
  PayloadType,
  AnchorMode,
  TransactionVersion,
  PostConditionMode,
  PostConditionType,
  AuthType,
  AddressHashMode,
  PubKeyEncoding,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PrincipalType,
  AssetType
}