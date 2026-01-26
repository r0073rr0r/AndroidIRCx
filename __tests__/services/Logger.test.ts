/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for Logger service
 */

import { logger } from '../../src/services/Logger';

// Save original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

describe('Logger', () => {
  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    // Reset logger state - need to access private buffer
    // @ts-ignore - accessing private property for test reset
    (logger as any).buffer = [];
    logger.setEnabled(false);
    logger.setConsoleEcho(true);
    logger.setBufferLimit(200);
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });

  describe('setEnabled', () => {
    it('should enable logging', () => {
      logger.setEnabled(true);
      logger.debug('TEST', 'message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].tag).toBe('TEST');
      expect(buffer[0].message).toBe('message');
    });

    it('should disable logging', () => {
      logger.setEnabled(false);
      logger.debug('TEST', 'message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(0);
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      logger.setEnabled(true);
    });

    it('should log debug messages', () => {
      logger.debug('TAG', 'debug message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].level).toBe('debug');
      expect(buffer[0].tag).toBe('TAG');
      expect(buffer[0].message).toBe('debug message');
      expect(console.debug).toHaveBeenCalledWith('[DEBUG][TAG] debug message');
    });

    it('should log info messages', () => {
      logger.info('TAG', 'info message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].level).toBe('info');
      expect(console.info).toHaveBeenCalledWith('[INFO][TAG] info message');
    });

    it('should log warn messages', () => {
      logger.warn('TAG', 'warn message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].level).toBe('warn');
      expect(console.warn).toHaveBeenCalledWith('[WARN][TAG] warn message');
    });

    it('should log error messages', () => {
      logger.error('TAG', 'error message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].level).toBe('error');
      expect(console.error).toHaveBeenCalledWith('[ERROR][TAG] error message');
    });

    it('should include timestamp in log entries', () => {
      logger.info('TAG', 'message');

      const buffer = logger.getBuffer();
      expect(buffer[0].timestamp).toBeDefined();
      expect(typeof buffer[0].timestamp).toBe('number');
      expect(buffer[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('setConsoleEcho', () => {
    beforeEach(() => {
      logger.setEnabled(true);
    });

    it('should echo to console when enabled', () => {
      logger.setConsoleEcho(true);
      logger.info('TAG', 'message');

      expect(console.info).toHaveBeenCalledWith('[INFO][TAG] message');
    });

    it('should not echo to console when disabled', () => {
      logger.setConsoleEcho(false);
      logger.info('TAG', 'message');

      expect(console.info).not.toHaveBeenCalled();

      // But should still log to buffer
      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
    });
  });

  describe('buffer management', () => {
    beforeEach(() => {
      logger.setEnabled(true);
    });

    it('should respect buffer limit', () => {
      logger.setBufferLimit(60); // Must be >= 50 (enforced minimum)

      for (let i = 0; i < 80; i++) {
        logger.info('TAG', `message ${i}`);
      }

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(60);
      expect(buffer[0].message).toBe('message 20'); // Oldest kept
      expect(buffer[59].message).toBe('message 79'); // Newest
    });

    it('should enforce minimum buffer limit of 50', () => {
      logger.setBufferLimit(10); // Try to set below minimum

      for (let i = 0; i < 60; i++) {
        logger.info('TAG', `message ${i}`);
      }

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(50); // Enforced minimum
    });

    it('should trim buffer when limit is reduced', () => {
      logger.setBufferLimit(100);

      for (let i = 0; i < 80; i++) {
        logger.info('TAG', `message ${i}`);
      }

      expect(logger.getBuffer().length).toBe(80);

      // Reduce limit
      logger.setBufferLimit(50);

      // Buffer should be trimmed immediately
      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(50);
      expect(buffer[0].message).toBe('message 30');
    });
  });

  describe('getBuffer', () => {
    beforeEach(() => {
      logger.setEnabled(true);
    });

    it('should return copy of buffer', () => {
      logger.info('TAG', 'message 1');
      logger.info('TAG', 'message 2');

      const buffer1 = logger.getBuffer();
      const buffer2 = logger.getBuffer();

      expect(buffer1).not.toBe(buffer2); // Different references
      expect(buffer1).toEqual(buffer2); // Same content
    });

    it('should return empty array when no logs', () => {
      const buffer = logger.getBuffer();
      expect(buffer).toEqual([]);
    });

    it('should not allow external modification of buffer', () => {
      logger.info('TAG', 'message');

      const buffer = logger.getBuffer();
      buffer.push({
        level: 'error',
        tag: 'EXTERNAL',
        message: 'external modification',
        timestamp: Date.now(),
      });

      // Internal buffer should be unchanged
      expect(logger.getBuffer().length).toBe(1);
      expect(logger.getBuffer()[0].tag).toBe('TAG');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      logger.setEnabled(true);
    });

    it('should handle empty messages', () => {
      logger.info('TAG', '');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].message).toBe('');
    });

    it('should handle empty tags', () => {
      logger.info('', 'message');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].tag).toBe('');
    });

    it('should handle multiple rapid logs', () => {
      for (let i = 0; i < 100; i++) {
        logger.info('TAG', `message ${i}`);
      }

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(100);
    });

    it('should handle switching enabled state', () => {
      logger.setEnabled(true);
      logger.info('TAG', 'enabled');

      logger.setEnabled(false);
      logger.info('TAG', 'disabled');

      logger.setEnabled(true);
      logger.info('TAG', 'enabled again');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(2);
      expect(buffer[0].message).toBe('enabled');
      expect(buffer[1].message).toBe('enabled again');
    });
  });
});
