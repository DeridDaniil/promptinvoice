import { Stack } from "expo-router";
import { useEffect } from "react";
import mobileAds from "react-native-google-mobile-ads";

import { initAppMetrica } from "../analytics/appmetrica";
import { trackOpenApp } from "../analytics/track";
import { initAppsFlyer, appsFlyerLogEvent } from "../analytics/appsflyer";

export default function RootLayout() {
  useEffect(() => {
    mobileAds().initialize().then(() => console.log("[AdMob] initialized"));
    initAppMetrica();
    trackOpenApp();
    initAppsFlyer();

    setTimeout(() => {
      appsFlyerLogEvent("test_event", { source: "dev_build" });
    }, 5000);

  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}