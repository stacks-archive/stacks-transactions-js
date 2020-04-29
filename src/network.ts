import { TransactionVersion, ChainID } from './constants';

export interface StacksNetwork {
  version: TransactionVersion;
  chainId: ChainID;
  coreApiUrl: string;
  broadcastApiUrl: string;
  transferFeeEstimateApiUrl: string;
}

export class StacksMainnet implements StacksNetwork {
  version = TransactionVersion.Mainnet;
  chainId = ChainID.Mainnet;
  coreApiUrl = 'https://core.blockstack.org';
  broadcastApiUrl = `${this.coreApiUrl}/v2/transactions`;
  transferFeeEstimateApiUrl = `${this.coreApiUrl}/v2/fees/transfer`;
}

export class StacksTestnet implements StacksNetwork {
  version = TransactionVersion.Testnet;
  chainId = ChainID.Testnet;
  coreApiUrl = 'http://neon.blockstack.org:20443';
  broadcastApiUrl = `${this.coreApiUrl}/v2/transactions`;
  transferFeeEstimateApiUrl = `${this.coreApiUrl}/v2/fees/transfer`;
}
