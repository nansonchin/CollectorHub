import { randomUUID } from "crypto";
import { PaymentProvider } from "./payment-provider";
import { TEST_CARDS } from "./payments.config";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fakeProvider: PaymentProvider = {
  async charge({ testCard }) {
    await wait(900);

    const { outcome } = TEST_CARDS[testCard];
    if (outcome === "success") {
      return {
        ok: true,
        transactionId: `txn_fake_${randomUUID().slice(0, 12)}`,
      };
    }
    return {
      ok: false,
      reason:
        outcome === "declined"
          ? "Your card was declined."
          : "Your card has insufficient funds.",
    };
  },
};
