import AppMetrica from "@appmetrica/react-native-analytics";

const API_KEY = process.env.EXPO_PUBLIC_APPMETRICA_API_KEY || "";

export function initAppMetrica() {
  if (!API_KEY) {
    console.warn("[AppMetrica] API_KEY not set");
    return;
  }

  AppMetrica.activate({
    apiKey: API_KEY,
    logs: __DEV__,
    sessionTimeout: 120,
  });

  console.log("[AppMetrica] activated");
}

export function appMetricaLogTestEvent() {
  AppMetrica.reportEvent("test_event", { source: "dev_build" });
  console.log("[AppMetrica] event sent");
}
