import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { APP_IDENTITY, connectWallet } from "./src/wallet";
import { createPaymentIntent, PAYMENT_STATES } from "./src/payment";
import { StatusBar } from "expo-status-bar";

const MISSIONS = [
  { id: "video", type: "CREATE", title: "Make a 30-second product video", description: "Create a short product video that shows the product clearly and naturally.", reward: 5, proof: "Video" },
  { id: "photo", type: "SHOW", title: "Take a campaign photo", description: "Visit the listed location and submit a clear photo of the campaign poster.", reward: 8, proof: "Photo" },
  { id: "review", type: "WRITE", title: "Write a short product review", description: "Write a useful, honest review explaining what stands out about the product.", reward: 3, proof: "Text" }
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [selectedMission, setSelectedMission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  useEffect(() => { AsyncStorage.getItem("proof_submissions").then((raw) => { if (raw) setSubmissions(JSON.parse(raw)); }).catch(() => {}); }, []);
  useEffect(() => { AsyncStorage.setItem("proof_submissions", JSON.stringify(submissions)).catch(() => {}); }, [submissions]);
  const [earned, setEarned] = useState(23.5);
  const [wallet, setWallet] = useState(null);
  const [role, setRole] = useState("contributor");
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionReward, setNewMissionReward] = useState("");
  const [newMissionProof, setNewMissionProof] = useState("Video");
  const [proofAsset, setProofAsset] = useState(null);

  async function handleConnect() {
    try {
      const account = await connectWallet();
      setWallet(account);
    } catch (error) {
      console.log("Wallet connection cancelled or failed", error);
    }
  }

  const selectedStatus = useMemo(() => {
    if (!selectedMission) return null;
    return submissions.find((item) => item.missionId === selectedMission.id)?.status;
  }, [selectedMission, submissions]);

  function openMission(mission) {
    setSelectedMission(mission);
    setScreen("mission");
  }

  function submitMission() {
    if (!selectedMission) return;
    setSubmissions((current) => [
      ...current.filter((item) => item.missionId !== selectedMission.id),
      { missionId: selectedMission.id, status: PAYMENT_STATES.UNDER_REVIEW, paid: false, proof: proofAsset ? { uri: proofAsset.uri, type: proofAsset.type || "image", width: proofAsset.width, height: proofAsset.height } : null }
    ]);
    setProofAsset(null);
    setScreen("submitted");
  }

  async function pickProof() {
    if (!selectedMission) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.8 });
  }

  function approveDemo() {
    if (!selectedMission) return;
    setSubmissions((current) => current.map((item) =>
      item.missionId === selectedMission.id ? { ...item, status: PAYMENT_STATES.PAID, paid: true, paymentIntent: createPaymentIntent({ submissionId: selectedMission.id, contributor: wallet || "demo-wallet", amount: selectedMission.reward }) } : item
    ));
    setEarned((value) => value + selectedMission.reward);
    setScreen("approved");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen("home")}><Text style={styles.logo}>PROOF</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen(role === "host" ? "hostDashboard" : "profile")}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{role === "host" ? "H" : "M"}</Text></View>
          </TouchableOpacity>
        </View>

        {screen === "home" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>GOOD WORK DESERVES</Text>
              <Text style={styles.heroTitle}>Good proof.</Text>
              <Text style={styles.heroCopy}>Complete real missions, submit proof, and get paid when your work is approved.</Text>
              <TouchableOpacity style={styles.walletButton} onPress={handleConnect}>
                <Text style={styles.walletButtonText}>{wallet ? "WALLET CONNECTED" : "CONNECT WALLET"}</Text>
              </TouchableOpacity>
              {wallet && <Text style={styles.walletAddress}>{wallet.slice(0, 6)}...{wallet.slice(-6)}</Text>}
            </View>
            <View style={styles.stats}>
              <Stat label="EARNED" value={"$" + earned.toFixed(2)} />
              <Stat label="CONTRIBUTIONS" value="12" />
              <Stat label="VERIFIED" value="91%" />
            </View>
            <TouchableOpacity style={styles.roleSwitch} onPress={() => setRole(role === "host" ? "contributor" : "host")}><Text style={styles.roleSwitchText}>{role === "host" ? "SWITCH TO CONTRIBUTOR" : "HOST REVIEW"}</Text></TouchableOpacity>
            <Text style={styles.sectionTitle}>AVAILABLE</Text>
            {MISSIONS.map((mission) => <MissionCard key={mission.id} mission={mission} onPress={() => openMission(mission)} />)}
          </ScrollView>
        )}

        {screen === "mission" && selectedMission && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => setScreen("home")}><Text style={styles.back}>← AVAILABLE MISSIONS</Text></TouchableOpacity>
            <View style={styles.detail}>
              <Text style={styles.eyebrow}>{selectedMission.type}</Text>
              <Text style={styles.detailTitle}>{selectedMission.title}</Text>
              <Text style={styles.detailCopy}>{selectedMission.description}</Text>
              <View style={styles.rewardBox}>
                <Text style={styles.rewardLabel}>REWARD</Text>
                <Text style={styles.rewardValue}>{selectedMission.reward} USDC</Text>
              </View>
              <View style={styles.ruleBox}>
                <Text style={styles.ruleTitle}>PAYMENT RULE</Text>
                <Text style={styles.ruleText}>Payment is released only after your submission is approved.</Text>
              </View>
              {selectedStatus ? <StatusPill status={selectedStatus} /> : <>
                <TouchableOpacity style={styles.primary} onPress={pickProof}><Text style={styles.primaryText}>CAPTURE PROOF</Text></TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={submitMission}><Text style={styles.secondaryText}>SUBMIT DEMO PROOF</Text></TouchableOpacity>
              </>}
            </View>
          </ScrollView>
        )}

        {screen === "submitted" && (
          <View style={styles.center}>
            <Text style={styles.successMark}>✓</Text>
            <Text style={styles.centerTitle}>Under review.</Text>
            <Text style={styles.centerCopy}>Your proof was submitted. It is now waiting for host approval. No payment has been released.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setScreen("reviewDashboard")}><Text style={styles.primaryText}>VIEW REVIEW FLOW</Text></TouchableOpacity>
          </View>
        )}

        {screen === "hostDashboard" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>HOST</Text>
            <Text style={styles.detailTitle}>Run a campaign.</Text>
            <Text style={styles.detailCopy}>Create paid missions and review the work creators send back.</Text>
            <View style={styles.hostStats}>
              <View><Text style={styles.statNumber}>{MISSIONS.length}</Text><Text style={styles.statLabel}>MISSIONS</Text></View>
              <View><Text style={styles.statNumber}>{submissions.length}</Text><Text style={styles.statLabel}>SUBMISSIONS</Text></View>
              <View><Text style={styles.statNumber}>{submissions.filter((s) => s.status === PAYMENT_STATES.UNDER_REVIEW).length}</Text><Text style={styles.statLabel}>TO REVIEW</Text></View>
            </View>
            <TouchableOpacity style={styles.primary} onPress={() => setScreen("createMission")}><Text style={styles.primaryText}>CREATE MISSION</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setScreen("reviewDashboard")}><Text style={styles.secondaryText}>REVIEW SUBMISSIONS</Text></TouchableOpacity>
          </ScrollView>
        )}

        {screen === "createMission" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>NEW MISSION</Text>
            <Text style={styles.detailTitle}>Give creators a clear brief.</Text>
            <Text style={styles.detailCopy}>Set the work, reward, and proof required. Payment stays locked until you approve the submission.</Text>
            <View style={styles.formBox}>
              <Text style={styles.formLabel}>MISSION TITLE</Text>
              <TextInput style={styles.input} placeholder="e.g. Create a 30-second product video" placeholderTextColor="#99938A" value={newMissionTitle} onChangeText={setNewMissionTitle} />
              <Text style={styles.formLabel}>REWARD (USDC)</Text>
              <TextInput style={styles.input} placeholder="5" placeholderTextColor="#99938A" keyboardType="decimal-pad" value={newMissionReward} onChangeText={setNewMissionReward} />
              <Text style={styles.formLabel}>PROOF TYPE</Text>
              <View style={styles.proofOptions}>
                {["Video", "Photo", "Text"].map((type) => <TouchableOpacity key={type} style={[styles.proofOption, newMissionProof === type && styles.proofOptionActive]} onPress={() => setNewMissionProof(type)}><Text style={styles.proofOptionText}>{type}</Text></TouchableOpacity>)}
              </View>
            </View>
            <TouchableOpacity style={styles.primary} onPress={() => {
              const reward = Number(newMissionReward);
              if (!newMissionTitle.trim() || !Number.isFinite(reward) || reward <= 0) return;
              const mission = { id: `custom_${Date.now()}`, type: newMissionProof.toUpperCase(), title: newMissionTitle.trim(), reward, proof: newMissionProof.toLowerCase(), host: wallet || "demo-host" };
              setMissions((current) => [mission, ...current]);
              setNewMissionTitle("");
              setNewMissionReward("");
              setScreen("hostDashboard");
            }}><Text style={styles.primaryText}>PUBLISH MISSION</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setScreen("hostDashboard")}><Text style={styles.secondaryText}>CANCEL</Text></TouchableOpacity>
          </ScrollView>
        )}

        {screen === "reviewDashboard" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>HOST</Text>
            <Text style={styles.detailTitle}>Review work.</Text>
            <Text style={styles.detailCopy}>Only approved submissions can move to payment.</Text>
            {submissions.filter((item) => item.status === PAYMENT_STATES.UNDER_REVIEW).length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyTitle}>No pending submissions</Text><Text style={styles.emptyCopy}>New contributor submissions will appear here.</Text></View>
            ) : submissions.filter((item) => item.status === PAYMENT_STATES.UNDER_REVIEW).map((item) => {
              const mission = MISSIONS.find((m) => m.id === item.missionId);
              return <View key={item.missionId} style={styles.reviewCard}>
                <Text style={styles.eyebrow}>{mission?.type}</Text>
                <Text style={styles.reviewTitle}>{mission?.title}</Text>
                <Text style={styles.reviewReward}>{mission?.reward} USDC pending</Text>
                {item.proof?.uri ? <Image source={{ uri: item.proof.uri }} style={styles.proofPreview} /> : <View style={styles.noProof}><Text style={styles.noProofText}>No media attached</Text></View>}
                <Text style={styles.proofMeta}>{item.proof?.type || "proof"} • submitted for host review</Text>
                <TouchableOpacity style={styles.primary} onPress={() => { setSelectedMission(mission); setScreen("review"); }}><Text style={styles.primaryText}>OPEN SUBMISSION</Text></TouchableOpacity>
              </View>;
            })}
          </ScrollView>
        )}

        {screen === "review" && selectedMission && (
          <View style={styles.center}>
            <Text style={styles.eyebrow}>HOST REVIEW</Text>
            <Text style={styles.centerTitle}>Approve this submission?</Text>
            <Text style={styles.centerCopy}>Only the host can approve or reject a submission. Approval creates a payment intent. The payment service then releases the USDC.</Text>
            <TouchableOpacity style={styles.primary} onPress={approveDemo}><Text style={styles.primaryText}>APPROVE + RELEASE {selectedMission.reward} USDC</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => { setSubmissions((current) => current.map((item) => item.missionId === selectedMission.id ? { ...item, status: PAYMENT_STATES.REJECTED, paid: false } : item)); setScreen("reviewDashboard"); }}><Text style={styles.secondaryText}>REJECT / NO PAYMENT</Text></TouchableOpacity>
          </View>
        )}

        {screen === "approved" && selectedMission && (
          <View style={styles.center}>
            <Text style={styles.successMark}>✓</Text>
            <Text style={styles.centerTitle}>Approved.</Text>
            <Text style={styles.centerCopy}>Your submission was approved and the payment intent was created. The payout service releases {selectedMission.reward} USDC only after approval.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setScreen("profile")}><Text style={styles.primaryText}>VIEW REPUTATION</Text></TouchableOpacity>
          </View>
        )}

        {screen === "profile" && (
          <ScrollView>
            <Text style={styles.eyebrow}>PROFILE</Text>
            <Text style={styles.profileTitle}>Mercy</Text>
            <Text style={styles.profileHandle}>proof contributor</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileScore}>91%</Text>
              <Text style={styles.profileLabel}>VERIFIED CONTRIBUTION RATE</Text>
              <View style={styles.divider} />
              <Text style={styles.profileRow}>12 approved contributions</Text>
              <Text style={styles.profileRow}>{earned.toFixed(2)} USDC earned</Text>
              <Text style={styles.profileRow}>0 rejected payments</Text>
            </View>
            <TouchableOpacity style={styles.secondary} onPress={() => setScreen("home")}><Text style={styles.secondaryText}>BACK TO MISSIONS</Text></TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function MissionCard({ mission, onPress }) {
  return (
    <TouchableOpacity style={styles.mission} onPress={onPress}>
      <View style={styles.missionTop}><Text style={styles.missionType}>{mission.type}</Text><Text style={styles.missionReward}>{mission.reward} USDC</Text></View>
      <Text style={styles.missionTitle}>{mission.title}</Text>
      <Text style={styles.missionProof}>PROOF: {mission.proof}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ status }) {
  return <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>{status}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F1EB" },
  app: { flex: 1, paddingHorizontal: 20 },
  header: { height: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 22, fontWeight: "900", letterSpacing: 1.5, color: "#111111" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#F4F1EB", fontWeight: "800" },
  hero: { paddingTop: 34, paddingBottom: 30 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: "#77736C", marginBottom: 10 },
  heroTitle: { fontSize: 48, lineHeight: 52, fontWeight: "900", letterSpacing: -2, color: "#111111" },
  heroCopy: { fontSize: 16, lineHeight: 24, color: "#5F5B55", marginTop: 14, maxWidth: 330 },
  walletButton: { marginTop: 20, backgroundColor: "#111111", borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  walletButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  walletAddress: { marginTop: 8, color: "#77736C", fontSize: 12, fontWeight: "700" },
  hostStats: { flexDirection: "row", justifyContent: "space-between", marginVertical: 24, padding: 18, backgroundColor: "#E9E4DC", borderRadius: 18 },
  statNumber: { fontSize: 22, fontWeight: "900" },
  statLabel: { marginTop: 4, fontSize: 9, fontWeight: "900", letterSpacing: 1, color: "#77736C" },
  formBox: { marginTop: 22, marginBottom: 18 },
  formLabel: { marginTop: 16, marginBottom: 8, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  input: { backgroundColor: "#F4F0E9", borderRadius: 12, padding: 15, fontSize: 15, color: "#171614" },
  proofOptions: { flexDirection: "row", gap: 8 },
  proofOption: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: "#C9C3B9" },
  proofOptionActive: { backgroundColor: "#171614", borderColor: "#171614" },
  proofOptionText: { fontWeight: "800" },
  roleSwitch: { marginBottom: 22, paddingVertical: 12, borderWidth: 1, borderColor: "#C9C3B9", borderRadius: 12, alignItems: "center" },
  roleSwitchText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  proofPreview: { width: "100%", height: 190, borderRadius: 14, marginTop: 14, backgroundColor: "#E9E4DC" },
  noProof: { height: 110, borderRadius: 14, marginTop: 14, backgroundColor: "#E9E4DC", alignItems: "center", justifyContent: "center" },
  noProofText: { color: "#77736C", fontWeight: "800" },
  proofMeta: { marginTop: 8, color: "#77736C", fontSize: 11, fontWeight: "700" },
  reviewCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginTop: 14, borderWidth: 1, borderColor: "#E3DED5" },
  reviewTitle: { fontSize: 20, fontWeight: "900", lineHeight: 25 },
  reviewReward: { marginTop: 10, color: "#77736C", fontSize: 13, fontWeight: "800" },
  emptyBox: { marginTop: 28, padding: 22, borderRadius: 18, backgroundColor: "#E9E4DC" },
  emptyTitle: { fontSize: 18, fontWeight: "900" },
  emptyCopy: { marginTop: 7, color: "#5F5B55", lineHeight: 20 },
  stats: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#D7D2C9", paddingVertical: 18, marginBottom: 34 },
  stat: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111111" },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#88837B", marginTop: 5 },
  sectionTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginBottom: 12 },
  mission: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "#E3DED5" },
  missionTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  missionType: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#77736C" },
  missionReward: { fontSize: 12, fontWeight: "900" },
  missionTitle: { fontSize: 18, fontWeight: "800", lineHeight: 23, color: "#111111" },
  missionProof: { marginTop: 18, fontSize: 10, fontWeight: "800", color: "#8A857D", letterSpacing: 0.8 },
  back: { fontSize: 11, fontWeight: "900", letterSpacing: 1, color: "#77736C", marginVertical: 22 },
  detail: { paddingTop: 22 },
  detailTitle: { fontSize: 38, lineHeight: 42, fontWeight: "900", letterSpacing: -1.5, color: "#111111" },
  detailCopy: { fontSize: 16, lineHeight: 25, color: "#5F5B55", marginTop: 18 },
  rewardBox: { marginTop: 30, padding: 20, backgroundColor: "#111111", borderRadius: 18 },
  rewardLabel: { color: "#A7A29A", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  rewardValue: { color: "#FFFFFF", fontSize: 27, fontWeight: "900", marginTop: 5 },
  ruleBox: { marginTop: 12, padding: 18, backgroundColor: "#E9E4DC", borderRadius: 16 },
  ruleTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "#77736C" },
  ruleText: { marginTop: 7, fontSize: 14, lineHeight: 20, color: "#2D2B28" },
  primary: { backgroundColor: "#111111", minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 22 },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12, letterSpacing: 0.8, textAlign: "center" },
  secondary: { minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: "#C9C3B9", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 10 },
  secondaryText: { color: "#111111", fontWeight: "900", fontSize: 12, letterSpacing: 0.7, textAlign: "center" },
  status: { flexDirection: "row", alignItems: "center", padding: 17, backgroundColor: "#E9E4DC", borderRadius: 14, marginTop: 22 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#111111", marginRight: 10 },
  statusText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  center: { flex: 1, justifyContent: "center", paddingBottom: 60 },
  successMark: { fontSize: 50, fontWeight: "900", marginBottom: 18 },
  centerTitle: { fontSize: 38, lineHeight: 42, fontWeight: "900", letterSpacing: -1.5 },
  centerCopy: { fontSize: 16, lineHeight: 24, color: "#5F5B55", marginTop: 14 },
  profileTitle: { fontSize: 46, fontWeight: "900", letterSpacing: -2 },
  profileHandle: { color: "#77736C", marginTop: 4, fontSize: 14 },
  profileCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 22, marginTop: 28, borderWidth: 1, borderColor: "#E3DED5" },
  profileScore: { fontSize: 46, fontWeight: "900" },
  profileLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#77736C", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E3DED5", marginVertical: 20 },
  profileRow: { fontSize: 14, color: "#34312D", marginBottom: 12 }
});
