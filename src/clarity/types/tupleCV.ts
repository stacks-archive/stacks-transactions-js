import { ClarityType, ClarityValue } from '../clarityValue';
import { isClarityName } from '../../utils';

type TupleData = { [key: string]: ClarityValue };

interface TupleCV {
  type: ClarityType.Tuple;
  data: TupleData;
}

function tupleCV(data: TupleData): TupleCV {
  for (const key in data) {
    if (!isClarityName(key)) {
      throw new Error(`"${key}" is not a valid Clarity name`);
    }
  }

  const ordered: TupleData = {};
  Object.keys(data)
    .sort((a, b) => {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      return bufA.compare(bufB);
    })
    .forEach(key => {
      ordered[key] = data[key];
    });

  return { type: ClarityType.Tuple, data: ordered };
}

export { TupleCV, tupleCV };
