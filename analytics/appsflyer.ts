import appsFlyer from "react-native-appsflyer";

const DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? "";
const IOS_APP_ID = process.env.EXPO_PUBLIC_APPSFLYER_IOS_APP_ID ?? "";

let started = false;

// В SDK AppsFlyer типы на ошибки часто не строгие,
// поэтому безопасно используем unknown и потом приводим к string.
function toErrorString(value: unknown) {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function initAppsFlyer() {
  if (!DEV_KEY) {
    console.warn("[AppsFlyer] DEV_KEY is empty. Check .env");
    return;
  }

  console.log("[AppsFlyer] DEV_KEY length:", DEV_KEY.length);

  appsFlyer.initSdk(
    {
      devKey: DEV_KEY,
      appId: IOS_APP_ID, // iOS only (на Android не мешает)
      isDebug: __DEV__,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
    },
    () => {
      started = true;
      console.log("[AppsFlyer] init success");

      setTimeout(() => {
        appsFlyer.getAppsFlyerUID(
          (uid: string) => console.log("[AppsFlyer] UID:", uid),
          (err: unknown) => console.log("[AppsFlyer] UID error:", toErrorString(err))
        );
      }, 2000);
    },
    (err: unknown) => {
      console.log("[AppsFlyer] init error:", toErrorString(err));
    }
  );

  // conversion data callback (может быть объект, поэтому unknown)
  appsFlyer.onInstallConversionData((res: unknown) => {
    console.log("[AppsFlyer] conversion data:", res);
  });
}

export function appsFlyerLogEvent(name: string, values: Record<string, unknown> = {}) {
  if (!started) {
    console.log("[AppsFlyer] not started yet, skip event");
    return;
  }

  appsFlyer.logEvent(
    name,
    values,
    () => console.log("[AppsFlyer] event sent:", name),
    (err: unknown) => console.log("[AppsFlyer] event error:", toErrorString(err))
  );
}
