import {
  sha256,
  sha512
} from 'sha.js';

import * as RIPEMD160 from 'ripemd160';

import * as randombytes from 'randombytes';

export { randombytes as randomBytes };

export class BufferArray extends Array<Buffer> {
  appendHexString(hexString: string) {
    this.push(Buffer.from(hexString, "hex"));
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

  read(bytes: number, incrementIndex: boolean = true): Buffer {
    let readBuffer = Buffer.alloc(bytes);
    this.buffer.copy(readBuffer, 0, this.index, this.index + bytes);
    if (incrementIndex) {
      this.index += bytes;
    }
    return readBuffer;
  }

  setIndex(index: number) {
    this.index = index;
  }
}

export const leftPadHex = (hexString: string): string => 
  hexString.length % 2 == 0 ? hexString : '0' + hexString;

export const leftPadHexToLength = (hexString: string, length: number): string => 
  hexString.padStart(length, '0');

export const rightPadHexToLength = (hexString: string, length: number): string => 
  hexString.padEnd(length, '0');

// export const bigIntToHexString = (integer: BigInt, lengthBytes: number = 8): string => 
//   integer.toString(16).padStart(lengthBytes * 2, '0');

// export const hexStringToBigInt = (hexString: string): BigInt => BigInt("0x" + hexString);

export const intToHexString = (integer: number, lengthBytes: number = 8): string => 
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
      _ah: 0x22312194, _al: 0xFC2BF72C,
      _bh: 0x9F555FA3, _bl: 0xC84C64C2,
      _ch: 0x2393B86B, _cl: 0x6F53B151,
      _dh: 0x96387719, _dl: 0x5940EABD,
      _eh: 0x96283EE2, _el: 0xA88EFFE3,
      _fh: 0xBE5E1E25, _fl: 0x53863992,
      _gh: 0x2B0199FC, _gl: 0x2C85B8AA,
      _hh: 0x0EB72DDC, _hl: 0x81C52CA2,
    });
  }
  digest(): Buffer;
  digest(encoding: import('crypto').HexBase64Latin1Encoding): string;
  digest(encoding?: import('crypto').HexBase64Latin1Encoding): string | Buffer {
    // "SHA-512/256" truncates the digest to 32 bytes
    const buff = super.digest().slice(0, 32)
    return encoding ? buff.toString(encoding) : buff;
  }
}

export const txidFromData = (data: Buffer): string => {
  return new sha512_256().update(data).digest('hex');
}

export const hash160 = (input: string) => {
  let inputBuffer = Buffer.from(input, 'hex');
  let sha256Result = new sha256().update(inputBuffer).digest('hex');
  return new RIPEMD160().update(Buffer.from(sha256Result, 'hex')).digest('hex');
}

export const hash_p2pkh = (input: string) => {
  return hash160(input);
}
