/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for AutoReconnectService - Wave 2 coverage target
 */

// Mock must be at the top, before imports
jest.mock('../../src/services/IRCService', () => ({
  ircService: {
    onConnectionChange: jest.fn().mockReturnValue(jest.fn()),
    onMessage: jest.fn().mockReturnValue(jest.fn()),
    on: jest.fn().mockReturnValue(jest.fn()),
    getNetworkName: jest.fn().mockReturnValue('freenode'),
    getCurrentNick: jest.fn().mockReturnValue('TestUser'),
    connect: jest.fn().mockResolvedValue(undefined),
  },
  IRCService: jest.fn().mockImplementation(() => ({
    onConnectionChange: jest.fn().mockReturnValue(jest.fn()),
    onMessage: jest.fn().mockReturnValue(jest.fn()),
    on: jest.fn().mockReturnValue(jest.fn()),
    getNetworkName: jest.fn().mockReturnValue('freenode'),
    getCurrentNick: jest.fn().mockReturnValue('TestUser'),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/services/ConnectionManager', () => ({
  connectionManager: {
    connect: jest.fn().mockResolvedValue('freenode'),
    setActiveConnection: jest.fn(),
    getConnection: jest.fn(),
  },
}));

jest.mock('../../src/services/BouncerService', () => ({
  bouncerService: {
    getBouncerInfo: jest.fn().mockReturnValue({ playbackSupported: false }),
    requestPlayback: jest.fn(),
  },
}));

jest.mock('../../src/services/ChannelFavoritesService', () => ({
  channelFavoritesService: {
    getFavorites: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('../../src/services/SettingsService', () => ({
  settingsService: {
    loadNetworks: jest.fn().mockResolvedValue([]),
    getSetting: jest.fn().mockResolvedValue(true),
  },
  NEW_FEATURE_DEFAULTS: {
    autoJoinFavorites: true,
  },
}));

import { autoReconnectService, AutoReconnectConfig } from '../../src/services/AutoReconnectService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AutoReconnectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AsyncStorage as any).__reset && (AsyncStorage as any).__reset();
    // Reset service state
    (autoReconnectService as any).config = new Map();
    (autoReconnectService as any).connectionStates = new Map();
    (autoReconnectService as any).reconnectTimers = new Map();
    (autoReconnectService as any).isReconnecting = new Map();
    (autoReconnectService as any).lastReconnectTime = new Map();
    (autoReconnectService as any).intentionalDisconnects = new Map();
    (autoReconnectService as any).connectionListeners = new Map();
    (autoReconnectService as any).messageListeners = new Map();
    (autoReconnectService as any).intentionalDisconnectListeners = new Map();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('setConfig / getConfig', () => {
    it('should set and get config for a network', async () => {
      const config: AutoReconnectConfig = {
        enabled: true,
        maxAttempts: 10,
        initialDelay: 1000,
      };

      await autoReconnectService.setConfig('freenode', config);
      const retrieved = autoReconnectService.getConfig('freenode');

      expect(retrieved).toEqual(config);
    });

    it('should return undefined for unset network', () => {
      expect(autoReconnectService.getConfig('non-existent')).toBeUndefined();
    });

    it('should persist config to storage', async () => {
      const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
      
      await autoReconnectService.setConfig('freenode', { enabled: true });

      expect(setItemSpy).toHaveBeenCalledWith(
        '@AndroidIRCX:autoReconnectConfigs',
        expect.any(String)
      );
    });
  });

  describe('setEnabled / isEnabled', () => {
    it('should enable auto-reconnect', async () => {
      await autoReconnectService.setEnabled('freenode', true);
      expect(autoReconnectService.isEnabled('freenode')).toBe(true);
    });

    it('should disable auto-reconnect', async () => {
      await autoReconnectService.setEnabled('freenode', true);
      await autoReconnectService.setEnabled('freenode', false);
      expect(autoReconnectService.isEnabled('freenode')).toBe(false);
    });

    it('should return false for unset network', () => {
      expect(autoReconnectService.isEnabled('non-existent')).toBe(false);
    });

    it('should create default config when enabling', async () => {
      await autoReconnectService.setEnabled('newnetwork', true);
      const config = autoReconnectService.getConfig('newnetwork');
      expect(config?.enabled).toBe(true);
      expect(config?.maxAttempts).toBeDefined();
    });
  });

  describe('saveConnectionState / getConnectionState', () => {
    it('should save and retrieve connection state', async () => {
      const config = { host: 'irc.test.com', port: 6667 } as any;
      const channels = ['#general', '#help'];

      await autoReconnectService.saveConnectionState('freenode', config, channels);
      const state = autoReconnectService.getConnectionState('freenode');

      expect(state).toBeDefined();
      expect(state?.network).toBe('freenode');
      expect(state?.channels).toEqual(channels);
      expect(state?.config).toEqual(config);
    });

    it('should persist state to storage', async () => {
      const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
      
      await autoReconnectService.saveConnectionState('freenode', {} as any, []);

      expect(setItemSpy).toHaveBeenCalledWith(
        '@AndroidIRCX:connectionStates',
        expect.any(String)
      );
    });
  });

  describe('addChannelToState', () => {
    it('should add channel to connection state', async () => {
      await autoReconnectService.saveConnectionState('freenode', {} as any, []);
      autoReconnectService.addChannelToState('freenode', '#general');
      
      const state = autoReconnectService.getConnectionState('freenode');
      expect(state?.channels).toContain('#general');
    });

    it('should not add duplicate channels', async () => {
      await autoReconnectService.saveConnectionState('freenode', {} as any, []);
      autoReconnectService.addChannelToState('freenode', '#general');
      autoReconnectService.addChannelToState('freenode', '#general');
      
      const state = autoReconnectService.getConnectionState('freenode');
      expect(state?.channels).toHaveLength(1);
    });

    it('should handle non-existent network gracefully', () => {
      expect(() => autoReconnectService.addChannelToState('non-existent', '#general')).not.toThrow();
    });
  });

  describe('removeChannelFromState', () => {
    it('should remove channel from connection state', async () => {
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general', '#help']);
      autoReconnectService.removeChannelFromState('freenode', '#general');
      
      const state = autoReconnectService.getConnectionState('freenode');
      expect(state?.channels).not.toContain('#general');
      expect(state?.channels).toContain('#help');
    });

    it('should handle non-existent network gracefully', () => {
      expect(() => autoReconnectService.removeChannelFromState('non-existent', '#general')).not.toThrow();
    });
  });

  describe('clearConnectionState', () => {
    it('should clear connection state for a network', async () => {
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      await autoReconnectService.clearConnectionState('freenode');
      
      expect(autoReconnectService.getConnectionState('freenode')).toBeUndefined();
    });
  });

  describe('markIntentionalDisconnect', () => {
    it('should mark disconnect as intentional', () => {
      autoReconnectService.markIntentionalDisconnect('freenode');
      // The flag should prevent auto-reconnect
      expect((autoReconnectService as any).intentionalDisconnects.has('freenode')).toBe(true);
    });

    it('should cancel pending reconnect', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: true });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      autoReconnectService.markIntentionalDisconnect('freenode');
      
      expect((autoReconnectService as any).intentionalDisconnects.has('freenode')).toBe(true);
    });
  });

  describe('clearIntentionalDisconnect', () => {
    it('should clear intentional disconnect flag', () => {
      autoReconnectService.markIntentionalDisconnect('freenode');
      (autoReconnectService as any).clearIntentionalDisconnect('freenode');
      
      expect((autoReconnectService as any).intentionalDisconnects.has('freenode')).toBe(false);
    });
  });

  describe('cancelReconnect', () => {
    it('should cancel pending reconnect timer', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: true });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      // Start reconnect
      (autoReconnectService as any).isReconnecting.set('freenode', true);
      const timer = setTimeout(() => {}, 10000);
      (autoReconnectService as any).reconnectTimers.set('freenode', timer);
      
      autoReconnectService.cancelReconnect('freenode');
      
      expect((autoReconnectService as any).isReconnecting.get('freenode')).toBe(false);
      expect((autoReconnectService as any).reconnectTimers.has('freenode')).toBe(false);
    });
  });

  describe('registerConnection', () => {
    it('should register listeners for a specific connection', () => {
      const mockInstance = {
        onConnectionChange: jest.fn().mockReturnValue(jest.fn()),
        onMessage: jest.fn().mockReturnValue(jest.fn()),
        on: jest.fn().mockReturnValue(jest.fn()),
        getCurrentNick: jest.fn().mockReturnValue('TestUser'),
      };

      autoReconnectService.registerConnection('freenode', mockInstance as any);

      expect(mockInstance.onConnectionChange).toHaveBeenCalled();
      expect(mockInstance.onMessage).toHaveBeenCalled();
    });

    it('should clean up existing listeners before registering new ones', () => {
      const mockInstance = {
        onConnectionChange: jest.fn().mockReturnValue(jest.fn()),
        onMessage: jest.fn().mockReturnValue(jest.fn()),
        on: jest.fn().mockReturnValue(jest.fn()),
        getCurrentNick: jest.fn().mockReturnValue('TestUser'),
      };

      autoReconnectService.registerConnection('freenode', mockInstance as any);
      autoReconnectService.registerConnection('freenode', mockInstance as any);

      expect(mockInstance.onConnectionChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('unregisterConnection', () => {
    it('should unregister all listeners for a connection', () => {
      const cleanupMock = jest.fn();
      const mockInstance = {
        onConnectionChange: jest.fn().mockReturnValue(cleanupMock),
        onMessage: jest.fn().mockReturnValue(cleanupMock),
        on: jest.fn().mockReturnValue(cleanupMock),
        getCurrentNick: jest.fn().mockReturnValue('TestUser'),
      };

      autoReconnectService.registerConnection('freenode', mockInstance as any);
      autoReconnectService.unregisterConnection('freenode');

      expect(cleanupMock).toHaveBeenCalled();
    });

    it('should handle unregistering non-existent connection gracefully', () => {
      expect(() => autoReconnectService.unregisterConnection('non-existent')).not.toThrow();
    });
  });

  describe('handleDisconnected', () => {
    it('should not reconnect if disconnect was intentional', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: true });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      autoReconnectService.markIntentionalDisconnect('freenode');
      
      // Simulate disconnect
      await (autoReconnectService as any).handleDisconnected('freenode');

      expect((autoReconnectService as any).isReconnecting.get('freenode')).toBeFalsy();
    });

    it('should not reconnect if already reconnecting', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: true });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      (autoReconnectService as any).isReconnecting.set('freenode', true);
      
      await (autoReconnectService as any).handleDisconnected('freenode');
      
      // Should not start another reconnect
      expect((autoReconnectService as any).reconnectTimers.has('freenode')).toBe(false);
    });

    it('should not reconnect if auto-reconnect is disabled', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: false });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      await (autoReconnectService as any).handleDisconnected('freenode');
      
      expect((autoReconnectService as any).isReconnecting.get('freenode')).toBeFalsy();
    });

    it('should not reconnect if max attempts reached', async () => {
      await autoReconnectService.setConfig('freenode', { enabled: true, maxAttempts: 3 });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      const state = autoReconnectService.getConnectionState('freenode');
      if (state) {
        state.reconnectAttempts = 3;
      }
      
      await (autoReconnectService as any).handleDisconnected('freenode');
      
      expect((autoReconnectService as any).isReconnecting.get('freenode')).toBeFalsy();
    });

    it('should use smart reconnect to avoid flood', async () => {
      await autoReconnectService.setConfig('freenode', { 
        enabled: true, 
        smartReconnect: true, 
        minReconnectInterval: 5000 
      });
      await autoReconnectService.saveConnectionState('freenode', {} as any, ['#general']);
      
      // Set last reconnect time to now
      (autoReconnectService as any).lastReconnectTime.set('freenode', Date.now());
      
      await (autoReconnectService as any).handleDisconnected('freenode');
      
      // Should wait before reconnecting
      expect((autoReconnectService as any).isReconnecting.get('freenode')).toBe(true);
    });
  });
});
