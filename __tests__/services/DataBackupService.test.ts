/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for DataBackupService - Wave 6
 */

import { dataBackupService } from '../../src/services/DataBackupService';

// Mock AsyncStorage
const mockStorage: Record<string, string | null> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, mockStorage[k] || null]))),
  multiSet: jest.fn((pairs: [string, string | null][]) => {
    pairs.forEach(([key, value]) => { mockStorage[key] = value; });
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
}));

// Mock services
jest.mock('../../src/services/IdentityProfilesService', () => ({
  identityProfilesService: { reload: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/services/SettingsService', () => ({
  settingsService: { reloadNetworks: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/i18n/transifex', () => ({
  tx: { t: jest.fn((key: string) => key) },
}));

// Mock libsodium
const mockSodium = {
  ready: Promise.resolve(),
  randombytes_buf: jest.fn((size: number) => new Uint8Array(size).fill(1)),
  crypto_pwhash: jest.fn(() => new Uint8Array(32).fill(2)),
  crypto_secretbox_KEYBYTES: 32,
  crypto_pwhash_SALTBYTES: 16,
  crypto_secretbox_NONCEBYTES: 24,
  crypto_secretbox_easy: jest.fn(() => new Uint8Array([1, 2, 3])),
  crypto_secretbox_open_easy: jest.fn(() => new Uint8Array([1, 2, 3])),
  from_string: jest.fn((s: string) => new TextEncoder().encode(s)),
  to_string: jest.fn((a: Uint8Array) => new TextDecoder().decode(a)),
  from_base64: jest.fn((s: string) => new Uint8Array([1, 2, 3])),
  to_base64: jest.fn(() => 'base64encoded'),
  crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
  crypto_pwhash_MEMLIMIT_INTERACTIVE: 65536,
  crypto_pwhash_ALG_DEFAULT: 2,
};

jest.mock('react-native-libsodium', () => mockSodium);

describe('DataBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('Export All', () => {
    it('should export all data', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';

      const backup = await dataBackupService.exportAll();
      const parsed = JSON.parse(backup);

      expect(parsed.version).toBe(1);
      expect(parsed.createdAt).toBeDefined();
      expect(parsed.data.key1).toBe('value1');
      expect(parsed.data.key2).toBe('value2');
    });

    it('should handle empty storage', async () => {
      const backup = await dataBackupService.exportAll();
      const parsed = JSON.parse(backup);

      expect(parsed.data).toEqual({});
    });

    it('should include null values', async () => {
      mockStorage['key1'] = null as any;

      const backup = await dataBackupService.exportAll();
      const parsed = JSON.parse(backup);

      expect(parsed.data.key1).toBeNull();
    });
  });

  describe('Export Settings', () => {
    it('should exclude message history keys', async () => {
      mockStorage['MESSAGES_freenode_#general'] = 'messages';
      mockStorage['settings'] = 'settings';

      const backup = await dataBackupService.exportSettings();
      const parsed = JSON.parse(backup);

      expect(parsed.data['MESSAGES_freenode_#general']).toBeUndefined();
      expect(parsed.data.settings).toBe('settings');
    });

    it('should exclude channel logs', async () => {
      mockStorage['channelLogs'] = 'logs';
      mockStorage['channelLogs:network'] = 'logs';
      mockStorage['settings'] = 'settings';

      const backup = await dataBackupService.exportSettings();
      const parsed = JSON.parse(backup);

      expect(parsed.data.channelLogs).toBeUndefined();
      expect(parsed.data['channelLogs:network']).toBeUndefined();
      expect(parsed.data.settings).toBe('settings');
    });

    it('should include keys with "log" but not "login"', async () => {
      mockStorage['loginTime'] = 'time';
      mockStorage['applog'] = 'logs';

      const backup = await dataBackupService.exportSettings();
      const parsed = JSON.parse(backup);

      expect(parsed.data.loginTime).toBe('time');
      expect(parsed.data.applog).toBeUndefined();
    });
  });

  describe('Import All', () => {
    it('should import data from backup', async () => {
      const backup = JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        data: { key1: 'value1', key2: 'value2' },
      });

      await dataBackupService.importAll(backup);

      expect(mockStorage['key1']).toBe('value1');
      expect(mockStorage['key2']).toBe('value2');
    });

    it('should throw on invalid format', async () => {
      await expect(dataBackupService.importAll('invalid')).rejects.toThrow();
    });

    it('should throw on missing data', async () => {
      await expect(dataBackupService.importAll('{"version":1}')).rejects.toThrow('Invalid backup format');
    });

    it('should reload services after import', async () => {
      const { identityProfilesService } = require('../../src/services/IdentityProfilesService');
      const { settingsService } = require('../../src/services/SettingsService');

      const backup = JSON.stringify({
        version: 1,
        data: { key: 'value' },
      });

      await dataBackupService.importAll(backup);

      expect(identityProfilesService.reload).toHaveBeenCalled();
      expect(settingsService.reloadNetworks).toHaveBeenCalled();
    });

    it('should handle reload errors gracefully', async () => {
      const { identityProfilesService } = require('../../src/services/IdentityProfilesService');
      identityProfilesService.reload.mockRejectedValueOnce(new Error('Reload error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const backup = JSON.stringify({ version: 1, data: { key: 'value' } });
      await dataBackupService.importAll(backup);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Storage Stats', () => {
    it('should return storage stats', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';

      const stats = await dataBackupService.getStorageStats();

      expect(stats.keyCount).toBe(2);
      expect(stats.totalBytes).toBe(12); // 'value1' + 'value2' = 6 + 6
    });

    it('should handle null values', async () => {
      mockStorage['key1'] = null as any;

      const stats = await dataBackupService.getStorageStats();

      expect(stats.keyCount).toBe(1);
      expect(stats.totalBytes).toBe(0);
    });
  });

  describe('Get All Keys', () => {
    it('should return all keys', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';

      const keys = await dataBackupService.getAllKeys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('Check Sensitive Data', () => {
    it('should detect secure storage keys', () => {
      const result = dataBackupService.checkForSensitiveData(['@AndroidIRCX:secure:password']);

      expect(result.hasSensitive).toBe(true);
      expect(result.sensitiveKeys).toContain('@AndroidIRCX:secure:password');
    });

    it('should detect password keys', () => {
      const result = dataBackupService.checkForSensitiveData(['networkPassword', 'safeKey']);

      expect(result.hasSensitive).toBe(true);
      expect(result.sensitiveKeys).toContain('networkPassword');
    });

    it('should detect token keys', () => {
      const result = dataBackupService.checkForSensitiveData(['authToken']);

      expect(result.hasSensitive).toBe(true);
      expect(result.sensitiveKeys).toContain('authToken');
    });

    it('should detect SASL keys', () => {
      const result = dataBackupService.checkForSensitiveData(['saslAuth']);

      expect(result.hasSensitive).toBe(true);
    });

    it('should detect ZNC keys', () => {
      const result = dataBackupService.checkForSensitiveData(['zncPassword']);

      expect(result.hasSensitive).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = dataBackupService.checkForSensitiveData(['PASSWORD', 'TOKEN']);

      expect(result.hasSensitive).toBe(true);
    });

    it('should return no sensitive data for safe keys', () => {
      const result = dataBackupService.checkForSensitiveData(['safeKey', 'anotherKey']);

      expect(result.hasSensitive).toBe(false);
      expect(result.sensitiveKeys).toEqual([]);
    });
  });

  describe('Export Keys', () => {
    it('should export specific keys', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      mockStorage['key3'] = 'value3';

      const backup = await dataBackupService.exportKeys(['key1', 'key2']);
      const parsed = JSON.parse(backup);

      expect(parsed.data.key1).toBe('value1');
      expect(parsed.data.key2).toBe('value2');
      expect(parsed.data.key3).toBeUndefined();
    });

    it('should include null values for missing keys', async () => {
      mockStorage['key1'] = 'value1';

      const backup = await dataBackupService.exportKeys(['key1', 'missing']);
      const parsed = JSON.parse(backup);

      expect(parsed.data.key1).toBe('value1');
      expect(parsed.data.missing).toBeNull();
    });
  });

  describe('Encryption', () => {
    it('should encrypt backup', async () => {
      const backup = JSON.stringify({ key: 'value' });
      const encrypted = await dataBackupService.encryptBackup(backup, 'password');
      const parsed = JSON.parse(encrypted);

      expect(parsed.version).toBe(1);
      expect(parsed.encrypted).toBe(true);
      expect(parsed.data).toBe('base64encoded');
    });

    it('should decrypt backup', async () => {
      const encrypted = JSON.stringify({
        version: 1,
        encrypted: true,
        data: 'base64encoded',
      });

      // Mock successful decryption
      mockSodium.crypto_secretbox_open_easy.mockReturnValueOnce(new TextEncoder().encode('{"key":"value"}'));

      const decrypted = await dataBackupService.decryptBackup(encrypted, 'password');
      expect(decrypted).toBe('{"key":"value"}');
    });

    it('should throw on non-encrypted backup', async () => {
      const notEncrypted = JSON.stringify({ key: 'value' });

      await expect(dataBackupService.decryptBackup(notEncrypted, 'password'))
        .rejects.toThrow('Not an encrypted backup');
    });

    it('should throw on decryption failure', async () => {
      const encrypted = JSON.stringify({
        version: 1,
        encrypted: true,
        data: 'base64encoded',
      });

      mockSodium.crypto_secretbox_open_easy.mockReturnValueOnce(null);

      await expect(dataBackupService.decryptBackup(encrypted, 'password'))
        .rejects.toThrow('Decryption failed');
    });
  });

  describe('Is Encrypted Backup', () => {
    it('should return true for encrypted backup', () => {
      const encrypted = JSON.stringify({ encrypted: true, data: 'encrypteddata' });
      expect(dataBackupService.isEncryptedBackup(encrypted)).toBe(true);
    });

    it('should return false for plaintext backup', () => {
      const plaintext = JSON.stringify({ key: 'value' });
      expect(dataBackupService.isEncryptedBackup(plaintext)).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(dataBackupService.isEncryptedBackup('invalid')).toBe(false);
    });

    it('should return false for missing encrypted flag', () => {
      const backup = JSON.stringify({ data: 'data' });
      expect(dataBackupService.isEncryptedBackup(backup)).toBe(false);
    });

    it('should return false for non-string data', () => {
      const backup = JSON.stringify({ encrypted: true, data: 123 });
      expect(dataBackupService.isEncryptedBackup(backup)).toBe(false);
    });
  });
});
