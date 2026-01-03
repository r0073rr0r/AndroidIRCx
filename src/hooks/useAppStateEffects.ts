import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import type { MutableRefObject } from 'react';
import { tabService } from '../services/TabService';
import { useTabStore } from '../stores/tabStore';
import { messageHistoryBatching } from '../services/MessageHistoryBatching';
import type { ChannelTab } from '../types';

interface PendingAlertPayload {
  title: string;
  message?: string;
  buttons?: any;
}

interface UseAppStateEffectsParams {
  appStateRef: MutableRefObject<string>;
  pendingAlertRef: MutableRefObject<PendingAlertPayload | null>;
  activeConnectionId: string | null;
  primaryNetworkId: string | null;
  setTabs: (updater: ChannelTab[] | ((prev: ChannelTab[]) => ChannelTab[])) => void;
}

export const useAppStateEffects = (params: UseAppStateEffectsParams) => {
  const {
    appStateRef,
    pendingAlertRef,
    activeConnectionId,
    primaryNetworkId,
    setTabs,
  } = params;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      appStateRef.current = nextState;

      // Handle pending alerts
      if (nextState === 'active' && pendingAlertRef.current) {
        const { title, message, buttons } = pendingAlertRef.current;
        pendingAlertRef.current = null;
        Alert.alert(title, message, buttons);
      }

      // Flush message history when going to background to prevent data loss
      if (nextState === 'background' || nextState === 'inactive') {
        messageHistoryBatching.flushSync().catch(err => {
          console.error('Error flushing message history on background:', err);
        });
      }

      // Reload tabs from storage when app becomes active (in case state was lost)
      if (nextState === 'active') {
        const currentTabs = useTabStore.getState().tabs;
        const currentNetworkId = activeConnectionId || primaryNetworkId;

        // Only reload if we have a network and tabs seem to be missing
        if (currentNetworkId && currentTabs.length === 0) {
          try {
            console.log('?? App became active, reloading tabs from storage for network:', currentNetworkId);
            const loadedTabs = await tabService.getTabs(currentNetworkId);
            if (loadedTabs && loadedTabs.length > 0) {
              setTabs(loadedTabs);
              console.log('? Reloaded', loadedTabs.length, 'tabs from storage');
            }
          } catch (error) {
            console.error('? Failed to reload tabs from storage:', error);
          }
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [activeConnectionId, appStateRef, pendingAlertRef, primaryNetworkId, setTabs]);
};
