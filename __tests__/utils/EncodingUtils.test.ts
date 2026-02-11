/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for EncodingUtils - 100% coverage target
 */

import { repairMojibake } from '../../src/utils/EncodingUtils';

describe('EncodingUtils', () => {
  describe('repairMojibake', () => {
    it('should return original value for empty string', () => {
      expect(repairMojibake('')).toBe('');
    });

    it('should return original value for null/undefined', () => {
      expect(repairMojibake(null as any)).toBe(null as any);
      expect(repairMojibake(undefined as any)).toBe(undefined as any);
    });

    it('should return original value for ASCII text without mojibake', () => {
      expect(repairMojibake('Hello World')).toBe('Hello World');
      expect(repairMojibake('Test 123')).toBe('Test 123');
    });

    it('should return original value for Unicode text without mojibake markers', () => {
      expect(repairMojibake('Hello 世界')).toBe('Hello 世界');
      expect(repairMojibake('Café')).toBe('Café');
    });

    it('should repair mojibake with Ã character', () => {
      // Create actual mojibake: UTF-8 bytes interpreted as Latin1
      // é in UTF-8 is 0xC3 0xA9, which as Latin1 is "Ã©"
      const mojibake = 'CafÃ©'; // This is how "Café" looks when garbled
      expect(repairMojibake(mojibake)).toBe('Café');
    });

    it('should repair mojibake with Â character', () => {
      // â in UTF-8 is 0xC3 0xA2, garbled as "Ã¢"
      const mojibake = 'Ã¢'; // Garbled â
      const result = repairMojibake(mojibake);
      expect(result).toBe('â');
    });

    it('should return original if repaired contains replacement character', () => {
      // String that would create replacement character when repaired
      const problematic = 'Ã�'; // Invalid sequence
      const result = repairMojibake(problematic);
      expect(result).toBe(problematic);
    });

    it('should handle mixed text with mojibake markers', () => {
      const text = 'Hello Ã World';
      const result = repairMojibake(text);
      expect(typeof result).toBe('string');
    });

    it('should handle complex mojibake cases', () => {
      // Various characters commonly affected by mojibake
      // These are actual garbled UTF-8 sequences
      expect(repairMojibake('Ã©')).toBe('é');
      expect(repairMojibake('Ã¨')).toBe('è');
      expect(repairMojibake('Ã¢')).toBe('â');
      // "Ã " (C3 20) produces replacement char, so returns original
      expect(repairMojibake('Ã ')).toBe('Ã ');
    });

    it('should handle empty repair result', () => {
      // Edge case: what if repair produces empty string
      const emptyLike = '';
      expect(repairMojibake(emptyLike)).toBe('');
    });

    it('should not modify already correct UTF-8', () => {
      const correct = '日本語テキスト';
      expect(repairMojibake(correct)).toBe(correct);
    });
  });
});
