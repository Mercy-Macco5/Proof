import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";

export const APP_IDENTITY = {
  name: "PROOF",
  uri: "https://proof.app",
  icon: "favicon.ico",
};

export async function connectWallet() {
  return transact(async (wallet) => {
    const result = await wallet.authorize({
      chain: "solana:devnet",
      identity: APP_IDENTITY,
    });

    const account = result.accounts?.[0];
    if (!account) throw new Error("No wallet account returned");

    return account.address;
  });
}
