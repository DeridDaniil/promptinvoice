import React from "react";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const REAL_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID;

export function AdBanner() {
  const unitId = __DEV__ ? TestIds.BANNER : (REAL_ID ?? TestIds.BANNER);

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdLoaded={() => console.log("[AdMob] banner loaded")}
      onAdFailedToLoad={(err) => console.log("[AdMob] banner failed", err)}
    />
  );
}
