import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { keyboardShortcutService } from '../services/KeyboardShortcutService';
import { useTabStore } from '../stores/tabStore';
import { useUIStore } from '../stores/uiStore';
import type { ChannelTab } from '../types';

interface UseKeyboardShortcutsParams {
  tabsRef: MutableRefObject<ChannelTab[]>;
  setActiveTabId: (id: string) => void;
}

export const useKeyboardShortcuts = (params: UseKeyboardShortcutsParams) => {
  const { tabsRef, setActiveTabId } = params;

  useEffect(() => {
    const nextTab = () => {
      const currentTabs = tabsRef.current;
      const currentActiveTabId = useTabStore.getState().activeTabId;
      const idx = currentTabs.findIndex(t => t.id === currentActiveTabId);
      const nextIdx = (idx + 1) % currentTabs.length;
      setActiveTabId(currentTabs[nextIdx].id);
    };
    const prevTab = () => {
      const currentTabs = tabsRef.current;
      const currentActiveTabId = useTabStore.getState().activeTabId;
      const idx = currentTabs.findIndex(t => t.id === currentActiveTabId);
      const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length;
      setActiveTabId(currentTabs[prevIdx].id);
    };
    const openAdd = () => useUIStore.getState().setShowChannelModal(true);
    const openSettings = () => useUIStore.getState().setShowSettings(true);
    keyboardShortcutService.registerShortcut('Ctrl+Tab', nextTab);
    keyboardShortcutService.registerShortcut('Ctrl+Shift+Tab', prevTab);
    keyboardShortcutService.registerShortcut('Ctrl+N', openAdd);
    keyboardShortcutService.registerShortcut('Ctrl+S', openSettings);
    return () => {
      keyboardShortcutService.unregisterShortcut('Ctrl+Tab', nextTab);
      keyboardShortcutService.unregisterShortcut('Ctrl+Shift+Tab', prevTab);
      keyboardShortcutService.unregisterShortcut('Ctrl+N', openAdd);
      keyboardShortcutService.unregisterShortcut('Ctrl+S', openSettings);
    };
  }, [setActiveTabId, tabsRef]);
};
