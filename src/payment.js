import { PublicKey } from "@solana/web3.js";

export const NETWORK = "devnet";
export const DEVNET_RPC = "https://api.devnet.solana.com";
export const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const USDC_DECIMALS = 6;

// The treasury is intentionally configured outside the client.
// The server will release USDC only after a creator approves a submission.
export const PAYMENT_STATES = Object.freeze({
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
});

export function usdcToBaseUnits(amount) {
  return Math.round(Number(amount) * 10 ** USDC_DECIMALS);
}

export function createPaymentIntent({ submissionId, contributor, amount }) {
  if (!submissionId || !contributor || !amount) {
    throw new Error("submissionId, contributor and amount are required");
  }

  return {
    submissionId,
    contributor,
    amountUSDC: Number(amount),
    amountBaseUnits: usdcToBaseUnits(amount),
    mint: DEVNET_USDC_MINT.toBase58(),
    network: NETWORK,
    releaseCondition: "APPROVED",
    status: "PENDING_APPROVAL",
  };
}
