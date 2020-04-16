import { StacksTransaction } from './transaction';

import { StacksPrivateKey } from './keys';

export class TransactionSigner {
  transaction: StacksTransaction;
  sigHash: string;
  originDone: boolean;
  checkOversign: boolean;
  checkOverlap: boolean;

  constructor(transaction: StacksTransaction) {
    this.transaction = transaction;
    this.sigHash = transaction.signBegin();
    this.originDone = false;
    this.checkOversign = true;
    this.checkOverlap = true;
  }

  signOrigin(privateKey: StacksPrivateKey) {
    if (this.checkOverlap && this.originDone) {
      throw Error('Cannot sign origin after sponsor key');
    }

    if (this.transaction.auth === undefined) {
      throw new Error('"transaction.auth" is undefined');
    }
    if (this.transaction.auth.spendingCondition === undefined) {
      throw new Error('"transaction.auth.spendingCondition" is undefined');
    }
    if (this.transaction.auth.spendingCondition.signaturesRequired === undefined) {
      throw new Error('"transaction.auth.spendingCondition.signaturesRequired" is undefined');
    }

    if (
      this.checkOversign &&
      this.transaction.auth.spendingCondition.numSignatures() >=
        this.transaction.auth.spendingCondition.signaturesRequired
    ) {
      throw new Error('Origin would have too many signatures');
    }

    const nextSighash = this.transaction.signNextOrigin(this.sigHash, privateKey);
    this.sigHash = nextSighash;
  }
}
