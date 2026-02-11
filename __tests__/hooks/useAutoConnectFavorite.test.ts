/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * useAutoConnectFavorite.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAutoConnectFavorite } from '../../src/hooks/useAutoConnectFavorite';

const mockStorage: Map<string, string> = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    getItem: jest.fn(async (key: string) => mockStorage.get(key) || null),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));

jest.mock('../../src/services/SettingsService', () => ({
  settingsService: {
    loadNetworks: jest.fn(async () => []),
  },
}));
const mockSettingsService = jest.requireMock<any>('../../src/services/SettingsService').settingsService;

jest.mock('../../src/services/ConnectionManager', () => ({
  connectionManager: {
    hasConnection: jest.fn(() => false),
  },
}));
const mockConnectionManager = jest.requireMock<any>('../../src/services/ConnectionManager').connectionManager;

const baseNetwork = { id: 'net-1', name: 'DBase', nick: 'Nick', realname: 'User', servers: [{ id: 's1', hostname: 'irc.test.com', port: 6697, ssl: true }] };

describe('useAutoConnectFavorite', () => {
  const mockHandleConnect = jest.fn(async () => {});
  let autoConnectAttemptedRef: React.MutableRefObject<Set<string>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    autoConnectAttemptedRef = { current: new Set<string>() };
    mockConnectionManager.hasConnection.mockReturnValue(false);
  });

  it('should not auto-connect when disabled', async () => {
    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: false,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should not auto-connect when data not loaded', async () => {
    mockSettingsService.loadNetworks.mockResolvedValue([baseNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: false,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should auto-connect to connectOnStartup networks', async () => {
    const startupNetwork = { ...baseNetwork, connectOnStartup: true };
    mockSettingsService.loadNetworks.mockResolvedValue([startupNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await waitFor(() => {
      expect(mockHandleConnect).toHaveBeenCalledWith(startupNetwork);
    });
  });

  it('should auto-connect to favorite server networks', async () => {
    const favNetwork = { ...baseNetwork, servers: [{ ...baseNetwork.servers[0], favorite: true }] };
    mockSettingsService.loadNetworks.mockResolvedValue([favNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await waitFor(() => {
      expect(mockHandleConnect).toHaveBeenCalledWith(favNetwork);
    });
  });

  it('should fall back to selected network when no startup/favorites', async () => {
    mockSettingsService.loadNetworks.mockResolvedValue([baseNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: 'DBase',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await waitFor(() => {
      expect(mockHandleConnect).toHaveBeenCalledWith(baseNetwork);
    });
  });

  it('should fall back to first network when nothing else matches', async () => {
    mockSettingsService.loadNetworks.mockResolvedValue([baseNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: 'NonExistent',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await waitFor(() => {
      expect(mockHandleConnect).toHaveBeenCalledWith(baseNetwork);
    });
  });

  it('should not connect to already attempted networks', async () => {
    autoConnectAttemptedRef.current.add('DBase');
    mockSettingsService.loadNetworks.mockResolvedValue([baseNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should not connect to already connected networks', async () => {
    mockConnectionManager.hasConnection.mockReturnValue(true);
    mockSettingsService.loadNetworks.mockResolvedValue([baseNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should clear attempted connections when setting is disabled', () => {
    autoConnectAttemptedRef.current.add('DBase');

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: false,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    expect(autoConnectAttemptedRef.current.size).toBe(0);
  });

  it('should not connect when no networks exist', async () => {
    mockSettingsService.loadNetworks.mockResolvedValue([]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockSettingsService.loadNetworks.mockRejectedValue(new Error('Load failed'));

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });

  it('should skip networks with empty name', async () => {
    const noNameNetwork = { ...baseNetwork, name: '' };
    mockSettingsService.loadNetworks.mockResolvedValue([noNameNetwork]);

    renderHook(() => useAutoConnectFavorite({
      autoConnectFavoriteServer: true,
      initialDataLoaded: true,
      selectedNetworkName: '',
      handleConnect: mockHandleConnect,
      autoConnectAttemptedRef,
    }));

    await act(async () => {});
    expect(mockHandleConnect).not.toHaveBeenCalled();
  });
});
