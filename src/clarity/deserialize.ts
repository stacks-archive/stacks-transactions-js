import { BufferReader } from '../utils';
import { LengthPrefixedString, Address } from '..';
import {
  ClarityType,
  ClarityValue,
  intCV,
  uintCV,
  bufferCV,
  trueCV,
  falseCV,
  standardPrincipalCVFromAddress,
  contractPrincipalCVFromAddress,
  responseOkCV,
  responseErrorCV,
  noneCV,
  someCV,
  listCV,
  tupleCV,
} from '.';

export default function deserializeCV(buffer: BufferReader | Buffer): ClarityValue {
  const bufferReader = Buffer.isBuffer(buffer) ? new BufferReader(buffer) : buffer;
  const type = bufferReader.read(1).toString('hex') as ClarityType;

  switch (type) {
    case ClarityType.Int:
      return intCV(bufferReader.read(16));

    case ClarityType.UInt:
      return uintCV(bufferReader.read(16));

    case ClarityType.Buffer:
      const bufferLength = bufferReader.read(4).readUInt32BE(0);
      return bufferCV(bufferReader.read(bufferLength));

    case ClarityType.BoolTrue:
      return trueCV();

    case ClarityType.BoolFalse:
      return falseCV();

    case ClarityType.PrincipalStandard:
      const sAddress = Address.deserialize(bufferReader);
      return standardPrincipalCVFromAddress(sAddress);

    case ClarityType.PrincipalContract:
      const cAddress = Address.deserialize(bufferReader);
      const contractName = LengthPrefixedString.deserialize(bufferReader);
      return contractPrincipalCVFromAddress(cAddress, contractName);

    case ClarityType.ResponseOk:
      return responseOkCV(deserializeCV(bufferReader));

    case ClarityType.ResponseErr:
      return responseErrorCV(deserializeCV(bufferReader));

    case ClarityType.OptionalNone:
      return noneCV();

    case ClarityType.OptionalSome:
      return someCV(deserializeCV(bufferReader));

    case ClarityType.List:
      const listLength = bufferReader.read(4).readUInt32BE(0);
      const listContents: ClarityValue[] = [];
      for (let i = 0; i < listLength; i++) {
        listContents.push(deserializeCV(bufferReader));
      }
      return listCV(listContents);

    case ClarityType.Tuple:
      const tupleLength = bufferReader.read(4).readUInt32BE(0);
      const tupleContents: { [key: string]: ClarityValue } = {};
      for (let i = 0; i < tupleLength; i++) {
        const clarityName = LengthPrefixedString.deserialize(bufferReader).content;
        if (clarityName === undefined) {
          throw new Error('"content" is undefined');
        }
        tupleContents[clarityName] = deserializeCV(bufferReader);
      }
      return tupleCV(tupleContents);

    default:
      throw new Error(
        'Unable to deserialize Clarity Value from buffer. Could not find valid Clarity Type.'
      );
  }
}
