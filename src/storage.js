import AsyncStorage from "@react-native-async-storage/async-storage";

const SUBMISSIONS_KEY = "proof_submissions";

export async function loadSubmissions() {
  const raw = await AsyncStorage.getItem(SUBMISSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSubmissions(submissions) {
  await AsyncStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submissions;
}

export async function clearSubmissions() {
  await AsyncStorage.removeItem(SUBMISSIONS_KEY);
}
