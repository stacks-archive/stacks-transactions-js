import { sha256, sha512 } from 'sha.js';

import { ClarityValue, serializeCV } from './clarity';

import * as RIPEMD160 from 'ripemd160';

import * as randombytes from 'randombytes';

// eslint-disable-next-line import/no-unassigned-import
import 'cross-fetch/polyfill';

export { randombytes as randomBytes };

export class BufferArray extends Array<Buffer> {
  appendHexString(hexString: string) {
    this.push(Buffer.from(hexString, 'hex'));
  }

  appendByte(octet: number) {
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new Error(`Value ${octet} is not a valid byte`);
    }
    this.push(Buffer.from([octet]));
  }

  concatBuffer(): Buffer {
    return Buffer.concat(this);
  }
}

export class BufferReader {
  buffer: Buffer;
  index: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.index = 0;
  }

  read(bytes: number, incrementIndex = true): Buffer {
    const readBuffer = Buffer.alloc(bytes);
    this.buffer.copy(readBuffer, 0, this.index, this.index + bytes);
    if (incrementIndex) {
      this.index += bytes;
    }
    return readBuffer;
  }

  readByte(incrementIndex = true): number {
    const val = this.buffer[this.index];
    if (incrementIndex) {
      this.index += 1;
    }
    return val;
  }

  setIndex(index: number) {
    this.index = index;
  }
}

export const leftPadHex = (hexString: string): string =>
  hexString.length % 2 == 0 ? hexString : `0${hexString}`;

export const leftPadHexToLength = (hexString: string, length: number): string =>
  hexString.padStart(length, '0');

export const rightPadHexToLength = (hexString: string, length: number): string =>
  hexString.padEnd(length, '0');

export const intToHexString = (integer: number, lengthBytes = 8): string =>
  integer.toString(16).padStart(lengthBytes * 2, '0');

export const hexStringToInt = (hexString: string): number => parseInt(hexString, 16);

export const exceedsMaxLengthBytes = (string: string, maxLengthBytes: number): boolean =>
  string ? Buffer.from(string).length > maxLengthBytes : false;

export class sha512_256 extends sha512 {
  constructor() {
    super();
    // set the "SHA-512/256" initialization vector
    // see https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
    Object.assign(this, {
      _ah: 0x22312194,
      _al: 0xfc2bf72c,
      _bh: 0x9f555fa3,
      _bl: 0xc84c64c2,
      _ch: 0x2393b86b,
      _cl: 0x6f53b151,
      _dh: 0x96387719,
      _dl: 0x5940eabd,
      _eh: 0x96283ee2,
      _el: 0xa88effe3,
      _fh: 0xbe5e1e25,
      _fl: 0x53863992,
      _gh: 0x2b0199fc,
      _gl: 0x2c85b8aa,
      _hh: 0x0eb72ddc,
      _hl: 0x81c52ca2,
    });
  }
  digest(): Buffer;
  digest(encoding: import('crypto').HexBase64Latin1Encoding): string;
  digest(encoding?: import('crypto').HexBase64Latin1Encoding): string | Buffer {
    // "SHA-512/256" truncates the digest to 32 bytes
    const buff = super.digest().slice(0, 32);
    return encoding ? buff.toString(encoding) : buff;
  }
}

export const txidFromData = (data: Buffer): string => new sha512_256().update(data).digest('hex');

export const hash160 = (input: string) => {
  const inputBuffer = Buffer.from(input, 'hex');
  const sha256Result = new sha256().update(inputBuffer).digest('hex');
  return new RIPEMD160().update(Buffer.from(sha256Result, 'hex')).digest('hex');
};

export const hash_p2pkh = (input: string) => {
  return hash160(input);
};

export function isClarityName(name: string) {
  const regex = /^[a-zA-Z]([a-zA-Z0-9]|[-_!?+<>=/*])*$|^[-+=/*]$|^[<>]=?$/;
  return regex.test(name) && name.length < 128;
}

/** @ignore */
export async function fetchPrivate(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const defaultFetchOpts: RequestInit = {
    referrer: 'no-referrer',
    referrerPolicy: 'no-referrer',
  };
  const fetchOpts = Object.assign(defaultFetchOpts, init);
  // eslint-disable-next-line no-restricted-globals
  const fetchResult = await fetch(input, fetchOpts);
  return fetchResult;
}

export function cvToHex(cv: ClarityValue) {
  const serialized = serializeCV(cv);
  return `0x${serialized.toString('hex')}`;
}
