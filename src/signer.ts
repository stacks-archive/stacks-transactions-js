import {
  StacksTransaction
} from './transaction';

import {
  AuthType
} from './constants';

export class TransactionSigner {
  transaction: StacksTransaction;
  sigHash: string;
  originDone: boolean;
  checkOversign: boolean;
  checkOverlap: boolean;

  constructor(
    transaction: StacksTransaction
  ) {
    this.sigHash = transaction.signBegin();
    this.originDone = false;
    this.checkOversign = true;
    this.checkOverlap = true;
  }

  signOrigin(privateKey: string) {
    if (this.checkOverlap && this.originDone) {
      throw Error("Cannot sign origin after sponsor key");
    }

    if (this.checkOversign && this.transaction.auth.spendingCondition.numSignatures() 
      >= this.transaction.auth.spendingCondition.signaturesRequired) {
        throw new Error('Origin would have too many signatures');
    }

    let nextSighash = this.transaction.signNextOrigin(this.sigHash, privateKey);
    this.sigHash = nextSighash;
  }
}