import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from "@solana/spl-token";
import { DEVNET_USDC_MINT, USDC_DECIMALS, usdcToBaseUnits } from "./payment";

export function buildApprovedPayout({ hostWallet, contributorWallet, amount }) {
  if (!hostWallet || !contributorWallet || !amount) {
    throw new Error("host wallet, contributor wallet and amount are required");
  }

  const host = new PublicKey(hostWallet);
  const contributor = new PublicKey(contributorWallet);

  return {
    mint: DEVNET_USDC_MINT.toBase58(),
    decimals: USDC_DECIMALS,
    amountUSDC: Number(amount),
    amountBaseUnits: usdcToBaseUnits(amount),
    sourceOwner: host.toBase58(),
    destinationOwner: contributor.toBase58(),
    sourceTokenAccount: null,
    destinationTokenAccount: null,
    instruction: createTransferCheckedInstruction,
    getAccounts: async () => ({
      source: (await getAssociatedTokenAddress(DEVNET_USDC_MINT, host)).toBase58(),
      destination: (await getAssociatedTokenAddress(DEVNET_USDC_MINT, contributor)).toBase58(),
    }),
    status: "APPROVED_AWAITING_SIGNATURE",
  };
}
