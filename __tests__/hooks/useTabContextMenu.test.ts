/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for useTabContextMenu hook - Wave 4
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks';

// Mock dependencies
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('../../src/services/ConnectionManager', () => ({
  connectionManager: {
    getConnection: jest.fn(),
    disconnect: jest.fn(),
    getActiveNetworkId: jest.fn().mockReturnValue('freenode'),
  },
}));

jest.mock('../../src/services/TabService', () => ({
  tabService: {
    saveTabs: jest.fn().mockResolvedValue(undefined),
    removeTab: jest.fn(),
  },
}));

jest.mock('../../src/services/ChannelNotesService', () => ({
  channelNotesService: {
    isBookmarked: jest.fn().mockResolvedValue(false),
    setBookmarked: jest.fn().mockResolvedValue(undefined),
    getNote: jest.fn().mockResolvedValue(''),
    getLog: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/services/ChannelFavoritesService', () => ({
  channelFavoritesService: {
    isFavorite: jest.fn().mockResolvedValue(false),
    addFavorite: jest.fn().mockResolvedValue(undefined),
    removeFavorite: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/ChannelEncryptionService', () => ({
  channelEncryptionService: {
    hasChannelKey: jest.fn().mockResolvedValue(false),
    generateChannelKey: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/ChannelEncryptionSettingsService', () => ({
  channelEncryptionSettingsService: {
    getAlwaysEncrypt: jest.fn().mockResolvedValue(false),
    toggleAlwaysEncrypt: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../src/services/EncryptedDMService', () => ({
  encryptedDMService: {
    isEncryptedForNetwork: jest.fn().mockResolvedValue(false),
    exportBundle: jest.fn().mockResolvedValue({ key: 'test' }),
  },
}));

jest.mock('../../src/services/DCCChatService', () => ({
  dccChatService: {
    initiateChat: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/ServiceCommandProvider', () => ({
  serviceCommandProvider: {
    getServiceCommands: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('../../src/services/CertificateManagerService', () => ({
  certificateManager: {
    extractFingerprintFromPem: jest.fn().mockReturnValue('fingerprint'),
    formatFingerprint: jest.fn().mockReturnValue('formatted-fingerprint'),
  },
}));

// Mock UI Store
const mockUIStore = {
  setShowTabOptionsModal: jest.fn(),
  setTabOptions: jest.fn(),
  setTabOptionsTitle: jest.fn(),
  setShowChannelList: jest.fn(),
  setShowNetworksList: jest.fn(),
  setRenameTargetTabId: jest.fn(),
  setRenameValue: jest.fn(),
  setShowRenameModal: jest.fn(),
  setWhoisNick: jest.fn(),
  setShowWHOIS: jest.fn(),
  setDccSendTarget: jest.fn(),
  setShowDccSendModal: jest.fn(),
  setShowBlacklist: jest.fn(),
  setBlacklistTarget: jest.fn(),
  setChannelSettingsTarget: jest.fn(),
  setChannelSettingsNetwork: jest.fn(),
  setShowChannelSettings: jest.fn(),
  setChannelNoteTarget: jest.fn(),
  setChannelNoteValue: jest.fn(),
  setShowChannelNoteModal: jest.fn(),
  setChannelLogEntries: jest.fn(),
  setShowChannelLogModal: jest.fn(),
};

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: Object.assign(
    jest.fn((selector) => selector(mockUIStore)),
    { getState: jest.fn(() => mockUIStore) }
  ),
}));

import { useTabContextMenu } from '../../src/hooks/useTabContextMenu';
import { connectionManager } from '../../src/services/ConnectionManager';
import { channelNotesService } from '../../src/services/ChannelNotesService';
import { channelFavoritesService } from '../../src/services/ChannelFavoritesService';

describe('useTabContextMenu', () => {
  const mockSetTabs = jest.fn();
  const mockSetActiveTabId = jest.fn();
  const mockSetNetworkName = jest.fn();
  const mockSetActiveConnectionId = jest.fn();
  const mockHandleConnect = jest.fn().mockResolvedValue(undefined);
  const mockCloseAllChannelsAndQueries = jest.fn().mockResolvedValue(undefined);
  const mockGetNetworkConfigForId = jest.fn().mockResolvedValue(null);
  const mockGetActiveIRCService = jest.fn().mockReturnValue({
    getCurrentNick: jest.fn().mockReturnValue('TestNick'),
    sendCommand: jest.fn(),
    sendRaw: jest.fn(),
    addMessage: jest.fn(),
  });
  const mockGetActiveUserManagementService = jest.fn().mockReturnValue({
    ignoreUser: jest.fn().mockResolvedValue(undefined),
  });
  const mockSafeAlert = jest.fn();
  const mockT = jest.fn((key: string) => key);

  const defaultParams = {
    activeTabId: 'tab-1',
    getNetworkConfigForId: mockGetNetworkConfigForId,
    getActiveIRCService: mockGetActiveIRCService,
    getActiveUserManagementService: mockGetActiveUserManagementService,
    handleConnect: mockHandleConnect,
    closeAllChannelsAndQueries: mockCloseAllChannelsAndQueries,
    normalizeNetworkId: (id: string) => id,
    primaryNetworkId: 'freenode',
    safeAlert: mockSafeAlert,
    t: mockT,
    setTabs: mockSetTabs,
    setActiveTabId: mockSetActiveTabId,
    setNetworkName: mockSetNetworkName,
    setActiveConnectionId: mockSetActiveConnectionId,
    tabSortAlphabetical: false,
    ircService: mockGetActiveIRCService(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset UI store mocks
    Object.values(mockUIStore).forEach((fn: any) => fn.mockClear?.());
    
    (connectionManager.getConnection as jest.Mock).mockReturnValue({
      ircService: {
        getConnectionStatus: jest.fn().mockReturnValue(true),
        getCurrentNick: jest.fn().mockReturnValue('TestNick'),
        sendCommand: jest.fn(),
        sendSilentMode: jest.fn(),
        isServerOper: jest.fn().mockReturnValue(false),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should return handleTabLongPress function', () => {
    const { result } = renderHook(() => useTabContextMenu(defaultParams));
    expect(result.current.handleTabLongPress).toBeDefined();
    expect(typeof result.current.handleTabLongPress).toBe('function');
  });

  it('should handle server tab long press for connected server', async () => {
    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const serverTab = {
      id: 'server-freenode',
      name: 'Freenode',
      type: 'server' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
    };

    await act(async () => {
      await result.current.handleTabLongPress(serverTab);
    });

    expect(connectionManager.getConnection).toHaveBeenCalledWith('freenode');
  });

  it('should handle server tab long press for disconnected server', async () => {
    (connectionManager.getConnection as jest.Mock).mockReturnValue(null);
    
    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const serverTab = {
      id: 'server-freenode',
      name: 'Freenode',
      type: 'server' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
    };

    await act(async () => {
      await result.current.handleTabLongPress(serverTab);
    });

    expect(mockT).toHaveBeenCalledWith('Connect {network}', { network: 'freenode' });
  });

  it('should handle channel tab long press', async () => {
    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const channelTab = {
      id: 'channel-1',
      name: '#test',
      type: 'channel' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
      sendEncrypted: false,
    };

    await act(async () => {
      await result.current.handleTabLongPress(channelTab);
    });

    expect(channelNotesService.isBookmarked).toHaveBeenCalledWith('freenode', '#test');
    expect(channelFavoritesService.isFavorite).toHaveBeenCalledWith('freenode', '#test');
  });

  it('should handle query tab long press', async () => {
    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const queryTab = {
      id: 'query-1',
      name: 'OtherUser',
      type: 'query' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
      sendEncrypted: false,
    };

    await act(async () => {
      await result.current.handleTabLongPress(queryTab);
    });

    expect(mockT).toHaveBeenCalledWith('Close Query');
  });

  it('should handle channel with encryption enabled', async () => {
    const { channelEncryptionService } = require('../../src/services/ChannelEncryptionService');
    (channelEncryptionService.hasChannelKey as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const channelTab = {
      id: 'channel-1',
      name: '#test',
      type: 'channel' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
      sendEncrypted: true,
    };

    await act(async () => {
      await result.current.handleTabLongPress(channelTab);
    });

    expect(mockT).toHaveBeenCalledWith('Send Plaintext (Unlock)');
  });

  it('should handle oper commands for server oper', async () => {
    (connectionManager.getConnection as jest.Mock).mockReturnValue({
      ircService: {
        getConnectionStatus: jest.fn().mockReturnValue(true),
        getCurrentNick: jest.fn().mockReturnValue('OperNick'),
        sendCommand: jest.fn(),
        sendSilentMode: jest.fn(),
        isServerOper: jest.fn().mockReturnValue(true),
      },
    });

    const { result } = renderHook(() => useTabContextMenu(defaultParams));

    const serverTab = {
      id: 'server-freenode',
      name: 'Freenode',
      type: 'server' as const,
      networkId: 'freenode',
      messages: [],
      unreadCount: 0,
    };

    await act(async () => {
      await result.current.handleTabLongPress(serverTab);
    });

    expect(mockT).toHaveBeenCalledWith('IRCop Commands');
  });
});
