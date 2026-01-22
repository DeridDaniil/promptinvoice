import { Stack } from "expo-router";
import { useEffect } from "react";
import mobileAds from "react-native-google-mobile-ads";

import { initAppMetrica } from "../analytics/appmetrica";
import { trackOpenApp } from "../analytics/track";

export default function RootLayout() {
  useEffect(() => {
    mobileAds().initialize().then(() => console.log("[AdMob] initialized"));
    initAppMetrica();
    trackOpenApp();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}