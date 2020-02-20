import {
  BufferReader
} from './utils';

export interface StacksMessageCodec {
  serialize(): Buffer;
  deserialize(bufferReader: BufferReader): void;
}

export abstract class StacksMessage {
  abstract serialize(): Buffer;
  abstract deserialize(bufferReader: BufferReader): void;
  static deserialize<T extends StacksMessage>(this: new () => T, bufferReader: BufferReader): T {
    let message = new this();
    message.deserialize(bufferReader);
    return message;
  }
}