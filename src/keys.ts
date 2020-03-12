import {
  COMPRESSED_PUBKEY_LENGTH_BYTES,
  UNCOMPRESSED_PUBKEY_LENGTH_BYTES
} from './constants'

import {
  BufferArray,
  BufferReader,
  leftPadHexToLength,
  intToHexString,
  randomBytes
} from './utils';

import { 
  ec as EC
} from 'elliptic';

import {
  StacksMessage
} from './message'

import {
  MessageSignature
} from './authorization';

export class StacksPublicKey extends StacksMessage {
  data: Buffer;

  constructor(key?: string) {
    super();
    this.data = key && Buffer.from(key, 'hex');
  }

  static fromPrivateKey(privateKey: string): StacksPublicKey {
    let privKey = new StacksPrivateKey(privateKey);
    let ec = new EC('secp256k1');
    let keyPair = ec.keyFromPrivate(privKey.data.toString('hex').slice(0, 64), 'hex');
    let pubKey = keyPair.getPublic(privKey.compressed, 'hex');
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
  compressed: boolean;

  constructor(key?: string) {
    if (key.length === 66) {
      if (key.slice(64) !== '01') {
        throw new Error('Improperly formatted private-key hex string. 66-length hex usually '
                        + 'indicates compressed key, but last byte must be == 1')
      }
      this.compressed = true;  
    } else if (key.length === 64) {
      this.compressed = false;
    } else {
      throw new Error('Improperly formatted private-key hex string: length should be 64 or 66.')
    }

    this.data = Buffer.from(key, 'hex');
  }

  static makeRandom(): StacksPrivateKey {
    let ec = new EC('secp256k1');
    let options = { entropy: randomBytes(32) };
    let keyPair = ec.genKeyPair(options);
    let privateKey = keyPair.getPrivate().toString('hex');
    return new StacksPrivateKey(privateKey);
  }

  sign(input: string): MessageSignature {
    let ec = new EC('secp256k1');
    let key = ec.keyFromPrivate(this.data.toString('hex').slice(0, 64), 'hex');
    let signature = key.sign(input, 'hex', { canonical: true });
    let coordinateValueBytes = 32;
    let r = leftPadHexToLength(signature.r.toString('hex'), coordinateValueBytes * 2);
    let s = leftPadHexToLength(signature.s.toString('hex'), coordinateValueBytes * 2);
    let recoveryParam = intToHexString(signature.recoveryParam, 1);
    let recoverableSignatureString = recoveryParam + r + s;
    let recoverableSignature = new MessageSignature(recoverableSignatureString);
    return recoverableSignature;
  }

  getPublicKey(): StacksPublicKey {
    return StacksPublicKey.fromPrivateKey(this.data.toString('hex'));
  }

  toString(): string {
    return this.data.toString("hex");
  }
}