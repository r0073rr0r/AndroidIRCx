/**
 * AndroidIRCX - IRC Client
 * @format
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Alert,
  TextInput,
  Modal,
  Text,
  TouchableOpacity,
  AppState,
  LogBox,
} from 'react-native';

// ErrorUtils is available globally in React Native
declare const ErrorUtils: {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};
import RNBootSplash from 'react-native-bootsplash';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MobileAds, { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { HeaderBar } from './src/components/HeaderBar';

import { ChannelTabs } from './src/components/ChannelTabs';
import { MessageArea } from './src/components/MessageArea';
import { MessageInput } from './src/components/MessageInput';
import { TypingIndicator } from './src/components/TypingIndicator';
import { UserList } from './src/components/UserList';
import { QueryEncryptionMenu } from './src/components/QueryEncryptionMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ircService, IRCMessage, IRCConnectionConfig, ChannelUser, RawMessageCategory } from './src/services/IRCService';
import { settingsService, IRCNetworkConfig, IRCServerConfig, DEFAULT_SERVER, DEFAULT_PART_MESSAGE } from './src/services/SettingsService';
import { connectionManager } from './src/services/ConnectionManager';
import { messageHistoryService } from './src/services/MessageHistoryService';
import { biometricAuthService } from './src/services/BiometricAuthService';
import { secureStorageService } from './src/services/SecureStorageService';
import { ChannelListScreen } from './src/screens/ChannelListScreen';
import { ChannelSettingsScreen } from './src/screens/ChannelSettingsScreen';
import { errorReportingService } from './src/services/ErrorReportingService';
import { logger } from './src/services/Logger';
import { adRewardService } from './src/services/AdRewardService';
import { bannerAdService } from './src/services/BannerAdService';
import { inAppPurchaseService } from './src/services/InAppPurchaseService';
import { consentService } from './src/services/ConsentService';
import { NetworksListScreen } from './src/screens/NetworksListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { IgnoreListScreen } from './src/screens/IgnoreListScreen';
import { FirstRunSetupScreen } from './src/screens/FirstRunSetupScreen';
import { PurchaseScreen } from './src/screens/PurchaseScreen';
import { WHOISDisplay } from './src/components/WHOISDisplay';
import { encryptedDMService } from './src/services/EncryptedDMService';
import { channelEncryptionService } from './src/services/ChannelEncryptionService';
import { channelEncryptionSettingsService } from './src/services/ChannelEncryptionSettingsService';
import { ChannelTab } from './src/types';
import { useTheme } from './src/hooks/useTheme';
import { tabService } from './src/services/TabService';
import { userActivityService } from './src/services/UserActivityService';
import { channelNotesService, ChannelLogEntry } from './src/services/ChannelNotesService';
import { offlineQueueService } from './src/services/OfflineQueueService';
import { dccFileService } from './src/services/DCCFileService';
import { identityProfilesService, IdentityProfile } from './src/services/IdentityProfilesService';
import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { initTransifex, listenToLocaleChanges, TXProvider, tx, useT } from './src/i18n/transifex';

// Zustand stores and custom hooks
import { useConnectionStore } from './src/stores/connectionStore';
import { useTabStore } from './src/stores/tabStore';
import { useUIStore } from './src/stores/uiStore';
import { useMessageStore } from './src/stores/messageStore';
import { useConnectionManager } from './src/hooks/useConnectionManager';
import { useTabManager } from './src/hooks/useTabManager';
import { useAppLock } from './src/hooks/useAppLock';
import { useBannerAds } from './src/hooks/useBannerAds';
import { useTabEncryption } from './src/hooks/useTabEncryption';
import { useUISettings } from './src/hooks/useUISettings';
import { useConnectionLifecycle } from './src/hooks/useConnectionLifecycle';
import { useNetworkInitialization } from './src/hooks/useNetworkInitialization';
import { useMessageSending } from './src/hooks/useMessageSending';
import { useConnectionHandler } from './src/hooks/useConnectionHandler';
import { useTabContextMenu } from './src/hooks/useTabContextMenu';
import { useTabActions } from './src/hooks/useTabActions';
import { useAppExit } from './src/hooks/useAppExit';
import { useHeaderActions } from './src/hooks/useHeaderActions';
import { useAppLockActions } from './src/hooks/useAppLockActions';
import { useFirstRunSetup } from './src/hooks/useFirstRunSetup';
import { useSafeAlert } from './src/hooks/useSafeAlert';
import { useMessageBatching } from './src/hooks/useMessageBatching';
import { useAutoJoinChannels } from './src/hooks/useAutoJoinChannels';
import { useRawSettings } from './src/hooks/useRawSettings';
import { useAppStateEffects } from './src/hooks/useAppStateEffects';
import { useServiceHelpers } from './src/hooks/useServiceHelpers';
import { useStartupServices } from './src/hooks/useStartupServices';
import { useKeyboardShortcuts } from './src/hooks/useKeyboardShortcuts';
import { useFirstRunCheck } from './src/hooks/useFirstRunCheck';
import { useLayoutConfig } from './src/hooks/useLayoutConfig';
import { useUserManagementNetworkSync } from './src/hooks/useUserManagementNetworkSync';
import { useServerTabNameSync } from './src/hooks/useServerTabNameSync';
import { useDccSessionSync } from './src/hooks/useDccSessionSync';
import { useTypingCleanup } from './src/hooks/useTypingCleanup';
import {
  serverTabId,
  channelTabId,
  queryTabId,
  noticeTabId,
  makeServerTab,
  sortTabsGrouped,
} from './src/utils/tabUtils';

// Suppress noisy pooled synthetic event warnings that can appear in dev logging
LogBox.ignoreLogs(['This synthetic event is reused for performance reasons.']);

function App() {
  // Global error handler to catch crashes
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

  useEffect(() => {
    initTransifex().catch(() => {});
    const unsubscribe = listenToLocaleChanges();
    return () => unsubscribe();
  }, []);

  return (
    <TXProvider tx={tx}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <AppContent />
      </SafeAreaProvider>
    </TXProvider>
  );
}

function AppContent() {
  const t = useT();
  const { colors } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const styles = createStyles(colors);

  // Connection state and manager from Zustand store + custom hook
  const connectionManagerHook = useConnectionManager();
  const {
    isConnected,
    networkName,
    selectedNetworkName,
    ping,
    activeConnectionId,
    primaryNetworkId,
    setSelectedNetworkName
  } = connectionManagerHook;

  // Tab state and manager from Zustand store + custom hook
  const tabManagerHook = useTabManager();
  const { tabs, activeTabId } = tabManagerHook;

  // Get stable action references (don't subscribe to store)
  const setActiveTabId = useCallback((id: string) => {
    useTabStore.getState().setActiveTabId(id);
  }, []);

  const setIsConnected = useCallback((value: boolean) => {
    useConnectionStore.getState().setIsConnected(value);
  }, []);

  const setNetworkName = useCallback((name: string) => {
    useConnectionStore.getState().setNetworkName(name);
  }, []);

  const setPrimaryNetworkId = useCallback((id: string | null) => {
    useConnectionStore.getState().setPrimaryNetworkId(id);
  }, []);

  const setActiveConnectionId = useCallback((id: string | null) => {
    useConnectionStore.getState().setActiveConnectionId(id);
  }, []);

  const setPing = useCallback((value: number) => {
    useConnectionStore.getState().setPing(value);
  }, []);

  // Wrapper to support functional updates (for backward compatibility)
  // Use direct store access to avoid dependency issues
  const setTabs = useCallback((updater: ChannelTab[] | ((prev: ChannelTab[]) => ChannelTab[])) => {
    const store = useTabStore.getState();
    const currentTabs = store.tabs;
    const newTabs = typeof updater === 'function' ? updater(currentTabs) : updater;

    // Only update if tabs actually changed (reference equality check)
    if (newTabs !== currentTabs) {
      store.setTabs(newTabs);
    }
  }, []); // No dependencies - always uses current store state

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // UI state from Zustand store - ONLY subscribe to state values
  const showFirstRunSetup = useUIStore(state => state.showFirstRunSetup);
  const isCheckingFirstRun = useUIStore(state => state.isCheckingFirstRun);
  const showRawCommands = useUIStore(state => state.showRawCommands);
  const rawCategoryVisibility = useUIStore(state => state.rawCategoryVisibility);
  const hideJoinMessages = useUIStore(state => state.hideJoinMessages);
  const hidePartMessages = useUIStore(state => state.hidePartMessages);
  const hideQuitMessages = useUIStore(state => state.hideQuitMessages);
  const hideIrcServiceListenerMessages = useUIStore(state => state.hideIrcServiceListenerMessages);

  // Get stable action references
  const setShowFirstRunSetup = useCallback((value: boolean) => {
    useUIStore.getState().setShowFirstRunSetup(value);
  }, []);

  const setIsCheckingFirstRun = useCallback((value: boolean) => {
    useUIStore.getState().setIsCheckingFirstRun(value);
  }, []);

  const setShowRawCommands = useCallback((value: boolean) => {
    useUIStore.getState().setShowRawCommands(value);
  }, []);

  const setRawCategoryVisibility = useCallback((visibility: Record<RawMessageCategory, boolean>) => {
    useUIStore.getState().setRawCategoryVisibility(visibility);
  }, []);

  const setHideJoinMessages = useCallback((value: boolean) => {
    useUIStore.getState().setHideJoinMessages(value);
  }, []);

  const setHidePartMessages = useCallback((value: boolean) => {
    useUIStore.getState().setHidePartMessages(value);
  }, []);

  const setHideQuitMessages = useCallback((value: boolean) => {
    useUIStore.getState().setHideQuitMessages(value);
  }, []);

  const setHideIrcServiceListenerMessages = useCallback((value: boolean) => {
    useUIStore.getState().setHideIrcServiceListenerMessages(value);
  }, []);

  // Message state from Zustand store - ONLY subscribe to state values
  const typingUsers = useMessageStore(state => state.typingUsers);

  // Get stable action references
  const setTypingUser = useCallback((networkId: string, target: string, nick: string, status: any) => {
    useMessageStore.getState().setTypingUser(networkId, target, nick, status);
  }, []);

  const removeTypingUser = useCallback((networkId: string, target: string, nick: string) => {
    useMessageStore.getState().removeTypingUser(networkId, target, nick);
  }, []);

  const clearTypingForTarget = useCallback((networkId: string, target: string) => {
    useMessageStore.getState().clearTypingForTarget(networkId, target);
  }, []);

  const cleanupStaleTyping = useCallback(() => {
    useMessageStore.getState().cleanupStaleTyping();
  }, []);

  // App lock and banner states from UI store - ONLY subscribe to state values
  const appLockEnabled = useUIStore(state => state.appLockEnabled);
  const appLockUseBiometric = useUIStore(state => state.appLockUseBiometric);
  const appLockUsePin = useUIStore(state => state.appLockUsePin);
  const appLockOnLaunch = useUIStore(state => state.appLockOnLaunch);
  const appLockOnBackground = useUIStore(state => state.appLockOnBackground);
  const appLocked = useUIStore(state => state.appLocked);
  const appUnlockModalVisible = useUIStore(state => state.appUnlockModalVisible);
  const appPinEntry = useUIStore(state => state.appPinEntry);
  const appPinError = useUIStore(state => state.appPinError);
  const bannerVisible = useUIStore(state => state.bannerVisible);
  const scriptingTimeMs = useUIStore(state => state.scriptingTimeMs);
  const adFreeTimeMs = useUIStore(state => state.adFreeTimeMs);

  // Get stable action references
  const setAppLockEnabled = useCallback((value: boolean) => {
    useUIStore.getState().setAppLockEnabled(value);
  }, []);

  const setAppLockUseBiometric = useCallback((value: boolean) => {
    useUIStore.getState().setAppLockUseBiometric(value);
  }, []);

  const setAppLockUsePin = useCallback((value: boolean) => {
    useUIStore.getState().setAppLockUsePin(value);
  }, []);

  const setAppLockOnLaunch = useCallback((value: boolean) => {
    useUIStore.getState().setAppLockOnLaunch(value);
  }, []);

  const setAppLockOnBackground = useCallback((value: boolean) => {
    useUIStore.getState().setAppLockOnBackground(value);
  }, []);

  const setAppLocked = useCallback((value: boolean) => {
    useUIStore.getState().setAppLocked(value);
  }, []);

  const setAppUnlockModalVisible = useCallback((value: boolean) => {
    useUIStore.getState().setAppUnlockModalVisible(value);
  }, []);

  const setAppPinEntry = useCallback((value: string) => {
    useUIStore.getState().setAppPinEntry(value);
  }, []);

  const setAppPinError = useCallback((value: string) => {
    useUIStore.getState().setAppPinError(value);
  }, []);

  const setBannerVisible = useCallback((value: boolean) => {
    useUIStore.getState().setBannerVisible(value);
  }, []);

  const setScriptingTimeMs = useCallback((value: number) => {
    useUIStore.getState().setScriptingTimeMs(value);
  }, []);

  const setAdFreeTimeMs = useCallback((value: number) => {
    useUIStore.getState().setAdFreeTimeMs(value);
  }, []);

  const appStateRef = useRef(AppState.currentState);

  // Fabric crash protection: track if component is mounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to safely set state only when mounted
  const safeSetState = useCallback((fn: () => void) => {
    if (isMountedRef.current) {
      fn();
    }
  }, []);

  // App lock management (PIN, biometric auth, auto-lock)
  const { attemptBiometricUnlock, handleAppPinUnlock } = useAppLock();

  // Banner ad lifecycle management (scripting time, ad-free time, show/hide cycle)
  useBannerAds();

  // Tab encryption state synchronization (reconcile flags with stored keys, "always encrypt" settings)
  useTabEncryption({ isConnected, setTabs, tabsRef });

  // Additional UI settings (not yet in store, keeping as local state for now)
  const [autoSwitchPrivate, setAutoSwitchPrivate] = useState(false);
  const [showEncryptionIndicators, setShowEncryptionIndicators] = useState(true);
  const [autoConnectFavoriteServer, setAutoConnectFavoriteServer] = useState(false);
  const autoConnectFavoriteServerRef = useRef(false);
  const [tabSortAlphabetical, setTabSortAlphabetical] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const pendingAlertRef = useRef<{ title: string; message?: string; buttons?: any } | null>(null);
  const motdCompleteRef = useRef<Set<string>>(new Set());
  const autoConnectAttemptedRef = useRef<Set<string>>(new Set());

  // Message batching refs to prevent 150+ individual updates during rapid message arrival
  const pendingMessagesRef = useRef<Array<{message: IRCMessage, context: any}>>([]);
  const messageBatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Process batched messages - called after timeout
  const { processBatchedMessages } = useMessageBatching({
    pendingMessagesRef,
    messageBatchTimeoutRef,
    activeTabId,
    tabSortAlphabetical,
    setTabs,
  });

  const {
    persistentSetShowRawCommands,
    persistentSetRawCategoryVisibility,
    persistentSetShowEncryptionIndicators,
  } = useRawSettings({ setShowEncryptionIndicators });

  const { safeAlert } = useSafeAlert({ appStateRef, pendingAlertRef });

  useAppStateEffects({
    appStateRef,
    pendingAlertRef,
    activeConnectionId,
    primaryNetworkId,
    setTabs,
  });

  // UI settings loading & synchronization (raw commands, message visibility, preferences)
  useUISettings({
    setAutoSwitchPrivate,
    setTabSortAlphabetical,
    setShowEncryptionIndicators,
    setAutoConnectFavoriteServer,
  });

  useEffect(() => {
    autoConnectFavoriteServerRef.current = autoConnectFavoriteServer;
  }, [autoConnectFavoriteServer]);

  const [channelUsers, setChannelUsers] = useState<Map<string, ChannelUser[]>>(new Map());
  // Modal and screen states from UI store
  const showChannelModal = useUIStore(state => state.showChannelModal);
  const channelName = useUIStore(state => state.channelName);
  const showNetworksList = useUIStore(state => state.showNetworksList);
  const showSettings = useUIStore(state => state.showSettings);
  const showPurchaseScreen = useUIStore(state => state.showPurchaseScreen);
  const showIgnoreList = useUIStore(state => state.showIgnoreList);
  const showWHOIS = useUIStore(state => state.showWHOIS);
  const whoisNick = useUIStore(state => state.whoisNick);
  const showQueryEncryptionMenu = useUIStore(state => state.showQueryEncryptionMenu);
  const showChannelList = useUIStore(state => state.showChannelList);
  const showUserList = useUIStore(state => state.showUserList);
  const showChannelSettings = useUIStore(state => state.showChannelSettings);
  const channelSettingsTarget = useUIStore(state => state.channelSettingsTarget);
  const channelSettingsNetwork = useUIStore(state => state.channelSettingsNetwork);
  const showOptionsMenu = useUIStore(state => state.showOptionsMenu);
  const showRenameModal = useUIStore(state => state.showRenameModal);
  const renameTargetTabId = useUIStore(state => state.renameTargetTabId);
  const renameValue = useUIStore(state => state.renameValue);
  const showTabOptionsModal = useUIStore(state => state.showTabOptionsModal);
  const tabOptionsTitle = useUIStore(state => state.tabOptionsTitle);
  const tabOptions = useUIStore(state => state.tabOptions);
  const showChannelNoteModal = useUIStore(state => state.showChannelNoteModal);
  const channelNoteTarget = useUIStore(state => state.channelNoteTarget);
  const channelNoteValue = useUIStore(state => state.channelNoteValue);
  const showChannelLogModal = useUIStore(state => state.showChannelLogModal);
  const channelLogEntries = useUIStore(state => state.channelLogEntries);
  const prefillMessage = useUIStore(state => state.prefillMessage);
  const showDccTransfers = useUIStore(state => state.showDccTransfers);
  const [dccTransfers, setDccTransfers] = useState(dccFileService.list());
  const [motdSignal, setMotdSignal] = useState(0);
  const showDccSendModal = useUIStore(state => state.showDccSendModal);
  const dccSendTarget = useUIStore(state => state.dccSendTarget);
  const dccSendPath = useUIStore(state => state.dccSendPath);

  // Stable setter references for TextInput callbacks
  const setChannelName = useCallback((value: string) => {
    useUIStore.getState().setChannelName(value);
  }, []);

  const setChannelNoteValue = useCallback((value: string) => {
    useUIStore.getState().setChannelNoteValue(value);
  }, []);

  const setRenameValue = useCallback((value: string) => {
    useUIStore.getState().setRenameValue(value);
  }, []);

  const setDccSendPath = useCallback((value: string) => {
    useUIStore.getState().setDccSendPath(value);
  }, []);

  // Get active tab with safe fallback (never create tabs with invalid networkIds)
  const getActiveTabSafe = () => {
    // First, try to find the active tab by ID
    const byId = tabs.find((tab) => tab.id === activeTabId);
    if (byId) return byId;

    // Try to find any server tab
    const serverTab = tabs.find(t => t.type === 'server');
    if (serverTab) return serverTab;

    // Try to get first available tab
    if (tabs[0]) return tabs[0];

    // Last resort: create temporary tab only if we have a valid network
    const validNetworkId = activeConnectionId || primaryNetworkId || (networkName !== 'Not connected' && networkName !== '' ? networkName : null);
    if (validNetworkId) {
      return makeServerTab(validNetworkId);
    }

    // Ultimate fallback: return a minimal safe tab (won't be saved)
    return { id: 'temp', name: 'IRC', type: 'server' as const, networkId: '', messages: [] };
  };

  const activeTab = getActiveTabSafe();
  const activeMessages = activeTab?.messages || [];
  const activeUsers = activeTab.type === 'channel'
    ? (channelUsers.get(activeTab.name) || [])
    : [];

  const {
    appendServerMessage,
    getActiveIRCService,
    getActiveUserManagementService,
    getActiveCommandService,
    getActiveConnectionQualityService,
    getActiveChannelManagementService,
    normalizeNetworkId,
    getNetworkConfigForId,
  } = useServiceHelpers({ setTabs, tabSortAlphabetical });

  useStartupServices();
  useKeyboardShortcuts({ tabsRef, setActiveTabId });
  useFirstRunCheck({ setShowFirstRunSetup, setIsCheckingFirstRun });

  const layoutConfig = useLayoutConfig();
  useUserManagementNetworkSync({ networkName, getActiveUserManagementService });
  useServerTabNameSync({ networkName });
  useDccSessionSync({ isMountedRef, tabSortAlphabetical });
  useTypingCleanup();


  // Network Initialization - Load networks, tabs, and message history
  useNetworkInitialization({
    isCheckingFirstRun,
    showFirstRunSetup,
    primaryNetworkId,
    tabs,
    setSelectedNetworkName,
    setNetworkName,
    setPrimaryNetworkId,
    setTabs,
    setActiveTabId,
    setInitialDataLoaded,
  });

  // Message Sending - Handle all message sending logic (commands, encryption, DCC, offline queue)
  const { handleSendMessage } = useMessageSending({
    isConnected,
    activeTabId,
    getActiveIRCService,
    getActiveCommandService,
    setTabs,
    safeAlert,
    t,
  });

  // Connection Handler - Handle IRC server connection
  const { handleConnect } = useConnectionHandler({
    setSelectedNetworkName,
    setActiveConnectionId,
    setNetworkName,
    setPrimaryNetworkId,
    setIsConnected,
    setTabs,
    setActiveTabId,
    appendServerMessage,
    safeAlert,
    t,
    tabsRef,
    primaryNetworkId,
    autoConnectFavoriteServerRef,
  });

  // Tab Actions - Handle tab selection, joins, and bulk closes
  const { handleTabPress, handleJoinChannel, closeAllChannelsAndQueries } = useTabActions({
    activeTabId,
    channelName,
    tabSortAlphabetical,
    tabsRef,
    getActiveIRCService,
    setActiveTabId,
    setNetworkName,
    setActiveConnectionId,
    setTabs,
    setChannelUsers,
  });

  // App Exit - Handle disconnect + app exit workflow
  const { handleExit } = useAppExit({
    isConnected,
    getActiveIRCService,
    safeAlert,
    t,
  });

  // Header Actions - Options menu, settings, and nicklist toggle
  const { handleDropdownPress, handleMenuPress, handleToggleUserList } = useHeaderActions();

  // App Lock Actions - Handle lock button behavior
  const { handleLockButtonPress } = useAppLockActions({
    appLockEnabled,
    appLockUseBiometric,
    appLocked,
    attemptBiometricUnlock,
    safeAlert,
    t,
    setAppLocked,
    setAppUnlockModalVisible,
  });

  // First Run Setup - Handle setup completion flow
  const { handleFirstRunSetupComplete } = useFirstRunSetup({
    setShowFirstRunSetup,
    handleConnect,
  });

  // Tab Context Menu - Handle tab long press menu options
  const { handleTabLongPress } = useTabContextMenu({
    activeTabId,
    getNetworkConfigForId,
    getActiveIRCService,
    getActiveUserManagementService,
    handleConnect,
    closeAllChannelsAndQueries,
    normalizeNetworkId,
    primaryNetworkId,
    safeAlert,
    t,
    setTabs,
    setActiveTabId,
    setNetworkName,
    setActiveConnectionId,
    tabSortAlphabetical,
    ircService,
  });

  // IRC Connection Lifecycle - Event listeners and message routing
  useConnectionLifecycle({
    processBatchedMessages,
    safeSetState,
    safeAlert,
    setIsConnected,
    setActiveConnectionId,
    setNetworkName,
    setTabs,
    setActiveTabId,
    setChannelUsers,
    setPing,
    setTypingUser: (network, target, nick, data) => {
      useMessageStore.getState().setTypingUser(network, target, nick, data);
    },
    setMotdSignal,
    networkName,
    activeTabId,
    tabsRef,
    tabSortAlphabetical,
    isConnected,
    messageBatchTimeoutRef,
    pendingMessagesRef,
    motdCompleteRef,
    isMountedRef,
  });

  // Configure DCC port range from settings
  useEffect(() => {
    const loadDcc = async () => {
      const range = await settingsService.getSetting('dccPortRange', { min: 5000, max: 6000 });
      if (range?.min && range?.max) {
        dccFileService.setPortRange(range.min, range.max);
      }
    };
    loadDcc();
  }, []);

  // Listen for DCC file transfers to show alerts (basic notifications)
  useEffect(() => {
    const unsub = dccFileService.onTransferUpdate((transfer) => {
      if (transfer.status === 'completed') {
        safeAlert(
          t('DCC Transfer Complete', { _tags: 'screen:app,file:App.tsx,feature:dcc' }),
          t(
            '{filename} received ({bytes} bytes).',
            {
              filename: transfer.offer.filename,
              bytes: transfer.bytesReceived,
              _tags: 'screen:app,file:App.tsx,feature:dcc',
            }
          )
        );
      } else if (transfer.status === 'failed') {
        safeAlert(
          t('DCC Transfer Failed', { _tags: 'screen:app,file:App.tsx,feature:dcc' }),
          transfer.error || t('Transfer failed.', { _tags: 'screen:app,file:App.tsx,feature:dcc' })
        );
      }

      if (isMountedRef.current) {
        setDccTransfers(dccFileService.list());
      }
    });
    return () => unsub();
  }, [safeAlert, t]); // Removed safeSetState - it's stable but not needed in deps

  useEffect(() => {
    if (!autoConnectFavoriteServer) {
      autoConnectAttemptedRef.current.clear();
    }
  }, [autoConnectFavoriteServer]);

  useEffect(() => {
    if (!autoConnectFavoriteServer || !initialDataLoaded) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const networks = await settingsService.loadNetworks();
        if (cancelled || networks.length === 0) {
          return;
        }

        const startupTargets = networks.filter(n => n.connectOnStartup);
        const favoriteTargets = networks.filter(n => (n.servers || []).some(s => s.favorite));
        let targets = startupTargets.length > 0 ? startupTargets : favoriteTargets;

        if (targets.length === 0 && selectedNetworkName) {
          const selected = networks.find(n => n.name === selectedNetworkName);
          if (selected) {
            targets = [selected];
          }
        }

        if (targets.length === 0 && networks[0]) {
          targets = [networks[0]];
        }

        for (const target of targets) {
          if (!target?.name) continue;
          if (autoConnectAttemptedRef.current.has(target.name)) continue;
          if (connectionManager.hasConnection(target.name)) continue;
          autoConnectAttemptedRef.current.add(target.name);
          await handleConnect(target);
        }
      } catch (err) {
        console.error('Auto-connect favorite server failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoConnectFavoriteServer, initialDataLoaded, selectedNetworkName, handleConnect]);

  // Auto-join channels after registration
  useAutoJoinChannels({
    isConnected,
    activeConnectionId,
    selectedNetworkName,
    getActiveIRCService,
    motdCompleteRef,
    motdSignal,
  });


  // Remove handleAddPress as its logic is now merged into handleDropdownPress
  // const handleAddPress = useCallback(() => { /* ... (old code removed) ... */ }, [handleConnect, isConnected]);

  // UI ready delay to prevent Fabric race condition
  const [uiReady, setUiReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setUiReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const showNicklistButton = activeTab.type === 'channel';
  const focusedNetworkId =
    activeTab?.networkId ||
    activeConnectionId ||
    (networkName !== 'Not connected' ? networkName : undefined) ||
    tabs.find(t => t.type === 'server')?.networkId;

  const renderUserList = (position: 'left' | 'right' | 'top' | 'bottom') => {
    if (activeTab.type !== 'channel' || !showUserList) {
      return null;
    }
    return (
      <UserList
        users={activeUsers}
        channelName={activeTab.name}
        network={activeTab?.networkId}
        position={position}
        onUserPress={async (user) => {
          // Open query window or perform action
          const queryId = queryTabId(activeTab.networkId, user.nick);
          const queryTab = tabs.find(t => t.id === queryId && t.type === 'query');
          if (queryTab) {
            setActiveTabId(queryTab.id);
          } else {
            // Create new query tab
            const network = activeTab.networkId || '';
            const isEncrypted = await encryptedDMService.isEncryptedForNetwork(network, user.nick);
            const newQueryTab: ChannelTab = {
              id: queryId,
              name: user.nick,
              type: 'query',
              networkId: activeTab.networkId,
              messages: [],
              isEncrypted,
            };
            setTabs((prev) => sortTabsGrouped([...prev, newQueryTab], tabSortAlphabetical));
            setActiveTabId(newQueryTab.id);
          }
        }}
        onWHOISPress={(nick) => {
          useUIStore.getState().setWhoisNick(nick);
          useUIStore.getState().setShowWHOIS(true);
        }}
      />
    );
  };

  // Wait for UI to be ready to prevent Fabric crashes
  if (!uiReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <HeaderBar
        networkName={isConnected ? networkName : (selectedNetworkName || networkName)}
        ping={ping}
        isConnected={isConnected}
        onDropdownPress={handleDropdownPress}
        onMenuPress={handleMenuPress}
        onConnectPress={() => handleConnect()}
        showNicklistButton={showNicklistButton}
        onToggleNicklist={handleToggleUserList}
        showLockButton={appLockEnabled}
        lockState={appLocked ? 'locked' : 'unlocked'}
        onLockPress={handleLockButtonPress}
        showEncryptionButton={activeTab.type === 'query'}
        onEncryptionPress={() => useUIStore.getState().setShowQueryEncryptionMenu(true)}
      />
      {layoutConfig.tabPosition === 'top' && (
        <ChannelTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabPress={handleTabPress}
          onTabLongPress={handleTabLongPress}
          showEncryptionIndicators={showEncryptionIndicators}
          position="top"
        />
      )}
      <View
        style={[
          styles.contentArea,
          (layoutConfig.tabPosition === 'left' || layoutConfig.tabPosition === 'right') && styles.contentAreaRow,
        ]}>
        {layoutConfig.tabPosition === 'left' && (
          <ChannelTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onTabPress={handleTabPress}
            onTabLongPress={handleTabLongPress}
            showEncryptionIndicators={showEncryptionIndicators}
            position="left"
          />
        )}
        <View
          style={[
            styles.messageAndUser,
            (layoutConfig.userListPosition === 'left' || layoutConfig.userListPosition === 'right') && styles.messageAndUserRow,
            (layoutConfig.userListPosition === 'top' || layoutConfig.userListPosition === 'bottom') && styles.messageAndUserColumn,
          ]}>
          {layoutConfig.userListPosition === 'top' && renderUserList('top')}
          {layoutConfig.userListPosition === 'left' && renderUserList('left')}
          <View style={styles.messageAreaContainer}>
            <MessageArea
              messages={activeMessages}
              showRawCommands={showRawCommands}
              rawCategoryVisibility={rawCategoryVisibility}
              hideJoinMessages={hideJoinMessages}
              hidePartMessages={hidePartMessages}
              hideQuitMessages={hideQuitMessages}
              hideIrcServiceListenerMessages={hideIrcServiceListenerMessages}
              channel={activeTab.type === 'channel' ? activeTab.name : undefined}
              network={activeTab?.networkId}
              bottomInset={safeAreaInsets.bottom}
            />
          </View>
          {layoutConfig.userListPosition === 'right' && renderUserList('right')}
          {layoutConfig.userListPosition === 'bottom' && renderUserList('bottom')}
        </View>
        {layoutConfig.tabPosition === 'right' && (
          <ChannelTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onTabPress={handleTabPress}
            onTabLongPress={handleTabLongPress}
            showEncryptionIndicators={showEncryptionIndicators}
            position="right"
          />
        )}
      </View>
      {layoutConfig.tabPosition === 'bottom' && (
        <ChannelTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabPress={handleTabPress}
          onTabLongPress={handleTabLongPress}
          showEncryptionIndicators={showEncryptionIndicators}
          position="bottom"
        />
      )}
      {activeTab && typingUsers.get(activeTab.networkId)?.get(activeTab.name) && (
        <TypingIndicator typingUsers={typingUsers.get(activeTab.networkId)!.get(activeTab.name)!} />
      )}
      {bannerVisible && (
        <View style={styles.bannerAdContainer}>
          <BannerAd
            unitId={bannerAdService.getBannerAdUnitId()}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: !bannerAdService.canShowPersonalizedAds(),
            }}
            onAdFailedToLoad={(error) => {
              console.error('Banner ad failed to load:', error);
            }}
          />
        </View>
      )}
      <MessageInput
        placeholder="Enter a message"
        onSubmit={handleSendMessage}
        disabled={!isConnected}
        prefilledMessage={prefillMessage || undefined}
        onPrefillUsed={() => useUIStore.getState().setPrefillMessage(null)}
        bottomInset={safeAreaInsets.bottom}
        tabType={activeTab?.type}
        tabName={activeTab?.name}
      />

      {/* First Run Setup Modal */}
      {showFirstRunSetup && (
        <Modal
          visible={showFirstRunSetup}
          animationType="slide"
          onRequestClose={() => {
            // Allow dismissing after completion
            setShowFirstRunSetup(false);
          }}>
          <FirstRunSetupScreen
            onComplete={handleFirstRunSetupComplete}
            onSkip={() => {
              // User chose "Connect Later" - just close the modal
              setShowFirstRunSetup(false);
            }}
          />
        </Modal>
      )}

      {showOptionsMenu && (
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowOptionsMenu(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowOptionsMenu(false)}>
            <View style={styles.optionsMenu}>
              {isConnected ? (
                <>
                  <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); useUIStore.getState().setShowChannelModal(true); }}>
                    <Text style={styles.optionText}>Join Channel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionItem}
                  onPress={() => {
                    useUIStore.getState().setShowOptionsMenu(false);
                    setTabs(prev => sortTabsGrouped(prev.filter(t => !(focusedNetworkId && t.networkId === focusedNetworkId && t.type === 'channel')), tabSortAlphabetical));
                  }}>
                    <Text style={styles.optionText}>Close All Channels</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      useUIStore.getState().setShowOptionsMenu(false);
                      setTabs(prev => sortTabsGrouped(prev.filter(t => !(focusedNetworkId && t.networkId === focusedNetworkId && t.type === 'query')), tabSortAlphabetical));
                    }}>
                    <Text style={styles.optionText}>Close All Privates</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionItem} onPress={() => {
                    useUIStore.getState().setShowOptionsMenu(false);
                    if (focusedNetworkId) {
                      connectionManager.disconnect(focusedNetworkId);
                      setActiveConnectionId(connectionManager.getActiveNetworkId());
                    }
                  }}>
                    <Text style={[styles.optionText, styles.destructiveOption]}>Disconnect {networkName || ''}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); useUIStore.getState().setShowNetworksList(true); }}>
                    <Text style={styles.optionText}>Connect Another Network</Text>
                  </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); useUIStore.getState().setShowChannelList(true); }}>
                <Text style={styles.optionText}>Browse Channels</Text>
              </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); handleConnect(); }}>
                    <Text style={styles.optionText}>Connect to Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); useUIStore.getState().setShowNetworksList(true); }}>
                    <Text style={styles.optionText}>Choose Network</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      useUIStore.getState().setShowOptionsMenu(false);
                      setTabs(prev => sortTabsGrouped(prev.filter(t => !(focusedNetworkId && t.networkId === focusedNetworkId && t.type === 'channel'))));
                    }}>
                    <Text style={styles.optionText}>Close All Channels</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      useUIStore.getState().setShowOptionsMenu(false);
                      setTabs(prev => sortTabsGrouped(prev.filter(t => !(focusedNetworkId && t.networkId === focusedNetworkId && t.type === 'query'))));
                    }}>
                    <Text style={styles.optionText}>Close All Privates</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); useUIStore.getState().setShowDccTransfers(true); }}>
                <Text style={styles.optionText}>DCC Transfers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); persistentSetShowRawCommands(!showRawCommands); }}>
                <Text style={styles.optionText}>{showRawCommands ? 'Hide RAW' : 'Show RAW'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => { useUIStore.getState().setShowOptionsMenu(false); handleExit(); }}>
                <Text style={[styles.optionText, styles.destructiveOption]}>Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => useUIStore.getState().setShowOptionsMenu(false)}>
                <Text style={styles.optionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      <Modal
        visible={showChannelModal}
        transparent
        animationType="fade"
        onRequestClose={() => useUIStore.getState().setShowChannelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Channel</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter channel name (e.g., #android)"
              value={channelName}
              onChangeText={setChannelName}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => handleJoinChannel()}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  useUIStore.getState().setShowChannelModal(false);
                  useUIStore.getState().setChannelName('');
                }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonJoin]}
                onPress={() => handleJoinChannel()}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {showNetworksList && (
        <NetworksListScreen
          onSelectNetwork={(network, serverId) => handleConnect(network, serverId)}
          onClose={() => useUIStore.getState().setShowNetworksList(false)}
        />
      )}
      {showSettings && (
        <SettingsScreen
          visible={showSettings}
          onClose={() => useUIStore.getState().setShowSettings(false)}
          currentNetwork={activeTab?.networkId}
          showRawCommands={showRawCommands}
          onShowRawCommandsChange={persistentSetShowRawCommands}
          rawCategoryVisibility={rawCategoryVisibility}
          onRawCategoryVisibilityChange={persistentSetRawCategoryVisibility}
          showEncryptionIndicators={showEncryptionIndicators}
          onShowEncryptionIndicatorsChange={persistentSetShowEncryptionIndicators}
          onShowIgnoreList={() => useUIStore.getState().setShowIgnoreList(true)}
          onShowPurchaseScreen={() => useUIStore.getState().setShowPurchaseScreen(true)}
        />
      )}
      {showPurchaseScreen && (
        <PurchaseScreen
          visible={showPurchaseScreen}
          onClose={() => useUIStore.getState().setShowPurchaseScreen(false)}
        />
      )}
      {showIgnoreList && (
        <IgnoreListScreen
          visible={showIgnoreList}
          network={activeTab?.networkId}
          onClose={() => useUIStore.getState().setShowIgnoreList(false)}
        />
      )}
      {showWHOIS && (
        <WHOISDisplay
          visible={showWHOIS}
          nick={whoisNick}
          network={activeTab?.networkId}
          onClose={() => {
            useUIStore.getState().setShowWHOIS(false);
            useUIStore.getState().setWhoisNick('');
          }}
        />
      )}
      {showQueryEncryptionMenu && activeTab.type === 'query' && (
        <QueryEncryptionMenu
          visible={showQueryEncryptionMenu}
          onClose={() => useUIStore.getState().setShowQueryEncryptionMenu(false)}
          nick={activeTab.name}
          network={activeTab.networkId}
        />
      )}
      {showChannelList && (
        <ChannelListScreen
          visible={showChannelList}
          network={activeTab?.networkId}
          onClose={() => useUIStore.getState().setShowChannelList(false)}
          onJoinChannel={handleJoinChannel}
        />
      )}
      {showChannelNoteModal && channelNoteTarget && (
        <Modal
          visible={showChannelNoteModal}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowChannelNoteModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowChannelNoteModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Channel Note ({channelNoteTarget.channel})</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                multiline
                placeholder="Enter a note for this channel"
                value={channelNoteValue}
                onChangeText={setChannelNoteValue}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => useUIStore.getState().setShowChannelNoteModal(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={async () => {
                    await channelNotesService.setNote(channelNoteTarget.networkId, channelNoteTarget.channel, channelNoteValue);
                    useUIStore.getState().setShowChannelNoteModal(false);
                  }}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showChannelLogModal && (
        <Modal
          visible={showChannelLogModal}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowChannelLogModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowChannelLogModal(false)}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Channel Activity</Text>
              <View style={{ maxHeight: 300 }}>
                {channelLogEntries.length === 0 ? (
                  <Text style={styles.optionText}>No activity recorded</Text>
                ) : (
                  channelLogEntries.map((entry, idx) => (
                    <Text key={`log-${idx}`} style={styles.optionText}>
                      {new Date(entry.timestamp).toLocaleString()} - {entry.text}
                    </Text>
                  ))
                )}
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => useUIStore.getState().setShowChannelLogModal(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={async () => {
                    if (channelNoteTarget) {
                      await channelNotesService.clearLog(channelNoteTarget.networkId, channelNoteTarget.channel);
                      useUIStore.getState().setChannelLogEntries([]);
                    }
                  }}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Clear Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showRenameModal && renameTargetTabId && (
        <Modal
          visible={showRenameModal}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowRenameModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowRenameModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename Server Tab</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter new name"
                value={renameValue}
                onChangeText={setRenameValue}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => {
                  setTabs(prev => prev.map(t => t.id === renameTargetTabId ? { ...t, name: renameValue || t.name } : t));
                  useUIStore.getState().setShowRenameModal(false);
                }}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => useUIStore.getState().setShowRenameModal(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={() => {
                    setTabs(prev => prev.map(t => t.id === renameTargetTabId ? { ...t, name: renameValue || t.name } : t));
                    useUIStore.getState().setShowRenameModal(false);
                  }}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showTabOptionsModal && (
        <Modal
          visible={showTabOptionsModal}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowTabOptionsModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowTabOptionsModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{tabOptionsTitle || 'Options'}</Text>
              {tabOptions.map((opt, idx) => (
                <TouchableOpacity
                  key={`${opt.text}-${idx}`}
                  style={[styles.modalButton, opt.style === 'destructive' && styles.modalButtonCancel]}
                  onPress={() => {
                    useUIStore.getState().setShowTabOptionsModal(false);
                    opt.onPress && opt.onPress();
                  }}>
                  <Text
                    style={[
                      styles.modalButtonText,
                      opt.style === 'destructive' && styles.destructiveOption,
                    ]}>
                    {opt.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showChannelSettings && channelSettingsTarget && channelSettingsNetwork && (
        <ChannelSettingsScreen
          visible={showChannelSettings}
          channel={channelSettingsTarget}
          network={channelSettingsNetwork}
          onClose={() => useUIStore.getState().setShowChannelSettings(false)}
        />
      )}
      {showDccTransfers && (
        <Modal
          visible={showDccTransfers}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowDccTransfers(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowDccTransfers(false)}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>DCC Transfers</Text>
              {dccTransfers.length === 0 ? (
                <Text style={styles.optionText}>No transfers</Text>
              ) : (
                dccTransfers.map(t => {
                  const percent = t.size ? Math.min(100, Math.floor((t.bytesReceived / t.size) * 100)) : undefined;
                  return (
                    <View key={t.id} style={{ marginBottom: 12 }}>
                      <Text style={styles.optionText}>{t.offer.filename} ({t.direction})</Text>
                      <Text style={styles.optionText}>Status: {t.status} {percent !== undefined ? `- ${percent}%` : ''}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {t.status === 'pending' && t.direction === 'incoming' && (
                          <TouchableOpacity
                            onPress={async () => {
                              const RNFS = require('react-native-fs');
                              const path = `${RNFS.DocumentDirectoryPath}/${t.offer.filename}`;
                              await dccFileService.accept(t.id, getActiveIRCService(), path);
                            }}>
                            <Text style={styles.optionText}>Accept</Text>
                          </TouchableOpacity>
                        )}
                        {(t.status === 'failed' || t.status === 'cancelled') && t.filePath && (
                          <TouchableOpacity
                            onPress={async () => {
                              await dccFileService.accept(t.id, getActiveIRCService(), t.filePath || `${require('react-native-fs').DocumentDirectoryPath}/${t.offer.filename}`);
                            }}>
                            <Text style={styles.optionText}>Resume</Text>
                          </TouchableOpacity>
                        )}
                        {(t.status === 'downloading' || t.status === 'pending' || t.status === 'sending') && (
                          <TouchableOpacity onPress={() => dccFileService.cancel(t.id)}>
                            <Text style={[styles.optionText, styles.destructiveOption]}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showDccSendModal && dccSendTarget && (
        <Modal
          visible={showDccSendModal}
          transparent
          animationType="fade"
          onRequestClose={() => useUIStore.getState().setShowDccSendModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => useUIStore.getState().setShowDccSendModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Offer DCC Send to {dccSendTarget.nick}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter file path on device"
                value={dccSendPath}
                onChangeText={setDccSendPath}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => useUIStore.getState().setShowDccSendModal(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={async () => {
                    try {
                      await dccFileService.sendFile(getActiveIRCService(), dccSendTarget.nick, dccSendTarget.networkId, dccSendPath);
                      useUIStore.getState().setShowDccSendModal(false);
                      useUIStore.getState().setDccSendPath('');
                    } catch (e) {
                      safeAlert(
                        t('DCC Send Error', { _tags: 'screen:app,file:App.tsx,feature:dcc' }),
                        e instanceof Error
                          ? e.message
                          : t('Failed to send file', { _tags: 'screen:app,file:App.tsx,feature:dcc' })
                      );
                    }
                  }}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      <Modal
        visible={appUnlockModalVisible && appLockEnabled}
        transparent
        animationType="fade"
        onRequestClose={() => {}}>
        <View style={styles.lockOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>App Locked</Text>
            {appLockUsePin && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter PIN"
                  value={appPinEntry}
                  onChangeText={(text) => {
                    const sanitized = text.replace(/[^0-9]/g, '');
                    setAppPinEntry(sanitized);
                    if (appPinError) setAppPinError('');
                  }}
                  keyboardType="numeric"
                  secureTextEntry
                />
                {!!appPinError && (
                  <Text style={[styles.optionText, { color: colors.error }]}>
                    {appPinError}
                  </Text>
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              {appLockUseBiometric && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={() => attemptBiometricUnlock()}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Use Biometrics
                  </Text>
                </TouchableOpacity>
              )}
              {appLockUsePin && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonJoin]}
                  onPress={handleAppPinUnlock}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Unlock
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

;const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentArea: {
    flex: 1,
    flexDirection: 'column',
  },
  contentAreaRow: {
    flexDirection: 'row',
  },
  messageAndUser: {
    flex: 1,
  },
  messageAndUserRow: {
    flexDirection: 'row',
  },
  messageAndUserColumn: {
    flexDirection: 'column',
  },
  messageAreaContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    minWidth: 0,
  },
  userListToggle: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -15 }],
    width: 30,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    zIndex: 10,
  },
  userListToggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockOverlay: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
  modalContent: {
    backgroundColor: colors.modalBackground,
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.modalText,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  modalButtonCancel: {
    backgroundColor: colors.buttonSecondary,
  },
  modalButtonJoin: {
    backgroundColor: colors.buttonPrimary,
  },
  modalButtonText: {
    fontSize: 14,
    color: colors.buttonSecondaryText,
  },
  modalButtonTextPrimary: {
    color: colors.buttonPrimaryText,
    fontWeight: '600',
  },
  optionsMenu: {
    backgroundColor: colors.modalBackground,
    borderRadius: 8,
    padding: 10,
    width: '80%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  optionItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontSize: 16,
    color: colors.modalText,
    textAlign: 'center',
  },
  destructiveOption: {
    color: colors.error,
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default App;
