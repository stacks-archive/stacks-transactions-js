import {
  COMPRESSED_PUBKEY_LENGTH_BYTES,
  UNCOMPRESSED_PUBKEY_LENGTH_BYTES
} from './constants'

import {
  BufferArray,
  BufferReader
} from './utils';

import { 
  ec as EC
} from 'elliptic';

import {
  StacksMessage
} from './message'

export class StacksPublicKey extends StacksMessage {
  data: Buffer;

  constructor(key?: string) {
    super();
    this.data = key && Buffer.from(key, 'hex');
  }

  static fromPrivateKey(privateKey: string): StacksPublicKey {
    let ec = new EC('secp256k1');
    let keyPair = ec.keyFromPrivate(privateKey, 'hex');
    let pubKey = keyPair.getPublic(true, 'hex');
    return new StacksPublicKey(pubKey);
  }

  compressed(): boolean {
    return !this.data.toString('hex').startsWith("04");
  }

  toString(): string {
    return this.data.toString('hex');
  }

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();
    bufferArray.push(this.data);
    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    let compressed = !(bufferReader.read(1, false).toString('hex') === "04");
    let keyLength = compressed ? COMPRESSED_PUBKEY_LENGTH_BYTES : UNCOMPRESSED_PUBKEY_LENGTH_BYTES
    this.data = bufferReader.read(keyLength + 1);
  }
}

export class StacksPrivateKey {
  data: Buffer;

  constructor(key?: string) {
    this.data = Buffer.from(key, 'hex');
  }

  getPublicKey(): StacksPublicKey {
    return StacksPublicKey.fromPrivateKey(this.data.toString('hex'));
  }

  toString(): string {
    return this.data.toString("hex");
  }
}