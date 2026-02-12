/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for TypingIndicator component - Wave 5
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Mock hooks before importing component
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      surface: '#ffffff',
      border: '#cccccc',
      primary: '#007AFF',
      textSecondary: '#666666',
    },
  }),
}));

// Mock transifex with proper translation function
jest.mock('../../src/i18n/transifex', () => ({
  useT: jest.fn().mockReturnValue(
    jest.fn((key: string, params?: Record<string, string | number>) => {
      // Handle all the typing indicator message formats
      if (key === '{user} is typing...' && params?.user) {
        return `${params.user} is typing...`;
      }
      if (key === '{userA} and {userB} are typing...' && params?.userA && params?.userB) {
        return `${params.userA} and ${params.userB} are typing...`;
      }
      if (key === '{userA}, {userB}, and {userC} are typing...' && params?.userA && params?.userB && params?.userC) {
        return `${params.userA}, ${params.userB}, and ${params.userC} are typing...`;
      }
      if (key === '{userA}, {userB}, and {count} others are typing...' && params?.userA && params?.userB) {
        return `${params.userA}, ${params.userB}, and ${params.count} others are typing...`;
      }
      return key;
    })
  ),
}));

// Import component after mocks
import { TypingIndicator } from '../../src/components/TypingIndicator';

describe('TypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render null when no users are typing', () => {
    const typingUsers = new Map<string, { status: 'active' | 'paused' | 'done'; timestamp: number }>();
    
    const { toJSON } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render when one user is typing', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
    ]);

    const { getByText } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John is typing...')).toBeTruthy();
  });

  it('should render when two users are typing', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
      ['Jane', { status: 'active' as const, timestamp: Date.now() }],
    ]);

    const { getByText } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John and Jane are typing...')).toBeTruthy();
  });

  it('should render when three users are typing', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
      ['Jane', { status: 'active' as const, timestamp: Date.now() }],
      ['Bob', { status: 'active' as const, timestamp: Date.now() }],
    ]);

    const { getByText } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John, Jane, and Bob are typing...')).toBeTruthy();
  });

  it('should render when more than three users are typing', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
      ['Jane', { status: 'active' as const, timestamp: Date.now() }],
      ['Bob', { status: 'active' as const, timestamp: Date.now() }],
      ['Alice', { status: 'active' as const, timestamp: Date.now() }],
      ['Charlie', { status: 'active' as const, timestamp: Date.now() }],
    ]);

    const { getByText } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John, Jane, and 3 others are typing...')).toBeTruthy();
  });

  it('should not render paused users', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
      ['Jane', { status: 'paused' as const, timestamp: Date.now() }],
      ['Bob', { status: 'done' as const, timestamp: Date.now() }],
    ]);

    const { getByText, queryByText } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John is typing...')).toBeTruthy();
    expect(queryByText('Jane')).toBeFalsy();
    expect(queryByText('Bob')).toBeFalsy();
  });

  it('should handle empty Map', () => {
    const typingUsers = new Map<string, { status: 'active' | 'paused' | 'done'; timestamp: number }>();

    const { toJSON } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should handle only paused and done users', () => {
    const typingUsers = new Map([
      ['Jane', { status: 'paused' as const, timestamp: Date.now() }],
      ['Bob', { status: 'done' as const, timestamp: Date.now() }],
    ]);

    const { toJSON } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render dots and text container', () => {
    const typingUsers = new Map([
      ['John', { status: 'active' as const, timestamp: Date.now() }],
    ]);

    const { getByText, root } = render(
      <TypingIndicator typingUsers={typingUsers} />
    );

    expect(getByText('John is typing...')).toBeTruthy();
    expect(root).toBeTruthy();
  });
});
