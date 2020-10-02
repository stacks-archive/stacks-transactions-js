import { TransactionVersion, ChainID } from './constants';

export interface StacksNetwork {
  version: TransactionVersion;
  chainId: ChainID;
  coreApiUrl: string;
  broadcastEndpoint: string;
  transferFeeEstimateEndpoint: string;
  accountEndpoint: string;
  contractAbiEndpoint: string;
  readOnlyFunctionCallEndpoint: string;
  getBroadcastApiUrl: () => string;
  getTransferFeeEstimateApiUrl: () => string;
  getAccountApiUrl: (address: string) => string;
  getAbiApiUrl: (address: string, contract: string) => string;
  getReadOnlyFunctionCallApiUrl: (
    contractAddress: string,
    contractName: string,
    functionName: string
  ) => string;
  getMapEntryCallApiUrl: (contractAddress: string, contractNam: string, mapName: string) => string;
}

export class StacksMainnet implements StacksNetwork {
  version = TransactionVersion.Mainnet;
  chainId = ChainID.Mainnet;
  coreApiUrl = 'https://core.blockstack.org';
  broadcastEndpoint = '/v2/transactions';
  transferFeeEstimateEndpoint = '/v2/fees/transfer';
  accountEndpoint = '/v2/accounts';
  contractAbiEndpoint = '/v2/contracts/interface';
  readOnlyFunctionCallEndpoint = '/v2/contracts/call-read';
  mapEntryCallEndpoint = '/v2/map_entry';
  getBroadcastApiUrl = () => `${this.coreApiUrl}${this.broadcastEndpoint}`;
  getTransferFeeEstimateApiUrl = () => `${this.coreApiUrl}${this.transferFeeEstimateEndpoint}`;
  getAccountApiUrl = (address: string) =>
    `${this.coreApiUrl}${this.accountEndpoint}/${address}?proof=0`;
  getAbiApiUrl = (address: string, contract: string) =>
    `${this.coreApiUrl}${this.contractAbiEndpoint}/${address}/${contract}`;
  getReadOnlyFunctionCallApiUrl = (
    contractAddress: string,
    contractName: string,
    functionName: string
  ) =>
    `${this.coreApiUrl}${
      this.readOnlyFunctionCallEndpoint
    }/${contractAddress}/${contractName}/${encodeURIComponent(functionName)}`;
  getMapEntryCallApiUrl = (
    contractAddress: string,
    contractName: string,
    mapName: string,
    proof: string = '0'
  ) =>
    `${this.coreApiUrl}${this.mapEntryCallEndpoint}/${contractAddress}/${contractName}/${mapName}?proof=${proof}`;
}

export class StacksTestnet extends StacksMainnet implements StacksNetwork {
  version = TransactionVersion.Testnet;
  chainId = ChainID.Testnet;
  coreApiUrl = 'http://testnet-master.blockstack.org:20443';
}
