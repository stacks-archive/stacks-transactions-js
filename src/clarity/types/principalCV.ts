import { Address, LengthPrefixedString } from '../../types';
import { ClarityType } from '../clarityValue';

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
  const address = new Address(addressString);
  return { type: ClarityType.PrincipalStandard, address };
}

function standardPrincipalCVFromAddress(address: Address): StandardPrincipalCV {
  return { type: ClarityType.PrincipalStandard, address };
}

function contractPrincipalCV(addr: string, contractName: string): ContractPrincipalCV {
  const address = new Address(addr);
  const lengthPrefixedContractName = new LengthPrefixedString(contractName);
  return contractPrincipalCVFromAddress(address, lengthPrefixedContractName);
}

function contractPrincipalCVFromAddress(
  address: Address,
  contractName: LengthPrefixedString
): ContractPrincipalCV {
  if (Buffer.byteLength(contractName.content!) >= 128) {
    throw new Error('Contract name must be less than 128 bytes');
  }
  return { type: ClarityType.PrincipalContract, address, contractName };
}

function contractPrincipalCVFromStandard(
  sp: StandardPrincipalCV,
  contractName: string
): ContractPrincipalCV {
  const lengthPrefixedContractName = new LengthPrefixedString(contractName);
  return {
    type: ClarityType.PrincipalContract,
    address: sp.address,
    contractName: lengthPrefixedContractName,
  };
}

export {
  StandardPrincipalCV,
  ContractPrincipalCV,
  standardPrincipalCV,
  standardPrincipalCVFromAddress,
  contractPrincipalCV,
  contractPrincipalCVFromAddress,
  contractPrincipalCVFromStandard,
};
