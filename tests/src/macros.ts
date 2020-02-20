import {
  StacksMessage
} from '../../src/message';

import {
  BufferReader
} from '../../src/utils';

export function serializeDeserialize<T extends StacksMessage>(model: T, type: new () => T) {
  let serializedBuffer = model.serialize();
  let bufferReader = new BufferReader(serializedBuffer);
  let deserialized = new type();
  deserialized.deserialize(bufferReader);
  return deserialized;
}