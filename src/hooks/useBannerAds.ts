/**
 * useBannerAds Hook
 *
 * Manages banner ad display and lifecycle:
 * - Syncs scripting time and ad-free time from services to UI store
 * - Controls show/hide cycle based on premium status and time remaining
 * - Handles ad-free time tracking
 */

import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { adRewardService } from '../services/AdRewardService';
import { bannerAdService } from '../services/BannerAdService';

export function useBannerAds() {
  const scriptingTimeMs = useUIStore(state => state.scriptingTimeMs);
  const adFreeTimeMs = useUIStore(state => state.adFreeTimeMs);

  // Effect: Initialize and listen to ad service changes
  useEffect(() => {
    const store = useUIStore.getState();

    // Initialize scripting time and ad-free time from services
    store.setScriptingTimeMs(adRewardService.getRemainingTime());
    store.setAdFreeTimeMs(bannerAdService.getAdFreeTime());

    // Listen to AdRewardService for scripting time changes
    const unsubscribeScripting = adRewardService.addListener((remainingMs) => {
      useUIStore.getState().setScriptingTimeMs(remainingMs);
    });

    // Listen to BannerAdService for banner visibility and ad-free time changes
    const unsubscribeBanner = bannerAdService.addListener((visible, adFreeMs) => {
      const currentStore = useUIStore.getState();
      currentStore.setBannerVisible(visible);
      currentStore.setAdFreeTimeMs(adFreeMs);
    });

    return () => {
      unsubscribeScripting();
      unsubscribeBanner();
    };
  }, []);

  // Effect: Control banner ad show/hide cycle based on scripting and ad-free time
  useEffect(() => {
    const shouldShowAds = bannerAdService.shouldShowAds(scriptingTimeMs, adFreeTimeMs);

    if (shouldShowAds) {
      // Start the show/hide cycle
      bannerAdService.startShowHideCycle();

      // Start ad-free time tracking if we have ad-free time remaining
      if (!bannerAdService.isTrackingAdFreeTime() && adFreeTimeMs > 0) {
        bannerAdService.startAdFreeTimeTracking();
      }
    } else {
      // Stop the show/hide cycle (user has premium or enough time)
      bannerAdService.stopShowHideCycle();

      // Stop ad-free time tracking
      if (bannerAdService.isTrackingAdFreeTime()) {
        bannerAdService.stopAdFreeTimeTracking();
      }
    }
  }, [scriptingTimeMs, adFreeTimeMs]);
}
