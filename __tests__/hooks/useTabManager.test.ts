/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for useTabManager hook - Wave 4
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks';

// Mock dependencies
jest.mock('../../src/utils/MessageBatcher', () => ({
  messageBatcher: {
    addMessage: jest.fn(),
    addMessages: jest.fn(),
    setFlushCallback: jest.fn(),
    flush: jest.fn(),
  },
}));

// Create mock store
const mockStore = {
  tabs: [],
  activeTabId: '',
  setTabs: jest.fn(),
  setActiveTabId: jest.fn(),
  addTab: jest.fn(),
  removeTab: jest.fn(),
  removeTabs: jest.fn(),
  updateTab: jest.fn(),
  addMessageToTab: jest.fn(),
  setTabActivity: jest.fn(),
  clearTabMessages: jest.fn(),
  addTabs: jest.fn(),
  getTabById: jest.fn(),
  getTabsByNetwork: jest.fn().mockReturnValue([]),
  getActiveTab: jest.fn().mockReturnValue(null),
  hasTab: jest.fn().mockReturnValue(false),
  saveTabsToStorage: jest.fn().mockResolvedValue(undefined),
  loadTabsFromStorage: jest.fn().mockResolvedValue(undefined),
};

// Mock Zustand store
jest.mock('../../src/stores/tabStore', () => ({
  useTabStore: Object.assign(
    jest.fn((selector) => selector(mockStore)),
    { getState: jest.fn(() => mockStore) }
  ),
}));

// Import after mocks
import { useTabManager } from '../../src/hooks/useTabManager';
import { messageBatcher } from '../../src/utils/MessageBatcher';

describe('useTabManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    mockStore.tabs = [];
    mockStore.activeTabId = '';
    mockStore.hasTab.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('should return tab management functions', () => {
    const { result } = renderHook(() => useTabManager());

    expect(result.current.tabs).toBeDefined();
    expect(result.current.activeTabId).toBeDefined();
    expect(result.current.openTab).toBeDefined();
    expect(result.current.closeTab).toBeDefined();
    expect(result.current.addMessage).toBeDefined();
    expect(result.current.switchToTab).toBeDefined();
  });

  it('should add a new tab', () => {
    mockStore.hasTab.mockReturnValue(false);

    const { result } = renderHook(() => useTabManager());

    const newTab = {
      id: 'tab-1',
      name: '#test',
      type: 'channel' as const,
      networkId: 'freenode',
      messages: [],
    };

    act(() => {
      result.current.openTab(newTab);
    });

    expect(mockStore.addTab).toHaveBeenCalledWith(newTab);
    expect(mockStore.setActiveTabId).toHaveBeenCalledWith('tab-1');
  });

  it('should switch to existing tab instead of adding duplicate', () => {
    mockStore.hasTab.mockReturnValue(true);

    const { result } = renderHook(() => useTabManager());

    const existingTab = {
      id: 'tab-1',
      name: '#test',
      type: 'channel' as const,
      networkId: 'freenode',
      messages: [],
    };

    act(() => {
      result.current.openTab(existingTab);
    });

    expect(mockStore.addTab).not.toHaveBeenCalled();
    expect(mockStore.setActiveTabId).toHaveBeenCalledWith('tab-1');
  });

  it('should add message using batcher', () => {
    const { result } = renderHook(() => useTabManager());

    const message = {
      id: 'msg-1',
      type: 'message',
      text: 'Hello',
      timestamp: Date.now(),
    };

    act(() => {
      result.current.addMessage('tab-1', message as any);
    });

    expect(messageBatcher.addMessage).toHaveBeenCalledWith('tab-1', message);
  });

  it('should switch to tab and clear activity', () => {
    mockStore.hasTab.mockReturnValue(true);

    const { result } = renderHook(() => useTabManager());

    act(() => {
      result.current.switchToTab('tab-1');
    });

    expect(mockStore.setActiveTabId).toHaveBeenCalledWith('tab-1');
    expect(mockStore.setTabActivity).toHaveBeenCalledWith('tab-1', false);
  });

  it('should not switch to non-existent tab', () => {
    mockStore.hasTab.mockReturnValue(false);

    const { result } = renderHook(() => useTabManager());

    act(() => {
      result.current.switchToTab('non-existent');
    });

    expect(mockStore.setActiveTabId).not.toHaveBeenCalled();
  });

  it('should close all network tabs', () => {
    const networkTabs = [
      { id: 'tab-1', name: '#test', type: 'channel', networkId: 'freenode' },
      { id: 'tab-2', name: 'OtherUser', type: 'query', networkId: 'freenode' },
      { id: 'server-freenode', name: 'Freenode', type: 'server', networkId: 'freenode' },
    ];
    mockStore.getTabsByNetwork.mockReturnValue(networkTabs);

    const { result } = renderHook(() => useTabManager());

    act(() => {
      result.current.closeNetworkTabs('freenode');
    });

    expect(mockStore.removeTabs).toHaveBeenCalledWith(['tab-1', 'tab-2', 'server-freenode']);
  });

  it('should close network tabs excluding server', () => {
    const networkTabs = [
      { id: 'tab-1', name: '#test', type: 'channel', networkId: 'freenode' },
      { id: 'tab-2', name: 'OtherUser', type: 'query', networkId: 'freenode' },
      { id: 'server-freenode', name: 'Freenode', type: 'server', networkId: 'freenode' },
    ];
    mockStore.getTabsByNetwork.mockReturnValue(networkTabs);

    const { result } = renderHook(() => useTabManager());

    act(() => {
      result.current.closeNetworkTabs('freenode', true);
    });

    expect(mockStore.removeTabs).toHaveBeenCalledWith(['tab-1', 'tab-2']);
  });
});
