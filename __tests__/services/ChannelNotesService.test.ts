/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for ChannelNotesService
 */

import { channelNotesService } from '../../src/services/ChannelNotesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('ChannelNotesService', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset();
    // Reset service state
    (channelNotesService as any).notes = {};
    (channelNotesService as any).bookmarks = new Set();
    (channelNotesService as any).logs = {};
    (channelNotesService as any).initialized = false;
  });

  describe('setNote and getNote', () => {
    it('should set and get a note', async () => {
      await channelNotesService.setNote('testnet', '#channel', 'Test note');
      const note = await channelNotesService.getNote('testnet', '#channel');

      expect(note).toBe('Test note');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'channelNotes',
        expect.any(String)
      );
    });

    it('should return empty string for non-existent note', async () => {
      const note = await channelNotesService.getNote('testnet', '#nonexistent');
      expect(note).toBe('');
    });

    it('should delete note when set to empty string', async () => {
      await channelNotesService.setNote('testnet', '#channel', 'Test note');
      await channelNotesService.setNote('testnet', '#channel', '   '); // Whitespace only

      const note = await channelNotesService.getNote('testnet', '#channel');
      expect(note).toBe('');
    });

    it('should handle multiple notes for different channels', async () => {
      await channelNotesService.setNote('net1', '#channel1', 'Note 1');
      await channelNotesService.setNote('net1', '#channel2', 'Note 2');
      await channelNotesService.setNote('net2', '#channel1', 'Note 3');

      expect(await channelNotesService.getNote('net1', '#channel1')).toBe('Note 1');
      expect(await channelNotesService.getNote('net1', '#channel2')).toBe('Note 2');
      expect(await channelNotesService.getNote('net2', '#channel1')).toBe('Note 3');
    });

    it('should persist notes to storage', async () => {
      await channelNotesService.setNote('testnet', '#channel', 'Persistent note');

      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const notesCall = calls.find((call: any) => call[0] === 'channelNotes');

      expect(notesCall).toBeDefined();
      const savedData = JSON.parse(notesCall[1]);
      expect(savedData['testnet::#channel']).toBe('Persistent note');
    });
  });

  describe('setBookmarked and isBookmarked', () => {
    it('should bookmark a channel', async () => {
      await channelNotesService.setBookmarked('testnet', '#channel', true);
      const isBookmarked = await channelNotesService.isBookmarked('testnet', '#channel');

      expect(isBookmarked).toBe(true);
    });

    it('should unbookmark a channel', async () => {
      await channelNotesService.setBookmarked('testnet', '#channel', true);
      await channelNotesService.setBookmarked('testnet', '#channel', false);

      const isBookmarked = await channelNotesService.isBookmarked('testnet', '#channel');
      expect(isBookmarked).toBe(false);
    });

    it('should return false for non-bookmarked channel', async () => {
      const isBookmarked = await channelNotesService.isBookmarked('testnet', '#nonexistent');
      expect(isBookmarked).toBe(false);
    });

    it('should handle multiple bookmarks', async () => {
      await channelNotesService.setBookmarked('net1', '#ch1', true);
      await channelNotesService.setBookmarked('net1', '#ch2', true);
      await channelNotesService.setBookmarked('net2', '#ch1', true);

      expect(await channelNotesService.isBookmarked('net1', '#ch1')).toBe(true);
      expect(await channelNotesService.isBookmarked('net1', '#ch2')).toBe(true);
      expect(await channelNotesService.isBookmarked('net2', '#ch1')).toBe(true);
      expect(await channelNotesService.isBookmarked('net2', '#ch2')).toBe(false);
    });

    it('should persist bookmarks to storage', async () => {
      await channelNotesService.setBookmarked('testnet', '#channel', true);

      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const bookmarksCall = calls.find((call: any) => call[0] === 'channelBookmarks');

      expect(bookmarksCall).toBeDefined();
      const savedData = JSON.parse(bookmarksCall[1]);
      expect(savedData).toContain('testnet::#channel');
    });
  });

  describe('addLogEntry, getLog, and clearLog', () => {
    it('should add log entry', async () => {
      const entry = { timestamp: Date.now(), text: 'Test log entry' };
      await channelNotesService.addLogEntry('testnet', '#channel', entry);

      const log = await channelNotesService.getLog('testnet', '#channel');
      expect(log.length).toBe(1);
      expect(log[0]).toEqual(entry);
    });

    it('should return empty array for non-existent log', async () => {
      const log = await channelNotesService.getLog('testnet', '#nonexistent');
      expect(log).toEqual([]);
    });

    it('should keep last 200 log entries', async () => {
      for (let i = 0; i < 250; i++) {
        await channelNotesService.addLogEntry('testnet', '#channel', {
          timestamp: Date.now(),
          text: `Entry ${i}`,
        });
      }

      const log = await channelNotesService.getLog('testnet', '#channel');
      expect(log.length).toBe(200);
      expect(log[0].text).toBe('Entry 50'); // First 50 were trimmed
      expect(log[199].text).toBe('Entry 249');
    });

    it('should clear log', async () => {
      await channelNotesService.addLogEntry('testnet', '#channel', {
        timestamp: Date.now(),
        text: 'Entry 1',
      });
      await channelNotesService.addLogEntry('testnet', '#channel', {
        timestamp: Date.now(),
        text: 'Entry 2',
      });

      await channelNotesService.clearLog('testnet', '#channel');

      const log = await channelNotesService.getLog('testnet', '#channel');
      expect(log).toEqual([]);
    });

    it('should handle multiple logs for different channels', async () => {
      await channelNotesService.addLogEntry('net1', '#ch1', {
        timestamp: 1000,
        text: 'Log 1',
      });
      await channelNotesService.addLogEntry('net1', '#ch2', {
        timestamp: 2000,
        text: 'Log 2',
      });

      const log1 = await channelNotesService.getLog('net1', '#ch1');
      const log2 = await channelNotesService.getLog('net1', '#ch2');

      expect(log1.length).toBe(1);
      expect(log1[0].text).toBe('Log 1');
      expect(log2.length).toBe(1);
      expect(log2[0].text).toBe('Log 2');
    });

    it('should persist logs to storage', async () => {
      await channelNotesService.addLogEntry('testnet', '#channel', {
        timestamp: 12345,
        text: 'Persistent log',
      });

      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const logsCall = calls.find((call: any) => call[0] === 'channelLogs');

      expect(logsCall).toBeDefined();
      const savedData = JSON.parse(logsCall[1]);
      expect(savedData['testnet::#channel']).toHaveLength(1);
      expect(savedData['testnet::#channel'][0].text).toBe('Persistent log');
    });
  });

  describe('data persistence and initialization', () => {
    it('should load saved notes on initialization', async () => {
      const notes = { 'net1::#ch1': 'Saved note' };
      await AsyncStorage.setItem('channelNotes', JSON.stringify(notes));

      // Force re-initialization
      (channelNotesService as any).initialized = false;

      const note = await channelNotesService.getNote('net1', '#ch1');
      expect(note).toBe('Saved note');
    });

    it('should load saved bookmarks on initialization', async () => {
      const bookmarks = ['net1::#ch1', 'net2::#ch2'];
      await AsyncStorage.setItem('channelBookmarks', JSON.stringify(bookmarks));

      // Force re-initialization
      (channelNotesService as any).initialized = false;

      expect(await channelNotesService.isBookmarked('net1', '#ch1')).toBe(true);
      expect(await channelNotesService.isBookmarked('net2', '#ch2')).toBe(true);
    });

    it('should load saved logs on initialization', async () => {
      const logs = {
        'net1::#ch1': [{ timestamp: 1000, text: 'Saved log' }],
      };
      await AsyncStorage.setItem('channelLogs', JSON.stringify(logs));

      // Force re-initialization
      (channelNotesService as any).initialized = false;

      const log = await channelNotesService.getLog('net1', '#ch1');
      expect(log.length).toBe(1);
      expect(log[0].text).toBe('Saved log');
    });

    it('should handle corrupted storage data gracefully', async () => {
      await AsyncStorage.setItem('channelNotes', 'invalid json');

      // Force re-initialization
      (channelNotesService as any).initialized = false;

      // Should not throw and use defaults
      await expect(channelNotesService.getNote('net', '#ch')).resolves.toBe('');
    });

    it('should handle missing storage data gracefully', async () => {
      // No data in storage

      // Force re-initialization
      (channelNotesService as any).initialized = false;

      await expect(channelNotesService.getNote('net', '#ch')).resolves.toBe('');
      await expect(channelNotesService.isBookmarked('net', '#ch')).resolves.toBe(false);
      await expect(channelNotesService.getLog('net', '#ch')).resolves.toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in network/channel names', async () => {
      await channelNotesService.setNote('net::special', '#ch@nnel!', 'Special note');
      const note = await channelNotesService.getNote('net::special', '#ch@nnel!');
      expect(note).toBe('Special note');
    });

    it('should handle empty channel/network names', async () => {
      await channelNotesService.setNote('', '', 'Empty note');
      const note = await channelNotesService.getNote('', '');
      expect(note).toBe('Empty note');
    });

    it('should handle very long notes', async () => {
      const longNote = 'a'.repeat(10000);
      await channelNotesService.setNote('net', '#ch', longNote);
      const note = await channelNotesService.getNote('net', '#ch');
      expect(note).toBe(longNote);
    });

    it('should handle rapid concurrent operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(channelNotesService.setNote('net', `#ch${i}`, `Note ${i}`));
        promises.push(channelNotesService.setBookmarked('net', `#ch${i}`, true));
      }

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        expect(await channelNotesService.getNote('net', `#ch${i}`)).toBe(`Note ${i}`);
        expect(await channelNotesService.isBookmarked('net', `#ch${i}`)).toBe(true);
      }
    });
  });
});
