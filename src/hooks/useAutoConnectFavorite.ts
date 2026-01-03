import { useEffect, useRef } from 'react';
import { settingsService } from '../services/SettingsService';
import { connectionManager } from '../services/ConnectionManager';
import { IRCNetworkConfig } from '../services/SettingsService';

interface UseAutoConnectFavoriteProps {
  autoConnectFavoriteServer: boolean;
  initialDataLoaded: boolean;
  selectedNetworkName: string;
  handleConnect: (network?: IRCNetworkConfig, serverId?: string) => Promise<void>;
  autoConnectAttemptedRef: React.MutableRefObject<Set<string>>;
}

/**
 * Hook to handle auto-connecting to favorite servers on startup
 */
export function useAutoConnectFavorite({
  autoConnectFavoriteServer,
  initialDataLoaded,
  selectedNetworkName,
  handleConnect,
  autoConnectAttemptedRef,
}: UseAutoConnectFavoriteProps) {
  // Clear attempted connections when setting is disabled
  useEffect(() => {
    if (!autoConnectFavoriteServer) {
      autoConnectAttemptedRef.current.clear();
    }
  }, [autoConnectFavoriteServer, autoConnectAttemptedRef]);

  // Auto-connect logic
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
  }, [autoConnectFavoriteServer, initialDataLoaded, selectedNetworkName, handleConnect, autoConnectAttemptedRef]);
}
