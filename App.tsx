/**
 * AndroidIRCX - IRC Client
 * @format
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StatusBar,
  View,
  Alert,
  TextInput,
  Modal,
  Text,
  TouchableOpacity,
  AppState,
  LogBox,
} from 'react-native';
import { createStyles } from './App.styles';

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
import { AppLayout } from './src/components/AppLayout';
import { AppModals } from './src/components/AppModals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ircService, IRCMessage, IRCConnectionConfig, ChannelUser, RawMessageCategory } from './src/services/IRCService';
import { settingsService, IRCNetworkConfig, IRCServerConfig, DEFAULT_SERVER, DEFAULT_PART_MESSAGE } from './src/services/SettingsService';
import { connectionManager } from './src/services/ConnectionManager';
import { messageHistoryService } from './src/services/MessageHistoryService';
import { biometricAuthService } from './src/services/BiometricAuthService';
import { secureStorageService } from './src/services/SecureStorageService';
import { errorReportingService } from './src/services/ErrorReportingService';
import { logger } from './src/services/Logger';
import { adRewardService } from './src/services/AdRewardService';
import { bannerAdService } from './src/services/BannerAdService';
import { inAppPurchaseService } from './src/services/InAppPurchaseService';
import { consentService } from './src/services/ConsentService';
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
import { useUIStore } from './src/stores/uiStore';
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
import { useStoreSetters } from './src/hooks/useStoreSetters';
import { useUIState } from './src/hooks/useUIState';
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
import { useDccConfig } from './src/hooks/useDccConfig';
import { useDccNotifications } from './src/hooks/useDccNotifications';
import { useAutoConnectFavorite } from './src/hooks/useAutoConnectFavorite';
import { useUserListActions } from './src/hooks/useUserListActions';
import { useAppInitialization } from './src/hooks/useAppInitialization';
import { useLazyMessageHistory } from './src/hooks/useLazyMessageHistory';
import {
  serverTabId,
  channelTabId,
  queryTabId,
  noticeTabId,
  makeServerTab,
  sortTabsGrouped,
} from './src/utils/tabUtils';
import { getActiveTabSafe } from './src/utils/activeTabUtils';

// Suppress noisy pooled synthetic event warnings that can appear in dev logging
LogBox.ignoreLogs(['This synthetic event is reused for performance reasons.']);

function App() {
  // Initialize Firebase App Check, consent management, AdMob, and error reporting
  useAppInitialization();

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

  // Get all UI state subscriptions from hook (supplements connectionManagerHook and tabManagerHook)
  const uiState = useUIState();
  const {
    showFirstRunSetup,
    isCheckingFirstRun,
    showRawCommands,
    rawCategoryVisibility,
    hideJoinMessages,
    hidePartMessages,
    hideQuitMessages,
    hideIrcServiceListenerMessages,
    typingUsers,
    appLockEnabled,
    appLockUseBiometric,
    appLockUsePin,
    appLockOnLaunch,
    appLockOnBackground,
    appLocked,
    appUnlockModalVisible,
    appPinEntry,
    appPinError,
    bannerVisible,
    scriptingTimeMs,
    adFreeTimeMs,
  } = uiState;

  // Get all store setters from hook
  const setters = useStoreSetters();
  const {
    setActiveTabId,
    setIsConnected,
    setNetworkName,
    setPrimaryNetworkId,
    setActiveConnectionId,
    setPing,
    setTabs,
    setShowFirstRunSetup,
    setIsCheckingFirstRun,
    setShowRawCommands,
    setRawCategoryVisibility,
    setHideJoinMessages,
    setHidePartMessages,
    setHideQuitMessages,
    setHideIrcServiceListenerMessages,
    setTypingUser,
    removeTypingUser,
    clearTypingForTarget,
    cleanupStaleTyping,
    setAppLockEnabled,
    setAppLockUseBiometric,
    setAppLockUsePin,
    setAppLockOnLaunch,
    setAppLockOnBackground,
    setAppLocked,
    setAppUnlockModalVisible,
    setAppPinEntry,
    setAppPinError,
    setBannerVisible,
    setScriptingTimeMs,
    setAdFreeTimeMs,
    setChannelName,
    setChannelNoteValue,
    setRenameValue,
    setDccSendPath,
  } = setters;

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

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
  const [dccTransfers, setDccTransfers] = useState(dccFileService.list());
  const [motdSignal, setMotdSignal] = useState(0);

  // Get modal states from useUIState hook
  const {
    showChannelModal,
    channelName,
    showNetworksList,
    showSettings,
    showPurchaseScreen,
    showIgnoreList,
    showWHOIS,
    whoisNick,
    showQueryEncryptionMenu,
    showChannelList,
    showUserList,
    showChannelSettings,
    channelSettingsTarget,
    channelSettingsNetwork,
    showOptionsMenu,
    showRenameModal,
    renameTargetTabId,
    renameValue,
    showTabOptionsModal,
    tabOptionsTitle,
    tabOptions,
    showChannelNoteModal,
    channelNoteTarget,
    channelNoteValue,
    showChannelLogModal,
    channelLogEntries,
    prefillMessage,
    showDccTransfers,
    showDccSendModal,
    dccSendTarget,
    dccSendPath,
  } = uiState;


  // Get active tab with safe fallback
  const activeTab = getActiveTabSafe(tabs, activeTabId, activeConnectionId, primaryNetworkId, networkName);
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

  // Lazy-load message history when tabs are switched (performance optimization)
  useLazyMessageHistory({ activeTabId });

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
    setTypingUser,
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
  useDccConfig();

  // Listen for DCC file transfers to show alerts (basic notifications)
  useDccNotifications({ safeAlert, t, setDccTransfers, isMountedRef });

  // Auto-connect to favorite servers on startup
  useAutoConnectFavorite({
    autoConnectFavoriteServer,
    initialDataLoaded,
    selectedNetworkName,
    handleConnect,
    autoConnectAttemptedRef,
  });

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

  const showNicklistButton = activeTab?.type === 'channel';
  const focusedNetworkId =
    activeTab?.networkId ||
    activeConnectionId ||
    (networkName !== 'Not connected' ? networkName : undefined) ||
    tabs.find(t => t.type === 'server')?.networkId;

  // User list action handlers
  const { handleUserPress, handleWHOISPress } = useUserListActions({
    tabs,
    activeTab,
    tabSortAlphabetical,
    setTabs,
    setActiveTabId,
  });

  // Wait for UI to be ready to prevent Fabric crashes
  if (!uiReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <AppLayout
        tabs={tabs}
        activeTabId={activeTabId}
        activeTab={activeTab}
        activeMessages={activeMessages}
        activeUsers={activeUsers}
        isConnected={isConnected}
        networkName={networkName}
        selectedNetworkName={selectedNetworkName}
        ping={ping}
        showRawCommands={showRawCommands}
        rawCategoryVisibility={rawCategoryVisibility}
        hideJoinMessages={hideJoinMessages}
        hidePartMessages={hidePartMessages}
        hideQuitMessages={hideQuitMessages}
        hideIrcServiceListenerMessages={hideIrcServiceListenerMessages}
        showEncryptionIndicators={showEncryptionIndicators}
        typingUsers={typingUsers}
        bannerVisible={bannerVisible}
        prefillMessage={prefillMessage}
        layoutConfig={layoutConfig}
        showNicklistButton={showNicklistButton}
        appLockEnabled={appLockEnabled}
        appLocked={appLocked}
        showUserList={showUserList}
        safeAreaInsets={safeAreaInsets}
        styles={styles}
        handleTabPress={handleTabPress}
        handleTabLongPress={handleTabLongPress}
        handleSendMessage={handleSendMessage}
        handleDropdownPress={handleDropdownPress}
        handleMenuPress={handleMenuPress}
        handleConnect={handleConnect}
        handleToggleUserList={handleToggleUserList}
        handleLockButtonPress={handleLockButtonPress}
        handleUserPress={handleUserPress}
        handleWHOISPress={handleWHOISPress}
      />
      <AppModals
        activeTab={activeTab}
        isConnected={isConnected}
        networkName={networkName}
        focusedNetworkId={focusedNetworkId}
        showRawCommands={showRawCommands}
        rawCategoryVisibility={rawCategoryVisibility}
        showEncryptionIndicators={showEncryptionIndicators}
        tabSortAlphabetical={tabSortAlphabetical}
        dccTransfers={dccTransfers}
        channelName={channelName}
        handleConnect={handleConnect}
        handleJoinChannel={handleJoinChannel}
        handleExit={handleExit}
        handleFirstRunSetupComplete={handleFirstRunSetupComplete}
        persistentSetShowRawCommands={persistentSetShowRawCommands}
        persistentSetRawCategoryVisibility={persistentSetRawCategoryVisibility}
        persistentSetShowEncryptionIndicators={persistentSetShowEncryptionIndicators}
        setActiveConnectionId={setActiveConnectionId}
        setTabs={setTabs}
        getActiveIRCService={getActiveIRCService}
        safeAlert={safeAlert}
        attemptBiometricUnlock={attemptBiometricUnlock}
        handleAppPinUnlock={handleAppPinUnlock}
        styles={styles}
        colors={colors}
      />
    </>
  );
}

export default App;
