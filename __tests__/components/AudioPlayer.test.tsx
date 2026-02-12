/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for AudioPlayer component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock hooks before importing component
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      surfaceVariant: '#f0f0f0',
      primary: '#007AFF',
      error: '#ff0000',
      surface: '#ffffff',
      text: '#000000',
    },
  }),
}));

jest.mock('../../src/i18n/transifex', () => ({
  useT: jest.fn().mockReturnValue(
    jest.fn((key: string, params?: Record<string, string>) => {
      if (key === 'Audio error: {error}' && params?.error) {
        return `Audio error: ${params.error}`;
      }
      return key;
    })
  ),
}));

// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

import { AudioPlayer } from '../../src/components/AudioPlayer';

describe('AudioPlayer', () => {
  const defaultProps = {
    url: 'https://example.com/audio.mp3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with url', () => {
    const { root } = render(<AudioPlayer {...defaultProps} />);
    expect(root).toBeTruthy();
  });

  it('should show Play button initially', () => {
    const { getByText } = render(<AudioPlayer {...defaultProps} />);

    expect(getByText('Play')).toBeTruthy();
  });

  it('should toggle between Play and Pause', () => {
    const { getByText } = render(<AudioPlayer {...defaultProps} />);

    const button = getByText('Play');
    fireEvent.press(button);

    expect(getByText('Pause')).toBeTruthy();

    fireEvent.press(getByText('Pause'));
    expect(getByText('Play')).toBeTruthy();
  });

  it('should render Video component', () => {
    const { UNSAFE_getByType } = render(<AudioPlayer {...defaultProps} />);

    // Check that Video is rendered
    expect(() => UNSAFE_getByType('Video')).not.toThrow();
  });
});
