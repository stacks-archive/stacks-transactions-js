import { StacksPublicKey, StacksPrivateKey } from '../../src/keys';

import { serializeDeserialize } from './macros';

test('Stacks public key and private keys', () => {
  const privKeyString = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc';
  const pubKeyString =
    '04ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab' +
    '5b435d20ea91337cdd8c30dd7427bb098a5355e9c9bfad43797899b8137237cf';
  const pubKey = StacksPublicKey.fromPrivateKey(privKeyString);
  expect(pubKey.toString()).toBe(pubKeyString);

  const deserialized = serializeDeserialize(pubKey, StacksPublicKey);
  expect(deserialized.toString()).toBe(pubKeyString);

  const privKey = new StacksPrivateKey(privKeyString);
  expect(privKey.getPublicKey().toString()).toBe(pubKeyString);

  const randomKey = StacksPrivateKey.makeRandom();
  expect(randomKey.toString().length).toEqual(64);
});



