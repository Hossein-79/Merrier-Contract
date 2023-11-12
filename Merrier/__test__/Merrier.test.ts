import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import algosdk from 'algosdk';
import * as algokit from '@algorandfoundation/algokit-utils';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import { algos, getOrCreateKmdWalletAccount } from '@algorandfoundation/algokit-utils';
import { MerrierClient } from '../contracts/clients/MerrierClient';

const fixture = algorandFixture();

let appClient: MerrierClient;

describe('Merrier', () => {
  let algod: algosdk.Algodv2;
  let sender: algosdk.Account;
  let senderOther: algosdk.Account;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();

    const { testAccount, kmd } = fixture.context;
    algod = fixture.context.algod;

    sender = await getOrCreateKmdWalletAccount(
      {
        name: 'tealscript-dao-sender',
        fundWith: algos(100),
      },
      algod,
      kmd
    );

    senderOther = await getOrCreateKmdWalletAccount(
      {
        name: 'tealscript-dao-sender2',
        fundWith: algos(1000),
      },
      algod,
      kmd
    );

    appClient = new MerrierClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await appClient.create.createApplication({ appPercent: 5 });
  });

  test('getmbr', async () => {
    const { appAddress } = await appClient.appClient.getAppReference();

    const boxMBRPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      amount: 100000,
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    const proposalFromMethod = await appClient.getMbr(
      { boxMBRPayment },
      { sender, boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
    expect(proposalFromMethod.return?.valueOf()).toBe(BigInt(24_900));
  });

  test('create a goal', async () => {
    const { appAddress } = await appClient.appClient.getAppReference();

    const boxMBRPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      amount: 24_900,
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await appClient.register(
      { boxMBRPayment, goal: 100_000 },
      { sender, boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
  });

  test('support', async () => {
    const { appAddress } = await appClient.appClient.getAppReference();

    const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: senderOther.addr,
      to: appAddress,
      amount: 1000,
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await appClient.support(
      { payment, address: sender.addr },
      { sender: senderOther, boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
  });

  test('withdraw', async () => {
    const firstValues = await appClient.getUserData(
      { address: sender.addr },
      { boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
    expect(firstValues.return?.map((value: BigInt) => value.valueOf())).toEqual([
      BigInt(100000), // Goal
      BigInt(950), // Filled
      BigInt(950), // Balance
    ]);

    await appClient.withdraw(
      { amount: 100 },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
        boxes: [algosdk.decodeAddress(sender.addr).publicKey],
      }
    );

    const userValues = await appClient.getUserData(
      { address: sender.addr },
      { boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
    expect(userValues.return?.map((value: BigInt) => value.valueOf())).toEqual([
      BigInt(100000), // Goal
      BigInt(950), // Filled
      BigInt(850), // Balance
    ]);
  });

  test('withdraw app balance', async () => {
    await appClient.withdrawAppBalace(
      {},
      {
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );
  });

  test('deregister', async () => {
    await appClient.deregister(
      {},
      { sender, sendParams: { fee: algokit.microAlgos(2_000) }, boxes: [algosdk.decodeAddress(sender.addr).publicKey] }
    );
  });
});
