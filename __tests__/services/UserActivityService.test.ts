/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for UserActivityService
 */

import { userActivityService, UserActivity } from '../../src/services/UserActivityService';

describe('UserActivityService', () => {
  beforeEach(() => {
    // Reset service state
    (userActivityService as any).activities = new Map();
  });

  describe('recordEvent', () => {
    it('should record user activity', () => {
      const before = Date.now();
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN', { channel: '#channel' });
      const after = Date.now();

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity).toBeDefined();
      expect(activity?.nick).toBe('testnick');
      expect(activity?.network).toBe('testnet');
      expect(activity?.lastAction).toBe('JOIN');
      expect(activity?.channel).toBe('#channel');
      expect(activity?.lastSeenAt).toBeGreaterThanOrEqual(before);
      expect(activity?.lastSeenAt).toBeLessThanOrEqual(after);
    });

    it('should update existing activity', () => {
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN', { channel: '#channel1' });
      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG', { channel: '#channel1', text: 'Hello' });

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.lastAction).toBe('PRIVMSG');
      expect(activity?.text).toBe('Hello');
      expect(activity?.channel).toBe('#channel1');
    });

    it('should preserve channel if not provided in context', () => {
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN', { channel: '#channel' });
      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG', { text: 'Hello' });

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.channel).toBe('#channel'); // Preserved from previous
      expect(activity?.text).toBe('Hello');
    });

    it('should handle undefined nick gracefully', () => {
      userActivityService.recordEvent(undefined, 'testnet', 'JOIN');
      const activity = userActivityService.getActivity('undefined', 'testnet');
      expect(activity).toBeUndefined();
    });

    it('should handle activity without network', () => {
      userActivityService.recordEvent('testnick', undefined, 'JOIN', { channel: '#channel' });

      const activity = userActivityService.getActivity('testnick');
      expect(activity).toBeDefined();
      expect(activity?.nick).toBe('testnick');
      expect(activity?.network).toBeUndefined();
    });

    it('should treat nicks case-insensitively', () => {
      userActivityService.recordEvent('TestNick', 'testnet', 'JOIN', { channel: '#channel' });

      const activity1 = userActivityService.getActivity('testnick', 'testnet');
      const activity2 = userActivityService.getActivity('TESTNICK', 'testnet');
      const activity3 = userActivityService.getActivity('TestNick', 'testnet');

      expect(activity1).toBeDefined();
      expect(activity1).toEqual(activity2);
      expect(activity2).toEqual(activity3);
    });

    it('should handle different networks separately', () => {
      userActivityService.recordEvent('testnick', 'net1', 'JOIN', { channel: '#channel1' });
      userActivityService.recordEvent('testnick', 'net2', 'JOIN', { channel: '#channel2' });

      const activity1 = userActivityService.getActivity('testnick', 'net1');
      const activity2 = userActivityService.getActivity('testnick', 'net2');

      expect(activity1?.channel).toBe('#channel1');
      expect(activity2?.channel).toBe('#channel2');
    });

    it('should record multiple users', () => {
      userActivityService.recordEvent('user1', 'testnet', 'JOIN');
      userActivityService.recordEvent('user2', 'testnet', 'PART');
      userActivityService.recordEvent('user3', 'testnet', 'PRIVMSG');

      expect(userActivityService.getActivity('user1', 'testnet')?.lastAction).toBe('JOIN');
      expect(userActivityService.getActivity('user2', 'testnet')?.lastAction).toBe('PART');
      expect(userActivityService.getActivity('user3', 'testnet')?.lastAction).toBe('PRIVMSG');
    });

    it('should handle context with text', () => {
      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG', {
        channel: '#channel',
        text: 'Test message',
      });

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.text).toBe('Test message');
    });

    it('should clear text when not provided', () => {
      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG', {
        channel: '#channel',
        text: 'First message',
      });
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN', { channel: '#channel' });

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.text).toBeUndefined();
    });
  });

  describe('getActivity', () => {
    it('should return undefined for non-existent activity', () => {
      const activity = userActivityService.getActivity('nonexistent', 'testnet');
      expect(activity).toBeUndefined();
    });

    it('should return undefined for undefined nick', () => {
      const activity = userActivityService.getActivity(undefined as any);
      expect(activity).toBeUndefined();
    });

    it('should return activity for network-less lookup', () => {
      userActivityService.recordEvent('testnick', undefined, 'JOIN');
      const activity = userActivityService.getActivity('testnick');
      expect(activity).toBeDefined();
    });

    it('should distinguish between network and no-network activity', () => {
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN', { channel: '#net' });
      userActivityService.recordEvent('testnick', undefined, 'JOIN', { channel: '#nonet' });

      const activityWithNet = userActivityService.getActivity('testnick', 'testnet');
      const activityWithoutNet = userActivityService.getActivity('testnick');

      expect(activityWithNet?.channel).toBe('#net');
      expect(activityWithoutNet?.channel).toBe('#nonet');
    });
  });

  describe('clearNetwork', () => {
    it('should clear all activities for a network', () => {
      userActivityService.recordEvent('user1', 'testnet', 'JOIN');
      userActivityService.recordEvent('user2', 'testnet', 'PART');
      userActivityService.recordEvent('user3', 'othernet', 'PRIVMSG');

      userActivityService.clearNetwork('testnet');

      expect(userActivityService.getActivity('user1', 'testnet')).toBeUndefined();
      expect(userActivityService.getActivity('user2', 'testnet')).toBeUndefined();
      expect(userActivityService.getActivity('user3', 'othernet')).toBeDefined();
    });

    it('should handle clearing empty network', () => {
      expect(() => userActivityService.clearNetwork('nonexistent')).not.toThrow();
    });

    it('should not affect activities without network', () => {
      userActivityService.recordEvent('testnick', undefined, 'JOIN');
      userActivityService.recordEvent('othernick', 'testnet', 'PART');

      userActivityService.clearNetwork('testnet');

      expect(userActivityService.getActivity('testnick')).toBeDefined();
      expect(userActivityService.getActivity('othernick', 'testnet')).toBeUndefined();
    });

    it('should clear multiple users from same network', () => {
      for (let i = 0; i < 10; i++) {
        userActivityService.recordEvent(`user${i}`, 'testnet', 'JOIN');
      }

      userActivityService.clearNetwork('testnet');

      for (let i = 0; i < 10; i++) {
        expect(userActivityService.getActivity(`user${i}`, 'testnet')).toBeUndefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in nicks', () => {
      userActivityService.recordEvent('test[away]', 'testnet', 'JOIN');
      userActivityService.recordEvent('user|mobile', 'testnet', 'PART');

      expect(userActivityService.getActivity('test[away]', 'testnet')).toBeDefined();
      expect(userActivityService.getActivity('user|mobile', 'testnet')).toBeDefined();
    });

    it('should handle special characters in network names', () => {
      userActivityService.recordEvent('testnick', 'net-work_123', 'JOIN');
      const activity = userActivityService.getActivity('testnick', 'net-work_123');
      expect(activity).toBeDefined();
    });

    it('should handle very long action strings', () => {
      const longAction = 'A'.repeat(1000);
      userActivityService.recordEvent('testnick', 'testnet', longAction);

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.lastAction).toBe(longAction);
    });

    it('should handle very long text in context', () => {
      const longText = 'B'.repeat(10000);
      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG', { text: longText });

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.text).toBe(longText);
    });

    it('should handle rapid sequential updates', () => {
      for (let i = 0; i < 100; i++) {
        userActivityService.recordEvent('testnick', 'testnet', `ACTION${i}`, { text: `msg${i}` });
      }

      const activity = userActivityService.getActivity('testnick', 'testnet');
      expect(activity?.lastAction).toBe('ACTION99');
      expect(activity?.text).toBe('msg99');
    });

    it('should handle empty strings', () => {
      userActivityService.recordEvent('', 'testnet', '');
      const activity = userActivityService.getActivity('', 'testnet');
      expect(activity).toBeUndefined(); // Empty nick treated as undefined
    });

    it('should maintain separate state for different instances', () => {
      // This service is a singleton, but verify state isolation
      userActivityService.recordEvent('user1', 'net1', 'JOIN');
      userActivityService.recordEvent('user2', 'net2', 'PART');

      const activities = (userActivityService as any).activities;
      expect(activities.size).toBe(2);
    });
  });

  describe('timestamp behavior', () => {
    it('should update timestamp on each event', async () => {
      userActivityService.recordEvent('testnick', 'testnet', 'JOIN');
      const firstTime = userActivityService.getActivity('testnick', 'testnet')?.lastSeenAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      userActivityService.recordEvent('testnick', 'testnet', 'PRIVMSG');
      const secondTime = userActivityService.getActivity('testnick', 'testnet')?.lastSeenAt;

      expect(secondTime).toBeGreaterThan(firstTime!);
    });
  });
});
