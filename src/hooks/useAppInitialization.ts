import { useEffect } from 'react';
import { initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import MobileAds from 'react-native-google-mobile-ads';
import RNBootSplash from 'react-native-bootsplash';
import { consentService } from '../services/ConsentService';
import { settingsService } from '../services/SettingsService';
import { adRewardService } from '../services/AdRewardService';
import { inAppPurchaseService } from '../services/InAppPurchaseService';
import { bannerAdService } from '../services/BannerAdService';
import { errorReportingService } from '../services/ErrorReportingService';

// ErrorUtils is available globally in React Native
declare const ErrorUtils: {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

/**
 * Hook to handle app initialization including Firebase App Check,
 * consent management, AdMob, and error reporting
 */
export function useAppInitialization() {
  useEffect(() => {
    // Initialize Firebase App Check using modular API
    const initAppCheck = async () => {
      try {
        const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
        rnfbProvider.configure({
          android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
          },
          apple: {
            provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
          },
          web: {
            provider: 'reCaptchaV3',
            siteKey: 'none',
          },
        });
        await initializeAppCheck(getApp(), {
          provider: rnfbProvider,
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        console.warn('App Check initialization failed:', error);
      }
    };
    initAppCheck();

    // Initialize consent management and AdMob
    const initAdsWithConsent = async () => {
      try {
        // Step 1: Initialize UMP SDK for consent (GDPR/CCPA compliance)
        console.log('🔐 Initializing consent management...');
        await consentService.initialize(__DEV__); // Enable debug mode in development
        console.log('✅ Consent service initialized');

        // Step 2: Show consent form if required (first launch in EEA/UK)
        // Skip showing consent form on first run - it will be shown in FirstRunSetupScreen
        const isFirstRun = await settingsService.isFirstRun();
        if (!isFirstRun) {
          await consentService.showConsentFormIfRequired();
        } else {
          console.log('⏭️ Skipping consent form - will be shown in first run setup');
        }

        // Step 3: Initialize AdMob after consent is handled
        console.log('🚀 Starting AdMob initialization...');
        const adapterStatuses = await MobileAds().initialize();
        console.log('✅ AdMob initialized successfully');
        console.log('Adapter statuses:', JSON.stringify(adapterStatuses, null, 2));

        // Check if adapters are ready
        const allReady = adapterStatuses.every((adapter: any) => adapter.state === 1);
        if (!allReady) {
          console.warn('⚠️ WARNING: Not all ad adapters are ready!');
          console.warn('This could be due to:');
          console.warn('  - New ad units (wait up to 24 hours)');
          console.warn('  - Network connectivity issues');
          console.warn('  - Google Play Services not updated');
          console.warn('  - Ad units not approved in AdMob console');
        } else {
          console.log('✅ All ad adapters ready!');
        }

        // Step 4: Initialize AdRewardService after consent & AdMob are ready
        console.log('🔄 Initializing AdRewardService...');
        await adRewardService.initialize();
        console.log('✅ AdRewardService initialized successfully');

        // Step 5: Initialize InAppPurchaseService
        console.log('🔄 Initializing InAppPurchaseService...');
        await inAppPurchaseService.initialize();
        console.log('✅ InAppPurchaseService initialized successfully');

        // Step 6: Initialize BannerAdService
        console.log('🔄 Initializing BannerAdService...');
        await bannerAdService.initialize();
        console.log('✅ BannerAdService initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize ads with consent:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    };

    initAdsWithConsent();

    errorReportingService.initialize();
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('Global error handler:', error, 'isFatal:', isFatal);
        console.error('Error stack:', error.stack);
        errorReportingService.report(error, { fatal: isFatal !== false, source: 'globalErrorHandler' });
        // Try to hide bootsplash even on fatal error
        if (isFatal) {
          RNBootSplash.hide({ fade: false }).catch(() => { });
        }
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });

      return () => {
        if (typeof ErrorUtils !== 'undefined' && originalHandler) {
          ErrorUtils.setGlobalHandler(originalHandler);
        }
      };
    }
  }, []);
}
