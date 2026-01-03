/**
 * useLazyMessageHistory.ts
 *
 * Hook that lazy-loads message history when tabs are switched.
 * Only loads history for the active tab, not all tabs at once.
 * This improves app startup time significantly.
 */

import { useEffect, useRef } from 'react';
import { messageHistoryService } from '../services/MessageHistoryService';
import { useTabStore } from '../stores/tabStore';
import { ChannelTab } from '../types';

interface UseLazyMessageHistoryParams {
  activeTabId: string | null;
}

/**
 * Hook that lazy-loads message history for tabs when they become active.
 * Only loads history if the tab doesn't already have messages loaded.
 */
export function useLazyMessageHistory(params: UseLazyMessageHistoryParams) {
  const { activeTabId } = params;
  const loadedTabsRef = useRef<Set<string>>(new Set());

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
  }, [activeTabId]);

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
