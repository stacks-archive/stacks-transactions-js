import { StacksMessage } from '../../src/message';

import { BufferReader } from '../../src/utils';

export function serializeDeserialize<T extends StacksMessage>(model: T, type: new () => T) {
  const serializedBuffer = model.serialize();
  const bufferReader = new BufferReader(serializedBuffer);
  const deserialized = new type();
  deserialized.deserialize(bufferReader);
  return deserialized;
}
