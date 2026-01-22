const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");

function ensureToolsNamespace(androidManifest) {
  androidManifest.manifest.$ = androidManifest.manifest.$ || {};
  androidManifest.manifest.$["xmlns:tools"] =
    androidManifest.manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
  return androidManifest;
}

function setAndroidAdMobAppId(androidManifest, androidAppId) {
  const app = androidManifest.manifest.application?.[0];
  if (!app) return androidManifest;

  app["meta-data"] = app["meta-data"] || [];

  // Удаляем старые записи с этим ключом (если есть)
  app["meta-data"] = app["meta-data"].filter(
    (m) => m?.$?.["android:name"] !== "com.google.android.gms.ads.APPLICATION_ID"
  );

  // Добавляем новую, и ГЛАВНОЕ: tools:replace="android:value"
  app["meta-data"].push({
    $: {
      "android:name": "com.google.android.gms.ads.APPLICATION_ID",
      "android:value": androidAppId,
      "tools:replace": "android:value",
    },
  });

  return androidManifest;
}

module.exports = function withAdMobAppId(config, { androidAppId, iosAppId }) {
  if (!androidAppId || !iosAppId) {
    throw new Error(
      "withAdMobAppId: androidAppId и iosAppId обязательны (это App ID, а не Ad Unit ID)"
    );
  }

  // Android
  config = withAndroidManifest(config, (config) => {
    config.modResults = ensureToolsNamespace(config.modResults);
    config.modResults = setAndroidAdMobAppId(config.modResults, androidAppId);
    return config;
  });

  // iOS
  config = withInfoPlist(config, (config) => {
    config.modResults.GADApplicationIdentifier = iosAppId;
    return config;
  });

  return config;
};
