/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for modeDescriptions
 */

import {
  getUserModeDescription,
  getChannelModeDescription,
  getAllUserModeDescriptions,
  USER_MODE_DESCRIPTIONS,
  CHANNEL_MODE_DESCRIPTIONS,
} from '../../src/utils/modeDescriptions';

describe('modeDescriptions', () => {
  describe('getUserModeDescription', () => {
    it('should return description for owner mode', () => {
      const result = getUserModeDescription('q');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('q');
      expect(result?.name).toBe('Owner');
      expect(result?.prefix).toBe('~');
      expect(result?.description).toContain('owner');
    });

    it('should return description for admin mode', () => {
      const result = getUserModeDescription('a');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('a');
      expect(result?.name).toBe('Admin');
      expect(result?.prefix).toBe('&');
    });

    it('should return description for operator mode', () => {
      const result = getUserModeDescription('o');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('o');
      expect(result?.name).toBe('Operator');
      expect(result?.prefix).toBe('@');
    });

    it('should return description for half-op mode', () => {
      const result = getUserModeDescription('h');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('h');
      expect(result?.name).toBe('Half-Operator');
      expect(result?.prefix).toBe('%');
    });

    it('should return description for voice mode', () => {
      const result = getUserModeDescription('v');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('v');
      expect(result?.name).toBe('Voice');
      expect(result?.prefix).toBe('+');
    });

    it('should handle case insensitive lookup', () => {
      const result = getUserModeDescription('O');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('o');
    });

    it('should return undefined for unknown user mode', () => {
      const result = getUserModeDescription('xyz');
      expect(result).toBeUndefined();
    });
  });

  describe('getChannelModeDescription', () => {
    it('should return description for moderated mode', () => {
      const result = getChannelModeDescription('m');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('m');
      expect(result?.name).toBe('Moderated');
      expect(result?.description).toContain('Moderated');
    });

    it('should return description for secret mode', () => {
      const result = getChannelModeDescription('s');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('s');
      expect(result?.name).toBe('Secret');
    });

    it('should return description for invite-only mode', () => {
      const result = getChannelModeDescription('i');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('i');
      expect(result?.name).toBe('Invite-Only');
    });

    it('should return description for topic-protected mode', () => {
      const result = getChannelModeDescription('t');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('t');
      expect(result?.name).toBe('Topic Protected');
      expect(result?.description).toContain('topic');
    });

    it('should return description for no external messages mode', () => {
      const result = getChannelModeDescription('n');
      expect(result).toBeDefined();
      expect(result?.mode).toBe('n');
      expect(result?.name).toBe('No External Messages');
      expect(result?.description).toContain('external');
    });

    it('should return undefined for unknown channel mode', () => {
      const result = getChannelModeDescription('xyz');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllUserModeDescriptions', () => {
    it('should return all user modes in priority order', () => {
      const result = getAllUserModeDescriptions();
      expect(result).toHaveLength(5);
      expect(result[0].mode).toBe('q'); // Owner first
      expect(result[1].mode).toBe('a'); // Admin second
      expect(result[2].mode).toBe('o'); // Operator third
      expect(result[3].mode).toBe('h'); // Half-op fourth
      expect(result[4].mode).toBe('v'); // Voice last
    });

    it('should return valid mode descriptions', () => {
      const result = getAllUserModeDescriptions();
      result.forEach(mode => {
        expect(mode).toBeDefined();
        expect(mode.mode).toBeDefined();
        expect(mode.name).toBeDefined();
        expect(mode.description).toBeDefined();
        expect(mode.prefix).toBeDefined();
      });
    });
  });

  describe('USER_MODE_DESCRIPTIONS', () => {
    it('should contain all standard user modes', () => {
      expect(USER_MODE_DESCRIPTIONS.q).toBeDefined();
      expect(USER_MODE_DESCRIPTIONS.a).toBeDefined();
      expect(USER_MODE_DESCRIPTIONS.o).toBeDefined();
      expect(USER_MODE_DESCRIPTIONS.h).toBeDefined();
      expect(USER_MODE_DESCRIPTIONS.v).toBeDefined();
    });
  });

  describe('CHANNEL_MODE_DESCRIPTIONS', () => {
    it('should contain common channel modes', () => {
      expect(CHANNEL_MODE_DESCRIPTIONS.m).toBeDefined(); // Moderated
      expect(CHANNEL_MODE_DESCRIPTIONS.s).toBeDefined(); // Secret
      expect(CHANNEL_MODE_DESCRIPTIONS.i).toBeDefined(); // Invite-only
      expect(CHANNEL_MODE_DESCRIPTIONS.t).toBeDefined(); // Topic protected
      expect(CHANNEL_MODE_DESCRIPTIONS.n).toBeDefined(); // No external
      expect(CHANNEL_MODE_DESCRIPTIONS.k).toBeDefined(); // Channel key
      expect(CHANNEL_MODE_DESCRIPTIONS.l).toBeDefined(); // User limit
    });

    it('should have descriptions for all modes', () => {
      Object.values(CHANNEL_MODE_DESCRIPTIONS).forEach(mode => {
        expect(mode.mode).toBeDefined();
        expect(mode.name).toBeDefined();
        expect(mode.description).toBeDefined();
      });
    });
  });
});
