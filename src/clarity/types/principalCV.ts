import { Address, LengthPrefixedString, createAddress, createLPString } from '../../types';
import { ClarityType } from '../clarityValue';

type PrincipalCV = StandardPrincipalCV | ContractPrincipalCV;

interface StandardPrincipalCV {
  readonly type: ClarityType.PrincipalStandard;
  readonly address: Address;
}

interface ContractPrincipalCV {
  readonly type: ClarityType.PrincipalContract;
  readonly address: Address;
  readonly contractName: LengthPrefixedString;
}

function standardPrincipalCV(addressString: string): StandardPrincipalCV {
  const addr = createAddress(addressString);
  return { type: ClarityType.PrincipalStandard, address: addr };
}

function standardPrincipalCVFromAddress(address: Address): StandardPrincipalCV {
  return { type: ClarityType.PrincipalStandard, address };
}

function contractPrincipalCV(addressString: string, contractName: string): ContractPrincipalCV {
  const addr = createAddress(addressString);
  const lengthPrefixedContractName = createLPString(contractName);
  return contractPrincipalCVFromAddress(addr, lengthPrefixedContractName);
}

function contractPrincipalCVFromAddress(
  address: Address,
  contractName: LengthPrefixedString
): ContractPrincipalCV {
  if (Buffer.byteLength(contractName.content) >= 128) {
    throw new Error('Contract name must be less than 128 bytes');
  }
  return { type: ClarityType.PrincipalContract, address, contractName };
}

function contractPrincipalCVFromStandard(
  sp: StandardPrincipalCV,
  contractName: string
): ContractPrincipalCV {
  const lengthPrefixedContractName = createLPString(contractName);
  return {
    type: ClarityType.PrincipalContract,
    address: sp.address,
    contractName: lengthPrefixedContractName,
  };
}

export {
  PrincipalCV,
  StandardPrincipalCV,
  ContractPrincipalCV,
  standardPrincipalCV,
  standardPrincipalCVFromAddress,
  contractPrincipalCV,
  contractPrincipalCVFromAddress,
  contractPrincipalCVFromStandard,
};
