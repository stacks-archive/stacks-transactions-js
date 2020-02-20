import {
  sha512
} from 'sha.js';

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

  constructor(buffer?: Buffer) {
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

export const Sha512Trunc256sum = (input: string): string => {
  let digest = new sha512().update(input).digest('hex').substring(0, 64);
  return digest;
}

export const leftPadHex = (hexString: string): string => 
  hexString.length % 2 == 0 ? hexString : '0' + hexString;

export const bigIntToHexString = (integer: BigInt, lengthBytes: number = 8): string => 
  integer.toString(16).padStart(lengthBytes * 2, '0');

export const hexStringToBigInt = (hexString: string): BigInt => BigInt("0x" + hexString);

export const intToHexString = (integer: number, lengthBytes: number = 8): string => 
  integer.toString(16).padStart(lengthBytes * 2, '0');

export const hexStringToInt = (hexString: string): number => parseInt(hexString, 16);

export const exceedsMaxLengthBytes = (string: string, maxLengthBytes: number): boolean => 
  string ? Buffer.from(string).length > maxLengthBytes : false;
