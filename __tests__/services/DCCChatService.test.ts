/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for DCCChatService - Wave 6
 */

import { dccChatService, DCCChatSession } from '../../src/services/DCCChatService';

// Mock react-native-tcp-socket
const mockSocket = {
  write: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
};

const mockServer = {
  listen: jest.fn(),
  close: jest.fn(),
  address: jest.fn().mockReturnValue({ port: 12345, address: '127.0.0.1' }),
};

jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn().mockReturnValue(mockSocket),
  createServer: jest.fn().mockReturnValue(mockServer),
}));

jest.mock('../../src/i18n/transifex', () => ({
  tx: { t: jest.fn((key: string) => key) },
}));

describe('DCCChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (dccChatService as any).sessions = new Map();
    (dccChatService as any).sockets = new Map();
    (dccChatService as any).servers = new Map();
    (dccChatService as any).sessionListeners = [];
    (dccChatService as any).messageListeners = [];
    (dccChatService as any).idCounter = 0;
  });

  describe('Parse DCC Chat Invite', () => {
    it('should parse valid DCC CHAT invite', () => {
      const result = dccChatService.parseDccChatInvite('\x01DCC CHAT chat 2130706433 12345\x01');

      expect(result).toEqual({ host: '127.0.0.1', port: 12345 });
    });

    it('should parse DCC CHAT with IP address as string', () => {
      const result = dccChatService.parseDccChatInvite('\x01DCC CHAT chat 192.168.1.1 54321\x01');

      expect(result).not.toBeNull();
      expect(result?.port).toBe(54321);
    });

    it('should return null for non-DCC message', () => {
      const result = dccChatService.parseDccChatInvite('Hello world');
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = dccChatService.parseDccChatInvite(undefined);
      expect(result).toBeNull();
    });

    it('should return null for incomplete DCC message', () => {
      const result = dccChatService.parseDccChatInvite('\x01DCC CHAT\x01');
      expect(result).toBeNull();
    });

    it('should return null for invalid port', () => {
      const result = dccChatService.parseDccChatInvite('\x01DCC CHAT chat 127.0.0.1 invalid\x01');
      expect(result).toBeNull();
    });

    it('should handle CTCP markers', () => {
      const result = dccChatService.parseDccChatInvite('\x01DCC CHAT chat 127.0.0.1 12345\x01');
      expect(result).not.toBeNull();
    });
  });

  describe('Handle Incoming Invite', () => {
    it('should create incoming session', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);

      expect(session.id).toBeDefined();
      expect(session.peerNick).toBe('John');
      expect(session.networkId).toBe('freenode');
      expect(session.direction).toBe('incoming');
      expect(session.host).toBe('127.0.0.1');
      expect(session.port).toBe(12345);
      expect(session.status).toBe('pending');
      expect(session.messages).toEqual([]);
    });

    it('should notify session listeners', () => {
      const listener = jest.fn();
      dccChatService.onSessionUpdate(listener);

      dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        peerNick: 'John',
        status: 'pending',
      }));
    });
  });

  describe('Session Listeners', () => {
    it('should return unsubscribe function', () => {
      const unsubscribe = dccChatService.onSessionUpdate(() => {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe session listener', () => {
      const listener = jest.fn();
      const unsubscribe = dccChatService.onSessionUpdate(listener);

      unsubscribe();
      dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function for message listener', () => {
      const unsubscribe = dccChatService.onMessage(() => {});
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Send Message', () => {
    it('should send message through socket', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);
      (session as any).status = 'connected';
      (dccChatService as any).sockets.set(session.id, mockSocket);

      dccChatService.sendMessage(session.id, 'Hello');

      expect(mockSocket.write).toHaveBeenCalledWith('Hello\n', 'utf8');
    });

    it('should not send if no socket', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);
      (session as any).status = 'connected';

      dccChatService.sendMessage(session.id, 'Hello');

      expect(mockSocket.write).not.toHaveBeenCalled();
    });

    it('should not send if not connected', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);
      (dccChatService as any).sockets.set(session.id, mockSocket);

      dccChatService.sendMessage(session.id, 'Hello');

      expect(mockSocket.write).not.toHaveBeenCalled();
    });
  });

  describe('Close Session', () => {
    it('should close socket and server', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);
      (dccChatService as any).sockets.set(session.id, mockSocket);
      (dccChatService as any).servers.set(session.id, mockServer);

      dccChatService.closeSession(session.id);

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should update session status to closed', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);

      const listener = jest.fn();
      dccChatService.onSessionUpdate(listener);

      dccChatService.closeSession(session.id);

      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
      expect(lastCall.status).toBe('closed');
    });

    it('should clean up maps', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);
      (dccChatService as any).sockets.set(session.id, mockSocket);

      dccChatService.closeSession(session.id);

      expect((dccChatService as any).sockets.has(session.id)).toBe(false);
    });
  });

  describe('IP Conversion', () => {
    it('should convert IP to integer', () => {
      // Access private method through any
      const ipToInt = (dccChatService as any).ipToInt.bind(dccChatService);

      expect(ipToInt('127.0.0.1')).toBe(2130706433);
      expect(ipToInt('192.168.1.1')).toBe(3232235777);
    });

    it('should return null for invalid IP', () => {
      const ipToInt = (dccChatService as any).ipToInt.bind(dccChatService);

      expect(ipToInt('invalid')).toBeNull();
      expect(ipToInt('127.0.0')).toBeNull();
      expect(ipToInt('127.0.0.1.1')).toBeNull();
    });

    it('should convert integer to IP', () => {
      const intToIp = (dccChatService as any).intToIp.bind(dccChatService);

      expect(intToIp('2130706433')).toBe('127.0.0.1');
    });

    it('should return original if not a number', () => {
      const intToIp = (dccChatService as any).intToIp.bind(dccChatService);

      expect(intToIp('invalid')).toBe('invalid');
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const session1 = dccChatService.handleIncomingInvite('John1', 'freenode', '127.0.0.1', 12345);
      const session2 = dccChatService.handleIncomingInvite('John2', 'freenode', '127.0.0.1', 12346);

      expect(session1.id).not.toBe(session2.id);
    });

    it('should prefix IDs correctly', () => {
      const session = dccChatService.handleIncomingInvite('John', 'freenode', '127.0.0.1', 12345);

      expect(session.id.startsWith('dcc-')).toBe(true);
    });

    it('should wrap counter at 1 million', () => {
      (dccChatService as any).idCounter = 999999;

      const session1 = dccChatService.handleIncomingInvite('John1', 'freenode', '127.0.0.1', 12345);
      const session2 = dccChatService.handleIncomingInvite('John2', 'freenode', '127.0.0.1', 12346);

      expect((dccChatService as any).idCounter).toBe(1);
    });
  });
});
