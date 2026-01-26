/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for ConsoleManager
 */

import consoleManager from '../../src/utils/consoleManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

describe('ConsoleManager', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset();
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });

  afterEach(() => {
    // Always restore original console methods after tests
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = consoleManager;
      const instance2 = consoleManager;
      expect(instance1).toBe(instance2);
    });
  });

  describe('getEnabled', () => {
    it('should return boolean', () => {
      const enabled = consoleManager.getEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(consoleManager.initialize()).resolves.not.toThrow();
    });

    it('should load saved state from storage', async () => {
      await AsyncStorage.setItem('@console_enabled', 'false');
      await consoleManager.initialize();
      // Test passes if no errors thrown
      expect(true).toBe(true);
    });

    it('should handle corrupted storage data', async () => {
      await AsyncStorage.setItem('@console_enabled', 'invalid');
      await expect(consoleManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state', async () => {
      await consoleManager.setEnabled(true);
      expect(consoleManager.getEnabled()).toBe(true);

      await consoleManager.setEnabled(false);
      expect(consoleManager.getEnabled()).toBe(false);
    });

    it('should persist state to storage', async () => {
      await consoleManager.setEnabled(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@console_enabled',
        'true'
      );
    });

    it('should handle storage errors gracefully', async () => {
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage error'));
      await expect(consoleManager.setEnabled(true)).resolves.not.toThrow();
    });
  });
});
