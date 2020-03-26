import { ClarityType, ClarityValue } from '../clarityValue';
import { isClarityName } from '../../utils';

interface TupleCV {
  type: ClarityType.Tuple;
  data: { [key: string]: ClarityValue };
}

function tupleCV(data: { [key: string]: ClarityValue }): TupleCV {
  for (const key in data) {
    if (!isClarityName(key)) {
      throw new Error(`"${key}" is not a valid Clarity name`);
    }
  }
  return { type: ClarityType.Tuple, data };
}

export { TupleCV, tupleCV };
