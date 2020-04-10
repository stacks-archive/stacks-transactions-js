import {
  COMPRESSED_PUBKEY_LENGTH_BYTES,
  UNCOMPRESSED_PUBKEY_LENGTH_BYTES,
  StacksMessageType,
} from './constants';

import { BufferArray, leftPadHexToLength, intToHexString, randomBytes } from './utils';

import { ec as EC } from 'elliptic';

import { MessageSignature } from './authorization';
import { BufferReader } from './binaryReader';

export interface StacksPublicKey {
  readonly type: StacksMessageType.PublicKey;
  readonly data: Buffer;
}

export function stacksPublicKey(key: string): StacksPublicKey {
  return {
    type: StacksMessageType.PublicKey,
    data: Buffer.from(key, 'hex'),
  };
}

export function publicKeyFromBuffer(data: Buffer): StacksPublicKey {
  return { type: StacksMessageType.PublicKey, data };
}

export function isCompressed(key: StacksPublicKey): boolean {
  return !key.data.toString('hex').startsWith('04');
}

export function publicKeyToString(key: StacksPublicKey): string {
  return key.data.toString('hex');
}

export function serializePublicKey(key: StacksPublicKey): Buffer {
  const bufferArray: BufferArray = new BufferArray();
  bufferArray.push(key.data);
  return bufferArray.concatBuffer();
}

export function fromPrivateKey(privateKey: string): StacksPublicKey {
  const privKey = new StacksPrivateKey(privateKey);
  const ec = new EC('secp256k1');
  const keyPair = ec.keyFromPrivate(privKey.data.toString('hex').slice(0, 64), 'hex');
  const pubKey = keyPair.getPublic(privKey.compressed, 'hex');
  return stacksPublicKey(pubKey);
}

export function deserializePublicKey(bufferReader: BufferReader): StacksPublicKey {
  const compressed = !(bufferReader.readBuffer(1).toString('hex') === '04');
  bufferReader.readOffset = 0;
  const keyLength = compressed ? COMPRESSED_PUBKEY_LENGTH_BYTES : UNCOMPRESSED_PUBKEY_LENGTH_BYTES;
  return publicKeyFromBuffer(bufferReader.readBuffer(keyLength + 1));
}

export class StacksPrivateKey {
  data: Buffer;
  compressed: boolean;

  constructor(key: string) {
    if (key.length === 66) {
      if (!key.endsWith('01')) {
        throw new Error(
          'Improperly formatted private-key hex string. 66-length hex usually ' +
            'indicates compressed key, but last byte must be == 1'
        );
      }
      this.compressed = true;
    } else if (key.length === 64) {
      this.compressed = false;
    } else {
      throw new Error(
        `Improperly formatted private-key hex string: length should be 64 or 66, provided with length ${key.length}`
      );
    }

    this.data = Buffer.from(key, 'hex');
  }

  static makeRandom(): StacksPrivateKey {
    const ec = new EC('secp256k1');
    const options = { entropy: randomBytes(32) };
    const keyPair = ec.genKeyPair(options);
    const privateKey = keyPair.getPrivate().toString('hex', 32);
    return new StacksPrivateKey(privateKey);
  }

  sign(input: string): MessageSignature {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPrivate(this.data.toString('hex').slice(0, 64), 'hex');
    const signature = key.sign(input, 'hex', { canonical: true });
    const coordinateValueBytes = 32;
    const r = leftPadHexToLength(signature.r.toString('hex'), coordinateValueBytes * 2);
    const s = leftPadHexToLength(signature.s.toString('hex'), coordinateValueBytes * 2);
    if (signature.recoveryParam === undefined || signature.recoveryParam === null) {
      throw new Error('"signature.recoveryParam" is not set');
    }
    const recoveryParam = intToHexString(signature.recoveryParam, 1);
    const recoverableSignatureString = recoveryParam + r + s;
    const recoverableSignature = new MessageSignature(recoverableSignatureString);
    return recoverableSignature;
  }

  getPublicKey(): StacksPublicKey {
    return fromPrivateKey(this.data.toString('hex'));
  }

  toString(): string {
    return this.data.toString('hex');
  }
}
