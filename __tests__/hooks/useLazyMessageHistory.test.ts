/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { renderHook } from '@testing-library/react-native';
import { useLazyMessageHistory } from '../../src/hooks/useLazyMessageHistory';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn((cb) => cb()),
  },
}));

jest.mock('../../src/services/MessageHistoryService', () => ({
  messageHistoryService: {
    loadMessages: jest.fn().mockResolvedValue([]),
  },
}));

let mockStoreState: any = { tabs: [], setTabs: jest.fn() };

jest.mock('../../src/stores/tabStore', () => ({
  useTabStore: Object.assign(
    jest.fn((selector: any) => selector(mockStoreState)),
    { getState: jest.fn(() => mockStoreState) }
  ),
}));

describe('useLazyMessageHistory', () => {
  const useTabStore = require('../../src/stores/tabStore').useTabStore as jest.Mock;
  const loadMessages = require('../../src/services/MessageHistoryService').messageHistoryService.loadMessages as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = { tabs: [], setTabs: jest.fn() };
    useTabStore.mockImplementation((selector: any) => selector(mockStoreState));
    useTabStore.getState.mockImplementation(() => mockStoreState);
    loadMessages.mockResolvedValue([]);
  });

  it('renders', () => {
    expect(() => renderHook(() => useLazyMessageHistory({ activeTabId: null }))).not.toThrow();
  });

  it('does not load without active tab', () => {
    renderHook(() => useLazyMessageHistory({ activeTabId: null }));
    expect(loadMessages).not.toHaveBeenCalled();
  });

  it('loads history for active channel tab', async () => {
    mockStoreState = {
      tabs: [{ id: 't1', type: 'channel', name: '#a', networkId: 'net', messages: [] }],
      setTabs: jest.fn(),
    };
    useTabStore.mockImplementation((selector: any) => selector(mockStoreState));
    useTabStore.getState.mockImplementation(() => mockStoreState);

    renderHook(() => useLazyMessageHistory({ activeTabId: 't1' }));
    await new Promise((r) => setTimeout(r, 0));

    expect(loadMessages).toHaveBeenCalledWith('net', '#a');
  });

  it('skips invalid network', async () => {
    mockStoreState = {
      tabs: [{ id: 't1', type: 'server', name: 'Not connected', networkId: 'Not connected', messages: [] }],
      setTabs: jest.fn(),
    };
    useTabStore.mockImplementation((selector: any) => selector(mockStoreState));
    useTabStore.getState.mockImplementation(() => mockStoreState);

    renderHook(() => useLazyMessageHistory({ activeTabId: 't1' }));
    await new Promise((r) => setTimeout(r, 0));

    expect(loadMessages).not.toHaveBeenCalled();
  });

  it('does not overwrite existing messages', async () => {
    const setTabs = jest.fn();
    mockStoreState = {
      tabs: [{ id: 't1', type: 'channel', name: '#a', networkId: 'net', messages: [{ id: 'm1' }] }],
      setTabs,
    };
    useTabStore.mockImplementation((selector: any) => selector(mockStoreState));
    useTabStore.getState.mockImplementation(() => mockStoreState);

    renderHook(() => useLazyMessageHistory({ activeTabId: 't1' }));
    await new Promise((r) => setTimeout(r, 0));

    expect(setTabs).not.toHaveBeenCalled();
  });
});
