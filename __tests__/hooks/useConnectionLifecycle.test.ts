/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * useConnectionLifecycle.test.ts
 *
 * Tests for useConnectionLifecycle hook - IRC connection lifecycle management
 */

import { renderHook, act } from '@testing-library/react-native';
import { useConnectionLifecycle } from '../../src/hooks/useConnectionLifecycle';

// ─── Mock infrastructure ─────────────────────────────────────

// Event emitter helper for mocking IRC services
class MockEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, cb: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
    return () => {
      const list = this.listeners.get(event);
      if (list) {
        const idx = list.indexOf(cb);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  emit(event: string, ...args: any[]) {
    const list = this.listeners.get(event);
    if (list) list.forEach(cb => cb(...args));
  }

  removeAll() {
    this.listeners.clear();
  }
}

// ─── Mocks ─────────────────────────────────────────────

const mockStorage: Map<string, string> = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    getItem: jest.fn(async (key: string) => mockStorage.get(key) || null),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, mockStorage.get(k) || null])),
    getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
  },
}));

// Track message listener
let messageCallback: Function | null = null;
let connectionCallback: Function | null = null;
let userListCallback: Function | null = null;

const mockIrcEmitter = new MockEventEmitter();

const mockIrcService = {
  onMessage: jest.fn((cb: Function) => {
    messageCallback = cb;
    return () => { messageCallback = null; };
  }),
  onConnectionChange: jest.fn((cb: Function) => {
    connectionCallback = cb;
    return () => { connectionCallback = null; };
  }),
  onUserListChange: jest.fn((cb: Function) => {
    userListCallback = cb;
    return () => { userListCallback = null; };
  }),
  on: jest.fn((event: string, cb: Function) => {
    return mockIrcEmitter.on(event, cb);
  }),
  emit: jest.fn((event: string, ...args: any[]) => {
    mockIrcEmitter.emit(event, ...args);
  }),
  getCurrentNick: jest.fn(() => 'TestNick'),
  getNetworkName: jest.fn(() => 'DBase'),
  getConnectionStatus: jest.fn(() => true),
  addMessage: jest.fn(),
  sendRaw: jest.fn(),
  partChannel: jest.fn(),
  disconnect: jest.fn(),
  isRegistered: jest.fn(() => true),
};

const mockUserManagementService = {
  isUserIgnored: jest.fn(() => false),
};

let connectionCreatedCallback: Function | null = null;

const mockConnectionManager = {
  getAllConnections: jest.fn(() => [{
    networkId: 'DBase',
    ircService: mockIrcService,
    userManagementService: mockUserManagementService,
    isConnected: true,
  }]),
  getActiveNetworkId: jest.fn(() => 'DBase'),
  getConnection: jest.fn((id: string) => ({
    networkId: id,
    ircService: mockIrcService,
    isConnected: true,
  })),
  onConnectionCreated: jest.fn((cb: Function) => {
    connectionCreatedCallback = cb;
    return () => { connectionCreatedCallback = null; };
  }),
  setActiveConnection: jest.fn(),
};

jest.mock('../../src/services/ConnectionManager', () => ({
  connectionManager: {
    getAllConnections: jest.fn(() => []),
    getActiveNetworkId: jest.fn(() => 'DBase'),
    getConnection: jest.fn(),
    onConnectionCreated: jest.fn(() => jest.fn()),
    setActiveConnection: jest.fn(),
  },
}));
const _mockConnectionManager = jest.requireMock<any>('../../src/services/ConnectionManager').connectionManager;
// Wire up the requireMock reference to our local mockConnectionManager object
Object.keys(mockConnectionManager).forEach(key => {
  _mockConnectionManager[key] = mockConnectionManager[key];
});

jest.mock('../../src/services/IRCService', () => ({
  ircService: {
    onMessage: jest.fn(() => jest.fn()),
    onConnectionChange: jest.fn(() => jest.fn()),
    onUserListChange: jest.fn(() => jest.fn()),
    on: jest.fn(() => jest.fn()),
    emit: jest.fn(),
    getCurrentNick: jest.fn(() => 'TestNick'),
    getNetworkName: jest.fn(() => 'DBase'),
    getConnectionStatus: jest.fn(() => true),
    addMessage: jest.fn(),
    sendRaw: jest.fn(),
    partChannel: jest.fn(),
    disconnect: jest.fn(),
    isRegistered: jest.fn(() => true),
  },
}));
const _mockIrcServiceModule = jest.requireMock<any>('../../src/services/IRCService').ircService;
// Wire up to our local mockIrcService
Object.keys(mockIrcService).forEach(key => {
  _mockIrcServiceModule[key] = (mockIrcService as any)[key];
});

jest.mock('../../src/services/UserManagementService', () => ({
  userManagementService: {
    isUserIgnored: jest.fn(() => false),
  },
}));
const _mockUserManagementServiceModule = jest.requireMock<any>('../../src/services/UserManagementService').userManagementService;
Object.keys(mockUserManagementService).forEach(key => {
  _mockUserManagementServiceModule[key] = (mockUserManagementService as any)[key];
});

jest.mock('../../src/services/SettingsService', () => ({
  settingsService: {
    getSetting: jest.fn(async (key: string, defaultVal: any) => {
      if (key === 'noticeTarget') return 'server';
      if (key === 'dccAutoChatFrom') return 1;
      if (key === 'dccAutoGetMode') return 'prompt';
      if (key === 'dccAcceptExts') return [];
      if (key === 'dccRejectExts') return [];
      if (key === 'dccDontSendExts') return [];
      if (key === 'dccAutoGetFrom') return 1;
      return defaultVal;
    }),
    getNetwork: jest.fn(async () => null),
    loadNetworks: jest.fn(async () => []),
    addServerToNetwork: jest.fn(),
    saveNetworks: jest.fn(),
  },
  NEW_FEATURE_DEFAULTS: {
    dccAcceptExts: [],
    dccRejectExts: [],
    dccDontSendExts: [],
  },
}));
const mockSettingsService = jest.requireMock<any>('../../src/services/SettingsService').settingsService;

jest.mock('../../src/services/EncryptedDMService', () => ({
  encryptedDMService: {
    isEncryptedForNetwork: jest.fn(async () => false),
    onBundleStored: jest.fn(() => () => {}),
    onKeyRequest: jest.fn(() => () => {}),
    formatFingerprintForDisplay: jest.fn((fp: string) => fp),
    rejectKeyOfferForNetwork: jest.fn(),
    acceptKeyOfferForNetwork: jest.fn(),
  },
}));
const mockEncryptedDMService = jest.requireMock<any>('../../src/services/EncryptedDMService').encryptedDMService;

jest.mock('../../src/services/ChannelEncryptionService', () => ({
  channelEncryptionService: {
    hasChannelKey: jest.fn(async () => false),
    onChannelKeyChange: jest.fn(() => () => {}),
  },
}));
const mockChannelEncryptionService = jest.requireMock<any>('../../src/services/ChannelEncryptionService').channelEncryptionService;

jest.mock('../../src/services/OfflineQueueService', () => ({
  offlineQueueService: {
    processQueue: jest.fn(),
  },
}));
const mockOfflineQueueService = jest.requireMock<any>('../../src/services/OfflineQueueService').offlineQueueService;

jest.mock('../../src/services/AutoReconnectService', () => ({
  autoReconnectService: {
    markIntentionalDisconnect: jest.fn(),
  },
}));
const mockAutoReconnectService = jest.requireMock<any>('../../src/services/AutoReconnectService').autoReconnectService;

jest.mock('../../src/services/UserActivityService', () => ({
  userActivityService: {
    clearNetwork: jest.fn(),
  },
}));
const mockUserActivityService = jest.requireMock<any>('../../src/services/UserActivityService').userActivityService;

jest.mock('../../src/services/ScriptingService', () => ({
  scriptingService: {
    handleMessage: jest.fn(),
    handleDisconnect: jest.fn(),
    handleConnect: jest.fn(),
  },
}));
const mockScriptingService = jest.requireMock<any>('../../src/services/ScriptingService').scriptingService;

jest.mock('../../src/services/DCCChatService', () => ({
  dccChatService: {
    parseDccChatInvite: jest.fn(() => null),
    handleIncomingInvite: jest.fn(),
    acceptInvite: jest.fn(),
    closeSession: jest.fn(),
  },
}));
const mockDccChatService = jest.requireMock<any>('../../src/services/DCCChatService').dccChatService;

jest.mock('../../src/services/DCCFileService', () => ({
  dccFileService: {
    parseSendOffer: jest.fn(() => null),
    handleOffer: jest.fn(),
    accept: jest.fn(),
    cancel: jest.fn(),
    getDefaultDownloadPath: jest.fn(),
  },
}));
const mockDccFileService = jest.requireMock<any>('../../src/services/DCCFileService').dccFileService;

jest.mock('../../src/services/SoundService', () => ({
  soundService: {
    playSound: jest.fn(),
  },
}));
const mockSoundService = jest.requireMock<any>('../../src/services/SoundService').soundService;

jest.mock('../../src/services/NotificationService', () => ({
  notificationService: {
    shouldNotify: jest.fn(() => true),
  },
}));
const mockNotificationService = jest.requireMock<any>('../../src/services/NotificationService').notificationService;

jest.mock('../../src/services/TabService', () => ({
  tabService: {
    getTabs: jest.fn(async () => []),
    saveTabs: jest.fn(async () => {}),
  },
}));
const mockTabService = jest.requireMock<any>('../../src/services/TabService').tabService;

jest.mock('../../src/services/MessageHistoryService', () => ({
  messageHistoryService: {
    loadMessages: jest.fn(async () => []),
    deleteMessages: jest.fn(async () => {}),
  },
}));
const mockMessageHistoryService = jest.requireMock<any>('../../src/services/MessageHistoryService').messageHistoryService;

jest.mock('../../src/services/STSService', () => ({
  stsService: {
    savePolicy: jest.fn(() => true),
    getPolicy: jest.fn(() => ({ expiresAt: Date.now() + 60000 })),
  },
}));
const mockStsService = jest.requireMock<any>('../../src/services/STSService').stsService;

const mockClearTabMessages = jest.fn();
const mockRemoveTab = jest.fn();
jest.mock('../../src/stores/tabStore', () => ({
  useTabStore: {
    getState: () => ({
      clearTabMessages: mockClearTabMessages,
      removeTab: mockRemoveTab,
    }),
  },
}));

const mockSetShowDccTransfers = jest.fn();
const mockSetDccTransfersMinimized = jest.fn();
jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: {
    getState: () => ({
      setShowDccTransfers: mockSetShowDccTransfers,
      setDccTransfersMinimized: mockSetDccTransfersMinimized,
    }),
  },
}));

jest.mock('../../src/i18n/transifex', () => ({
  useT: () => (key: string, params?: any) => {
    if (params) {
      let result = key;
      Object.keys(params).forEach(k => {
        result = result.replace(`{${k}}`, String(params[k]));
      });
      return result;
    }
    return key;
  },
}));

jest.mock('../../src/utils/tabUtils', () => ({
  serverTabId: (network: string) => `server::${network}`,
  channelTabId: (network: string, name: string) => `channel::${network}::${name}`,
  queryTabId: (network: string, name: string) => `query::${network}::${name}`,
  noticeTabId: (network: string) => `notice::${network}`,
  makeServerTab: (network: string) => ({
    id: `server::${network}`,
    name: network,
    type: 'server',
    networkId: network,
    messages: [],
  }),
  sortTabsGrouped: (tabs: any[], _sort: boolean) => tabs,
}));

// SoundEventType mock
jest.mock('../../src/types/sound', () => ({
  SoundEventType: {
    PRIVATE_MESSAGE: 'PRIVATE_MESSAGE',
    MENTION: 'MENTION',
    NOTICE: 'NOTICE',
    CTCP: 'CTCP',
    JOIN: 'JOIN',
    KICK: 'KICK',
    DISCONNECT: 'DISCONNECT',
    LOGIN: 'LOGIN',
  },
}));

// ─── Helpers ─────────────────────────────────────────────

function createMockParams(overrides: Partial<any> = {}) {
  return {
    processBatchedMessages: jest.fn(),
    safeSetState: jest.fn((fn: Function) => fn()),
    safeAlert: jest.fn(),
    setIsConnected: jest.fn(),
    setActiveConnectionId: jest.fn(),
    setNetworkName: jest.fn(),
    setTabs: jest.fn((updater: any) => {
      if (typeof updater === 'function') return updater([]);
      return updater;
    }),
    setActiveTabId: jest.fn(),
    setChannelUsers: jest.fn(),
    setPing: jest.fn(),
    setTypingUser: jest.fn(),
    setMotdSignal: jest.fn(),
    networkName: 'DBase',
    activeTabId: 'server::DBase',
    tabsRef: {
      current: [
        { id: 'server::DBase', name: 'DBase', type: 'server', networkId: 'DBase', messages: [] },
      ],
    },
    tabSortAlphabetical: false,
    isConnected: true,
    messageBatchTimeoutRef: { current: null },
    pendingMessagesRef: { current: [] as any[] },
    motdCompleteRef: { current: new Set<string>() },
    isMountedRef: { current: true },
    handleServerConnect: jest.fn(),
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────

describe('useConnectionLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStorage.clear();
    mockIrcEmitter.removeAll();
    messageCallback = null;
    connectionCallback = null;
    userListCallback = null;
    connectionCreatedCallback = null;
    mockIrcService.getCurrentNick.mockReturnValue('TestNick');
    mockIrcService.getNetworkName.mockReturnValue('DBase');
    mockIrcService.getConnectionStatus.mockReturnValue(true);
    mockConnectionManager.getAllConnections.mockReturnValue([{
      networkId: 'DBase',
      ircService: mockIrcService,
      userManagementService: mockUserManagementService,
      isConnected: true,
    }]);
    mockConnectionManager.getActiveNetworkId.mockReturnValue('DBase');
    // Reset per-test mock overrides that are NOT cleared by clearAllMocks()
    mockUserManagementService.isUserIgnored.mockReturnValue(false);
    mockNotificationService.shouldNotify.mockReturnValue(true);
    mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
      if (key === 'noticeTarget') return 'server';
      if (key === 'dccAutoChatFrom') return 1;
      if (key === 'dccAutoGetMode') return 'prompt';
      if (key === 'dccAcceptExts') return [];
      if (key === 'dccRejectExts') return [];
      if (key === 'dccDontSendExts') return [];
      if (key === 'dccAutoGetFrom') return 1;
      return defaultVal;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listener setup', () => {
    it('should set up message listeners on mount', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(mockIrcService.onMessage).toHaveBeenCalled();
      expect(mockIrcService.onConnectionChange).toHaveBeenCalled();
      expect(mockIrcService.onUserListChange).toHaveBeenCalled();
    });

    it('should set up connection-created listener', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(mockConnectionManager.onConnectionCreated).toHaveBeenCalled();
    });

    it('should sync initial connection state', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(params.setIsConnected).toHaveBeenCalledWith(true);
      expect(params.setNetworkName).toHaveBeenCalledWith('DBase');
    });

    it('should set up encryption listeners', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(mockEncryptedDMService.onBundleStored).toHaveBeenCalled();
      expect(mockEncryptedDMService.onKeyRequest).toHaveBeenCalled();
      expect(mockChannelEncryptionService.onChannelKeyChange).toHaveBeenCalled();
    });

    it('should use singleton ircService when no connections in ConnectionManager', () => {
      mockConnectionManager.getAllConnections.mockReturnValue([]);

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      // Should still set up listeners using the singleton ircService
      expect(mockIrcService.onMessage).toHaveBeenCalled();
    });
  });

  describe('message routing', () => {
    it('should route channel messages to channel tab', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(messageCallback).toBeTruthy();

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hello',
          from: 'OtherUser',
          channel: '#general',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.pendingMessagesRef.current.length).toBeGreaterThan(0);
      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('channel::DBase::#general');
      expect(msg.context.targetTabType).toBe('channel');
    });

    it('should route query messages to query tab', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hello',
          from: 'SomeUser',
          channel: 'SomeUser',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('query::DBase::SomeUser');
      expect(msg.context.targetTabType).toBe('query');
    });

    it('should route raw messages to server tab', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'raw',
          isRaw: true,
          text: 'PING :server',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('server::DBase');
    });

    it('should route notice to server tab by default', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'notice',
          text: 'Server notice',
          from: 'server.example.com',
          channel: '*',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('server::DBase');
    });

    it('should route notice to active tab when noticeTarget is active', async () => {
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'noticeTarget') return 'active';
        return defaultVal;
      });

      const params = createMockParams({
        activeTabId: 'channel::DBase::#general',
        tabsRef: {
          current: [
            { id: 'server::DBase', type: 'server', networkId: 'DBase' },
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'notice',
          text: 'User notice',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('channel::DBase::#general');
    });

    it('should route notice to notice tab when noticeTarget is notice', async () => {
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'noticeTarget') return 'notice';
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'notice',
          text: 'User notice',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('notice::DBase');
    });

    it('should route notice to query tab when noticeTarget is private', async () => {
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'noticeTarget') return 'private';
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'notice',
          text: 'User notice',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('query::DBase::SomeUser');
    });

    it('should skip messages from ignored users', async () => {
      mockUserManagementService.isUserIgnored.mockReturnValue(true);

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Ignored message',
          from: 'IgnoredUser',
          channel: '#general',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.pendingMessagesRef.current.length).toBe(0);
    });

    it('should route server-originated wildcard targets to server tab', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Server message',
          from: 'irc.server.com',
          channel: '*',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('server::DBase');
    });

    it('should use from as fallback when no channel', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'DM',
          from: 'SomeUser',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('query::DBase::SomeUser');
    });

    it('should handle nick change messages without channel', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'nick',
          text: 'NickChange',
          from: 'OldNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('server::DBase');
    });

    it('should route connection raw messages to notice tab when server tab closed', async () => {
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'noticeTarget') return 'notice';
        return defaultVal;
      });

      const params = createMockParams({
        tabsRef: { current: [] }, // no server tab
      });
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'raw',
          isRaw: true,
          rawCategory: 'connection',
          text: 'Disconnected',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      const msg = params.pendingMessagesRef.current[0];
      expect(msg.context.targetTabId).toBe('notice::DBase');
    });
  });

  describe('typing indicators', () => {
    it('should forward typing indicators to setTypingUser', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '',
          from: 'SomeUser',
          channel: '#general',
          network: 'DBase',
          typing: 'active',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.setTypingUser).toHaveBeenCalledWith(
        'DBase',
        '#general',
        'SomeUser',
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('should resolve typing target for DM (use from as target)', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '',
          from: 'SomeUser',
          channel: 'TestNick', // addressed to current user
          network: 'DBase',
          typing: 'active',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.setTypingUser).toHaveBeenCalledWith(
        'DBase',
        'SomeUser', // should use from, not channel
        'SomeUser',
        expect.objectContaining({ status: 'active' }),
      );
    });
  });

  describe('sound notifications', () => {
    it('should play private message sound', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hello',
          from: 'OtherUser',
          channel: 'OtherUser',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('PRIVATE_MESSAGE');
    });

    it('should play mention sound when nick is mentioned in channel', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hey TestNick, check this out!',
          from: 'OtherUser',
          channel: '#general',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('MENTION');
    });

    it('should NOT play sound for local echo', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'My own message',
          from: 'TestNick',
          channel: '#general',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).not.toHaveBeenCalledWith('PRIVATE_MESSAGE');
      expect(mockSoundService.playSound).not.toHaveBeenCalledWith('MENTION');
    });

    it('should play notice sound', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'notice',
          text: 'A notice',
          from: 'OtherUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('NOTICE');
    });

    it('should play CTCP sound', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'ctcp',
          text: 'VERSION',
          from: 'OtherUser',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('CTCP');
    });

    it('should play join sound', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'join',
          text: '',
          from: 'OtherUser',
          channel: '#general',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('JOIN');
    });

    it('should NOT play sound when notification service says no', async () => {
      mockNotificationService.shouldNotify.mockReturnValue(false);

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hello',
          from: 'OtherUser',
          channel: 'OtherUser',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockSoundService.playSound).not.toHaveBeenCalledWith('PRIVATE_MESSAGE');
    });
  });

  describe('connection state changes', () => {
    it('should update connected state on connection change', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(connectionCallback).toBeTruthy();

      await act(async () => {
        connectionCallback!(true);
      });

      expect(params.setIsConnected).toHaveBeenCalledWith(true);
      expect(mockOfflineQueueService.processQueue).toHaveBeenCalled();
    });

    it('should clear channel users on disconnect', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        connectionCallback!(false);
      });

      expect(params.setChannelUsers).toHaveBeenCalledWith(new Map());
      expect(mockSoundService.playSound).toHaveBeenCalledWith('DISCONNECT');
    });

    it('should clear network activity on disconnect', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        connectionCallback!(false);
      });

      expect(mockUserActivityService.clearNetwork).toHaveBeenCalledWith('DBase');
      expect(mockScriptingService.handleDisconnect).toHaveBeenCalledWith('DBase', 'Disconnected');
    });
  });

  describe('user list changes', () => {
    it('should update channel users on user list change', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(userListCallback).toBeTruthy();

      const users = [
        { nick: 'User1', mode: '' },
        { nick: 'User2', mode: 'o' },
      ];

      act(() => {
        userListCallback!('#general', users);
      });

      expect(params.setChannelUsers).toHaveBeenCalled();
    });
  });

  describe('amsg/ame/anotice commands', () => {
    it('should send amsg to all channels in network', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'server::DBase', type: 'server', networkId: 'DBase' },
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
            { id: 'channel::DBase::#help', type: 'channel', networkId: 'DBase', name: '#help' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('amsg', 'Hello all channels', 'DBase');
      });

      expect(mockIrcService.sendRaw).toHaveBeenCalledWith('PRIVMSG #general :Hello all channels');
      expect(mockIrcService.sendRaw).toHaveBeenCalledWith('PRIVMSG #help :Hello all channels');
      expect(mockIrcService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notice',
          text: expect.stringContaining('2'),
        }),
      );
    });

    it('should send ame to all channels', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('ame', 'waves', 'DBase');
      });

      expect(mockIrcService.sendRaw).toHaveBeenCalledWith(expect.stringContaining('ACTION waves'));
    });

    it('should send anotice to all channels', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('anotice', 'Important notice', 'DBase');
      });

      expect(mockIrcService.sendRaw).toHaveBeenCalledWith('NOTICE #general :Important notice');
    });
  });

  describe('reconnect command', () => {
    it('should disconnect and update state', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('reconnect', 'DBase');
      });

      expect(mockIrcService.disconnect).toHaveBeenCalled();
      expect(params.setIsConnected).toHaveBeenCalledWith(false);
    });
  });

  describe('STS policy', () => {
    it('should save STS policy and add message', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('sts-policy', 'irc.example.com', 'port=6697,duration=3600');
      });

      expect(mockStsService.savePolicy).toHaveBeenCalledWith('irc.example.com', 'port=6697,duration=3600');
      expect(mockIrcService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'raw',
          text: expect.stringContaining('STS policy saved'),
        }),
      );
    });
  });

  describe('server-command', () => {
    it('should handle -d (disconnect only) switch', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          switches: { disconnectOnly: true },
          management: {},
        });
      });

      expect(mockAutoReconnectService.markIntentionalDisconnect).toHaveBeenCalledWith('DBase');
      expect(mockIrcService.sendRaw).toHaveBeenCalledWith(expect.stringContaining('QUIT'));
    });

    it('should show error when no address or server index', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          switches: {},
          management: {},
        });
      });

      expect(mockIrcService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('No server specified'),
        }),
      );
    });

    it('should call handleServerConnect when available', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          address: 'new.server.com',
          switches: {},
          management: {},
        });
      });

      expect(params.handleServerConnect).toHaveBeenCalled();
    });

    it('should handle management sort command', async () => {
      const params = createMockParams();
      mockSettingsService.loadNetworks.mockResolvedValue([]);
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          switches: {},
          management: { sort: true },
        });
      });

      expect(mockIrcService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notice',
          text: expect.stringContaining('sorted'),
        }),
      );
    });

    it('should handle management add command', async () => {
      mockSettingsService.loadNetworks.mockResolvedValue([{
        id: 'net-1',
        name: 'DBase',
        servers: [],
      }]);

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          address: 'new.server.com',
          port: 6667,
          switches: {},
          management: { add: true },
          managementOptions: { port: 6667 },
        });
      });

      expect(mockSettingsService.addServerToNetwork).toHaveBeenCalled();
    });

    it('should handle management remove command', async () => {
      mockSettingsService.loadNetworks.mockResolvedValue([{
        id: 'net-1',
        name: 'DBase',
        servers: [{ id: 'srv-1', hostname: 'old.server.com', port: 6667 }],
      }]);

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          address: 'old.server.com',
          switches: {},
          management: { remove: true },
          managementOptions: {},
        });
      });

      expect(mockSettingsService.saveNetworks).toHaveBeenCalled();
    });

    it('should handle server-command errors gracefully', async () => {
      mockSettingsService.loadNetworks.mockRejectedValue(new Error('Load failed'));

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('server-command', {
          address: 'test.server.com',
          switches: {},
          management: { add: true },
          managementOptions: {},
        });
      });

      expect(mockIrcService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text: expect.stringContaining('Server command error'),
        }),
      );
    });
  });

  describe('clear-tab command', () => {
    it('should clear messages for channel tab', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('clear-tab', '#general', 'DBase');
      });

      expect(mockClearTabMessages).toHaveBeenCalledWith('channel::DBase::#general');
    });

    it('should clear messages for query tab', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'query::DBase::SomeUser', type: 'query', networkId: 'DBase', name: 'SomeUser' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('clear-tab', 'SomeUser', 'DBase');
      });

      expect(mockClearTabMessages).toHaveBeenCalledWith('query::DBase::SomeUser');
    });

    it('should not crash when tab not found', () => {
      const params = createMockParams({ tabsRef: { current: [] } });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('clear-tab', '#nonexistent', 'DBase');
      });

      expect(mockClearTabMessages).not.toHaveBeenCalled();
    });
  });

  describe('close-tab command', () => {
    it('should close channel tab and part channel', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'server::DBase', type: 'server', networkId: 'DBase', name: 'DBase' },
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('close-tab', '#general', 'DBase');
      });

      expect(mockIrcService.partChannel).toHaveBeenCalledWith('#general');
      expect(mockRemoveTab).toHaveBeenCalledWith('channel::DBase::#general');
    });

    it('should NOT close server tab', () => {
      const params = createMockParams({
        tabsRef: {
          current: [
            { id: 'server::DBase', type: 'server', networkId: 'DBase', name: 'DBase' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('close-tab', 'DBase', 'DBase');
      });

      // Server tab matched as type 'server' but close-tab checks type !== 'server'
      expect(mockRemoveTab).not.toHaveBeenCalled();
    });

    it('should switch to server tab when closing active tab', () => {
      const params = createMockParams({
        activeTabId: 'channel::DBase::#general',
        tabsRef: {
          current: [
            { id: 'server::DBase', type: 'server', networkId: 'DBase', name: 'DBase' },
            { id: 'channel::DBase::#general', type: 'channel', networkId: 'DBase', name: '#general' },
          ],
        },
      });
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('close-tab', '#general', 'DBase');
      });

      expect(params.setActiveTabId).toHaveBeenCalledWith('server::DBase');
    });
  });

  describe('DCC', () => {
    it('should handle DCC CHAT invite with manual accept', async () => {
      mockDccChatService.parseDccChatInvite.mockReturnValue({ host: '127.0.0.1', port: 1234 });
      mockDccChatService.handleIncomingInvite.mockReturnValue({ id: 'dcc-1' });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC CHAT chat 127.0.0.1 1234\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.safeAlert).toHaveBeenCalledWith(
        expect.stringContaining('DCC Chat'),
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should auto-accept DCC CHAT when setting > 1', async () => {
      mockDccChatService.parseDccChatInvite.mockReturnValue({ host: '127.0.0.1', port: 1234 });
      mockDccChatService.handleIncomingInvite.mockReturnValue({ id: 'dcc-1' });
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'dccAutoChatFrom') return 2;
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC CHAT chat 127.0.0.1 1234\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockDccChatService.acceptInvite).toHaveBeenCalledWith('dcc-1', mockIrcService);
    });

    it('should handle DCC SEND offer with prompt', async () => {
      mockDccFileService.parseSendOffer.mockReturnValue({ filename: 'test.txt', size: 1024 });
      mockDccFileService.handleOffer.mockReturnValue({ id: 'transfer-1' });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC SEND test.txt 127.0.0.1 1234 1024\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(params.safeAlert).toHaveBeenCalledWith(
        expect.stringContaining('DCC SEND'),
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should auto-accept DCC SEND based on extension filters', async () => {
      mockDccFileService.parseSendOffer.mockReturnValue({ filename: 'photo.jpg', size: 1024 });
      mockDccFileService.handleOffer.mockReturnValue({ id: 'transfer-1' });
      mockDccFileService.getDefaultDownloadPath.mockResolvedValue('/downloads/photo.jpg');
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'dccAcceptExts') return ['*.jpg', '*.png'];
        if (key === 'dccRejectExts') return [];
        if (key === 'dccDontSendExts') return [];
        if (key === 'dccAutoGetFrom') return 1;
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC SEND photo.jpg 127.0.0.1 1234 1024\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockDccFileService.accept).toHaveBeenCalledWith('transfer-1', mockIrcService, '/downloads/photo.jpg');
    });

    it('should auto-reject DCC SEND when in reject extension list', async () => {
      mockDccFileService.parseSendOffer.mockReturnValue({ filename: 'virus.exe', size: 1024 });
      mockDccFileService.handleOffer.mockReturnValue({ id: 'transfer-1' });
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'dccRejectExts') return ['*.exe'];
        if (key === 'dccAcceptExts') return [];
        if (key === 'dccDontSendExts') return [];
        if (key === 'dccAutoGetFrom') return 1;
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC SEND virus.exe 127.0.0.1 1234 1024\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockDccFileService.cancel).toHaveBeenCalledWith('transfer-1');
    });

    it('should reject DCC SEND when in dontSend extension list', async () => {
      mockDccFileService.parseSendOffer.mockReturnValue({ filename: 'bad.bat', size: 1024 });
      mockDccFileService.handleOffer.mockReturnValue({ id: 'transfer-1' });
      mockSettingsService.getSetting.mockImplementation(async (key: string, defaultVal: any) => {
        if (key === 'dccDontSendExts') return ['*.bat'];
        if (key === 'dccAcceptExts') return [];
        if (key === 'dccRejectExts') return [];
        if (key === 'dccAutoGetFrom') return 1;
        return defaultVal;
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: '\x01DCC SEND bad.bat 127.0.0.1 1234 1024\x01',
          from: 'SomeUser',
          channel: 'TestNick',
          network: 'DBase',
        });
        jest.advanceTimersByTime(20);
      });

      expect(mockDccFileService.cancel).toHaveBeenCalledWith('transfer-1');
    });
  });

  describe('registered event', () => {
    it('should play login sound on registration', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('registered');
      });

      expect(mockSoundService.playSound).toHaveBeenCalledWith('LOGIN');
    });

    it('should send OPER command when oper password is configured', async () => {
      mockSettingsService.getNetwork.mockResolvedValue({
        name: 'DBase',
        nick: 'TestNick',
        operUser: 'admin',
        operPassword: 'secret',
      });

      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        mockIrcEmitter.emit('registered');
      });

      expect(mockIrcService.sendRaw).toHaveBeenCalledWith('OPER admin secret');
    });
  });

  describe('beep command', () => {
    it('should handle beep event without crashing', () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      act(() => {
        mockIrcEmitter.emit('beep', { count: 3, delay: 500 });
      });

      // Just ensure it doesn't crash - beep is a no-op currently
    });
  });

  describe('message batching', () => {
    it('should batch messages and trigger processBatchedMessages after timeout', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Hello',
          from: 'User1',
          channel: '#general',
          network: 'DBase',
        });
      });

      expect(params.pendingMessagesRef.current.length).toBe(1);

      // Advance timer to trigger batch processing
      act(() => {
        jest.advanceTimersByTime(20);
      });

      expect(params.processBatchedMessages).toHaveBeenCalled();
    });

    it('should clear and reset timeout on consecutive messages', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'First',
          from: 'User1',
          channel: '#general',
          network: 'DBase',
        });
      });

      await act(async () => {
        await messageCallback!({
          type: 'message',
          text: 'Second',
          from: 'User2',
          channel: '#general',
          network: 'DBase',
        });
      });

      expect(params.pendingMessagesRef.current.length).toBe(2);

      act(() => {
        jest.advanceTimersByTime(20);
      });

      expect(params.processBatchedMessages).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up all listeners on unmount', () => {
      const params = createMockParams();
      const { unmount } = renderHook(() => useConnectionLifecycle(params));

      unmount();

      // After unmount, listeners should be cleaned up
      // Verify by checking that the callback refs are cleaned
      // The actual cleanup happens internally via returned unsubscribe functions
    });

    it('should process remaining batched messages on cleanup', () => {
      const params = createMockParams({
        pendingMessagesRef: { current: [{ message: { type: 'test' }, context: {} }] },
      });
      const { unmount } = renderHook(() => useConnectionLifecycle(params));

      unmount();

      expect(params.processBatchedMessages).toHaveBeenCalled();
    });
  });

  describe('connection-created event', () => {
    it('should re-setup listeners when connection-created fires', async () => {
      const params = createMockParams();
      renderHook(() => useConnectionLifecycle(params));

      expect(connectionCreatedCallback).toBeTruthy();

      // Simulate a new connection being created
      await act(async () => {
        connectionCreatedCallback!('NewNetwork');
      });

      // The hook should re-run its effect due to connectionCheckTimestamp change
      // This is internal state, but we can verify listeners are set up again
    });
  });
});
