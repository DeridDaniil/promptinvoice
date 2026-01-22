import { getApp } from "@react-native-firebase/app";
import { getAnalytics, logEvent } from "@react-native-firebase/analytics";

export async function firebaseLogTestEvent() {
  const analytics = getAnalytics(getApp());
  await logEvent(analytics, "test_event", { source: "dev_build" });
}

