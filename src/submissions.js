export const SUBMISSION_STATUS = Object.freeze({
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER REVIEW",
  APPROVED: "APPROVED",
  PAYOUT_PENDING: "PAYOUT PENDING",
  PAID: "PAID",
  REJECTED: "REJECTED",
});

export function buildSubmission({ mission, contributor, proof }) {
  if (!mission?.id) throw new Error("mission is required");
  if (!contributor) throw new Error("contributor wallet is required");

  return {
    id: `submission_${mission.id}_${Date.now()}`,
    missionId: mission.id,
    missionTitle: mission.title,
    rewardUSDC: mission.reward,
    contributor,
    proof: {
      type: proof?.type || mission.proof,
      uri: proof?.uri || null,
      note: proof?.note || "",
    },
    status: SUBMISSION_STATUS.UNDER_REVIEW,
    submittedAt: new Date().toISOString(),
    approvedAt: null,
    paidAt: null,
    transactionSignature: null,
  };
}

export function approveSubmission(submission) {
  if (!submission || submission.status !== SUBMISSION_STATUS.UNDER_REVIEW) {
    throw new Error("Only the host can approve submissions under review");
  }

  return {
    ...submission,
    status: SUBMISSION_STATUS.APPROVED,
    approvedAt: new Date().toISOString(),
  };
}

export function rejectSubmission(submission) {
  if (!submission || submission.status !== SUBMISSION_STATUS.UNDER_REVIEW) {
    throw new Error("Only the host can reject submissions under review");
  }

  return {
    ...submission,
    status: SUBMISSION_STATUS.REJECTED,
  };
}
