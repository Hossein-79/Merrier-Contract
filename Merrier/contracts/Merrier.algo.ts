import { Contract } from '@algorandfoundation/tealscript';

type userData = { goal: number; filled: number; balance: number };

// eslint-disable-next-line no-unused-vars
class Merrier extends Contract {
  // Box storages
  userData = BoxMap<Account, userData>();

  // global storages
  appTransactionPercent = GlobalStateKey<number>();

  appBalance = GlobalStateKey<number>();

  // create application method
  createApplication(appPercent: number): void {
    this.appTransactionPercent.value = appPercent;
  }

  // eslint-disable-next-line no-unused-vars
  getMBR(boxMBRPayment: PayTxn): number {
    const preAppMBR = this.app.address.minBalance;
    this.userData(this.txn.sender).value = { goal: 10, filled: 0, balance: 0 };
    const Mbr = this.app.address.minBalance - preAppMBR;
    this.userData(this.txn.sender).delete();
    return Mbr;
  }

  register(boxMBRPayment: PayTxn, goal: number): void {
    assert(!this.userData(this.txn.sender).exists);

    const preAppMBR = this.app.address.minBalance;
    this.userData(this.txn.sender).value = { goal: goal, filled: 0, balance: 0 };

    verifyTxn(boxMBRPayment, {
      receiver: this.app.address,
      amount: this.app.address.minBalance - preAppMBR,
    });
  }

  support(payment: PayTxn, address: Address): void {
    assert(this.userData(address).exists);

    verifyTxn(payment, {
      receiver: this.app.address,
    });

    const appFee = (payment.amount * this.appTransactionPercent.value) / 100;
    assert(appFee > 0);

    const data = this.userData(address).value;
    this.userData(address).value = {
      goal: data.goal,
      filled: data.filled + payment.amount - appFee,
      balance: data.balance + payment.amount - appFee,
    };

    this.appBalance.value = this.appBalance.value + appFee;
  }

  withdraw(amount: number): void {
    assert(this.userData(this.txn.sender).exists);
    assert(this.userData(this.txn.sender).value.balance >= amount);

    sendPayment({
      amount: amount,
      receiver: this.txn.sender,
    });

    const data = this.userData(this.txn.sender).value;
    this.userData(this.txn.sender).value = {
      goal: data.goal,
      filled: data.filled,
      balance: data.balance - amount,
    };
  }

  withdrawAppBalace(): void {
    assert(this.txn.sender === this.app.creator);

    sendPayment({
      amount: this.appBalance.value,
      receiver: this.app.creator,
    });
  }

  getUserData(address: Address): userData {
    const values = this.userData(address).value;

    return values;
  }

  deregister(): void {
    assert(this.userData(this.txn.sender).exists);

    const preAppMBR = this.app.address.minBalance;
    const balance = this.userData(this.txn.sender).value.balance;

    this.userData(this.txn.sender).delete();

    sendPayment({
      amount: balance + preAppMBR - this.app.address.minBalance,
      receiver: this.txn.sender,
    });
  }
}
