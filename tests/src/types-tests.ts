import { Address, LengthPrefixedString, LengthPrefixedList, AssetInfo } from '../../src/types';

import { TransactionVersion, AddressHashMode } from '../../src/constants';

import { serializeDeserialize } from './macros';

import { BufferReader } from '../../src/utils';

test('Length prefixed strings serialization and deserialization', () => {
  const testString = 'test message string';
  const lpString = new LengthPrefixedString(testString);
  const deserialized = serializeDeserialize(lpString, LengthPrefixedString);
  expect(deserialized.content).toBe(testString);

  const longTestString = 'a'.repeat(129);
  const longString = new LengthPrefixedString(longTestString);

  expect(() => longString.serialize()).toThrow('String length exceeds maximum bytes 128');
});

test('Length prefixed list serialization and deserialization', () => {
  const addressList = [
    new Address('SP9YX31TK12T0EZKWP3GZXX8AM37JDQHAWM7VBTH'),
    new Address('SP26KJ60PHEBVMJ7DD515T3VEMM4XWJG7GMWSDFC2'),
    new Address('SP3ZZXBQXNA8296BV0D6W38FK3SK0XWM26EFT4M8C'),
    new Address('SP3E6KW7QVBBGBZDSNWWPX9672Z4MZPRRM2X68KKM'),
    new Address('SP15ZKFY43G0P3XBW95RHK82PYDT8B38QYFRY75EV'),
  ];

  const lpList = new LengthPrefixedList<Address>();
  for (let index = 0; index < addressList.length; index++) {
    lpList.push(addressList[index]);
  }
  const serialized = lpList.serialize();

  const bufferReader = new BufferReader(serialized);
  const deserialized = LengthPrefixedList.deserialize(bufferReader, Address);

  expect(deserialized.length).toBe(addressList.length);

  for (let index = 0; index < addressList.length; index++) {
    expect(deserialized[index].toString()).toBe(addressList[index].toString());
  }
});

test('C32 address hash mode - testnet P2PKH', () => {
  const address = Address.fromHashMode(
    AddressHashMode.SerializeP2PKH,
    TransactionVersion.Testnet,
    'c22d24fec5d06e539c551e732a5ba88997761ba0'
  ).toString();
  const expected = 'ST312T97YRQ86WMWWAMF76AJVN24SEXGVM1Z5EH0F';
  expect(address).toBe(expected);
});

test('C32 address hash mode - mainnet P2PKH', () => {
  const address = Address.fromHashMode(
    AddressHashMode.SerializeP2PKH,
    TransactionVersion.Mainnet,
    'b976e9f5d6181e40bed7fa589142dfcf2fb28d8e'
  ).toString();
  const expected = 'SP2WQDTFNTRC1WG5YTZX5H4A2VZ7JZCMDHV3PQATJ';
  expect(address).toBe(expected);
});

test('C32 address hash mode - mainnet P2SH', () => {
  const address = Address.fromHashMode(
    AddressHashMode.SerializeP2SH,
    TransactionVersion.Mainnet,
    '55011fc38a7e12f7d00496aef7a1c4b6dfeba81b'
  ).toString();
  const expected = 'SM1AG27Y3H9Z15XYG0JBAXXX1RJVDZTX83FA1DDSJ';
  expect(address).toBe(expected);
});

test('C32 address hash mode - testnet P2SH', () => {
  const address = Address.fromHashMode(
    AddressHashMode.SerializeP2SH,
    TransactionVersion.Testnet,
    '55011fc38a7e12f7d00496aef7a1c4b6dfeba81b'
  ).toString();
  const expected = 'SN1AG27Y3H9Z15XYG0JBAXXX1RJVDZTX83DE2F6ME';
  expect(address).toBe(expected);
});

test('C32check addresses serialization and deserialization', () => {
  const c32AddressString = 'SP9YX31TK12T0EZKWP3GZXX8AM37JDQHAWM7VBTH';
  const address = new Address(c32AddressString);
  const deserialized = serializeDeserialize(address, Address);
  expect(deserialized.toString()).toBe(c32AddressString);
});

test('Asset info serialization and deserialization', () => {
  const assetAddress = 'SP2ZP4GJDZJ1FDHTQ963F0292PE9J9752TZJ68F21';
  const assetContractName = 'contract_name';
  const assetName = 'asset_name';
  const assetInfo = new AssetInfo(assetAddress, assetContractName, assetName);
  const deserialized = serializeDeserialize(assetInfo, AssetInfo);
  expect(deserialized.address.toString()).toBe(assetAddress);
  expect(deserialized.contractName.toString()).toBe(assetContractName);
  expect(deserialized.assetName.toString()).toBe(assetName);
});
