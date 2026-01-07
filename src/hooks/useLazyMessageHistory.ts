/**
 * useLazyMessageHistory.ts
 *
 * Hook that lazy-loads message history when tabs are switched.
 * Only loads history for the active tab, not all tabs at once.
 * This improves app startup time significantly.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';
import { messageHistoryService } from '../services/MessageHistoryService';
import { useTabStore } from '../stores/tabStore';
import { ChannelTab } from '../types';

interface UseLazyMessageHistoryParams {
  activeTabId: string | null;
}

/**
 * Hook that lazy-loads message history for tabs when they become active.
 * Only loads history if the tab doesn't already have messages loaded.
 * Also reloads active tab history when app returns from background.
 */
export function useLazyMessageHistory(params: UseLazyMessageHistoryParams) {
  const { activeTabId } = params;
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Force reload history for a specific tab (used when app returns from background)
  const forceReloadHistory = useCallback(async (tabId: string) => {
    const tabStore = useTabStore.getState();
    const currentTabs = tabStore.tabs;
    const tab = currentTabs.find(t => t.id === tabId);

    if (!tab) {
      return;
    }

    // Skip if network is invalid
    if (!tab.networkId || tab.networkId === 'Not connected') {
      return;
    }

    try {
      // Determine channel key for history lookup
      const channelKey = tab.type === 'server' ? 'server' : tab.name;

      // Load message history for this tab
      console.log(`useLazyMessageHistory: Force reloading history for tab ${tabId} (${tab.networkId}/${channelKey})`);
      const history = await messageHistoryService.loadMessages(
        tab.networkId,
        channelKey
      );

      // Update tab with loaded history
      tabStore.setTabs(
        currentTabs.map(t =>
          t.id === tabId
            ? { ...t, messages: history }
            : t
        )
      );

      console.log(`useLazyMessageHistory: Reloaded ${history.length} messages for tab ${tabId}`);
    } catch (error) {
      console.error(`Error force reloading message history for tab ${tabId}:`, error);
    }
  }, []);

  // Monitor app state changes to reload history when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';

      // When app comes to foreground, reload active tab's history
      if (wasBackground && isActive && activeTabId) {
        console.log('useLazyMessageHistory: App returned from background, scheduling history reload');

        // CRITICAL FIX: Use InteractionManager to defer heavy operations
        // This prevents the lock screen from freezing due to blocking the main thread
        // The reload will happen after all interactions (like modal animations) complete
        InteractionManager.runAfterInteractions(() => {
          console.log('useLazyMessageHistory: Interactions complete, reloading active tab history');
          // Clear the loaded flag for active tab to force reload
          loadedTabsRef.current.delete(activeTabId);
          // Force reload the active tab's history (non-blocking now)
          forceReloadHistory(activeTabId).catch(err => {
            console.error('useLazyMessageHistory: Error reloading history after interactions:', err);
          });
        });
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [activeTabId, forceReloadHistory]);

  useEffect(() => {
    if (!activeTabId) {
      return;
    }

    const loadHistoryForTab = async () => {
      // Skip if already loaded
      if (loadedTabsRef.current.has(activeTabId)) {
        return;
      }

      const tabStore = useTabStore.getState();
      const currentTabs = tabStore.tabs;
      const activeTab = currentTabs.find(t => t.id === activeTabId);

      if (!activeTab) {
        return;
      }

      // Skip if tab already has messages (already loaded)
      if (activeTab.messages && activeTab.messages.length > 0) {
        loadedTabsRef.current.add(activeTabId);
        return;
      }

      // Skip if network is invalid
      if (!activeTab.networkId || activeTab.networkId === 'Not connected') {
        return;
      }

      try {
        // Determine channel key for history lookup
        const channelKey = activeTab.type === 'server' ? 'server' : activeTab.name;

        // Load message history for this tab
        const history = await messageHistoryService.loadMessages(
          activeTab.networkId,
          channelKey
        );

        // Update tab with loaded history
        tabStore.setTabs(
          currentTabs.map(t =>
            t.id === activeTabId
              ? { ...t, messages: history }
              : t
          )
        );

        // Mark as loaded
        loadedTabsRef.current.add(activeTabId);
      } catch (error) {
        console.error(`Error loading message history for tab ${activeTabId}:`, error);
      }
    };

    loadHistoryForTab();
  }, [activeTabId, forceReloadHistory]);

  // Clear loaded cache when tabs change (e.g., on network switch)
  // Subscribe to tabs to detect when they change
  const tabs = useTabStore(state => state.tabs);
  useEffect(() => {
    const currentTabIds = new Set(tabs.map(t => t.id));

    // Remove entries for tabs that no longer exist
    loadedTabsRef.current.forEach(tabId => {
      if (!currentTabIds.has(tabId)) {
        loadedTabsRef.current.delete(tabId);
      }
    });
  }, [tabs.length]); // Only re-run when tab count changes
}
