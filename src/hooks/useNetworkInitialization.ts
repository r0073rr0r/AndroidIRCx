import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsService } from '../services/SettingsService';
import { tabService } from '../services/TabService';
import { messageHistoryService } from '../services/MessageHistoryService';
import { useTabStore } from '../stores/tabStore';
import { serverTabId, makeServerTab } from '../utils/tabUtils';

interface UseNetworkInitializationParams {
  isCheckingFirstRun: boolean;
  showFirstRunSetup: boolean;
  primaryNetworkId: string | null;
  tabs: any[];
  setSelectedNetworkName: (name: string) => void;
  setNetworkName: (name: string) => void;
  setPrimaryNetworkId: (id: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveTabId: (id: string) => void;
  setInitialDataLoaded: (loaded: boolean) => void;
}

/**
 * Hook that handles network initialization and tab management
 * - Loads default network and initial tabs on mount
 * - Cleans up invalid tabs from state and storage
 * - Persists tabs to storage with debouncing
 */
export const useNetworkInitialization = (params: UseNetworkInitializationParams) => {
  const {
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
  } = params;

  // Load default network name and initial tabs on mount (skip if first run)
  useEffect(() => {
    if (isCheckingFirstRun || showFirstRunSetup) {
      return; // Don't load data if we're showing first run setup
    }

    const loadInitialData = async () => {
      let initialNetworkName = 'default';
      try {
        const networks = await settingsService.loadNetworks();
        if (networks.length > 0) {
          const dbaseNetwork = networks.find(n => n.name === 'DBase');
          const networkToUse = dbaseNetwork || networks.find(n => n.servers && n.servers.length > 0) || networks[0];
          if (networkToUse && networkToUse.name) {
            initialNetworkName = networkToUse.name;
          }
        }
        setSelectedNetworkName(initialNetworkName);
        setNetworkName(initialNetworkName);
        if (!primaryNetworkId) {
          setPrimaryNetworkId(initialNetworkName);
        }

        // Clean up any old "Not connected" tabs from storage
        try {
          await AsyncStorage.removeItem('TABS_Not connected');
          console.log('✅ Cleaned up old "Not connected" tabs from storage');
        } catch (err) {
          console.warn('Failed to clean up "Not connected" tabs:', err);
        }

        // Load tabs for the network
        const loadedTabs = await tabService.getTabs(initialNetworkName);
        // Filter out any "Not connected" tabs from storage
        const tabsNormalized = loadedTabs
          .filter(tab => tab.networkId !== 'Not connected' && tab.name !== 'Not connected')
          .map(tab => ({
            ...tab,
            networkId: tab.networkId || initialNetworkName,
            id: tab.id.includes('::') ? tab.id : (tab.type === 'server' ? serverTabId(initialNetworkName) : tab.id),
          }));
        const ensuredServer = tabsNormalized.some(t => t.type === 'server') ? tabsNormalized : [makeServerTab(initialNetworkName), ...tabsNormalized];

        // Load message history for each tab
        const tabsWithHistory = await Promise.all(
          ensuredServer.map(async (tab) => {
            // Use 'server' for server tabs, tab.name for channels/queries
            const channelKey = tab.type === 'server' ? 'server' : tab.name;
            const history = await messageHistoryService.loadMessages(tab.networkId, channelKey);
            return { ...tab, messages: history };
          })
        );

        setTabs(tabsWithHistory);
        const initialServerId = serverTabId(initialNetworkName);
        setActiveTabId(initialServerId);

      } catch (error) {
        console.error('Error loading initial data:', error);
        // Set default tabs on error
        const fallback = makeServerTab('default');
        setTabs([fallback]);
        if (!primaryNetworkId) {
          setPrimaryNetworkId(fallback.networkId);
        }
        setActiveTabId(fallback.id);
      }
    };
    loadInitialData().finally(() => setInitialDataLoaded(true));
  }, [isCheckingFirstRun, showFirstRunSetup]);

  // Clean up invalid tabs from state - run only on mount to avoid infinite loops
  useEffect(() => {
    const currentTabs = useTabStore.getState().tabs;
    const invalidTabs = currentTabs.filter(t =>
      t.name === 'Not connected' ||
      t.networkId === 'Not connected' ||
      t.networkId === '' ||
      !t.networkId
    );

    if (invalidTabs.length > 0) {
      console.log('🔴 WARNING: Found invalid tabs on mount, removing:', invalidTabs.map(t => ({ id: t.id, name: t.name, networkId: t.networkId })));
      console.trace('Stack trace for invalid tab detection');

      // Remove invalid tabs immediately
      const validTabs = currentTabs.filter(t =>
        t.name !== 'Not connected' &&
        t.networkId !== 'Not connected' &&
        t.networkId !== '' &&
        t.networkId
      );
      setTabs(validTabs);
    }
  }, []); // Run only on mount to prevent infinite loops

  // Save tabs whenever they change - debounced to avoid infinite loops
  useEffect(() => {
    // Debounced save - only save after tabs stabilize
    const timeoutId = setTimeout(() => {
      const currentTabs = useTabStore.getState().tabs;
      const networks = Array.from(new Set(currentTabs.map(t => t.networkId)));

      networks.forEach(net => {
        // Skip saving for invalid network IDs
        if (!net || net === 'Not connected' || net === '') {
          return;
        }
        const netTabs = currentTabs.filter(t => t.networkId === net);
        if (net && netTabs.length > 0) {
          tabService.saveTabs(net, netTabs);
        }
      });
    }, 500); // Wait 500ms after last change

    return () => clearTimeout(timeoutId);
  }, [tabs]); // Keep dependency but debounce
};
