/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for VideoPlayer component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock hooks
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
  useT: jest.fn().mockReturnValue((key: string) => key),
}));

jest.mock('react-native-video', () => 'Video');

describe('VideoPlayer', () => {
  const VideoPlayer = require('../../src/components/VideoPlayer').VideoPlayer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with url', () => {
    const { root } = render(<VideoPlayer url="https://example.com/video.mp4" />);
    expect(root).toBeTruthy();
  });

  it('should show Play button initially', () => {
    const { getByText } = render(<VideoPlayer url="https://example.com/video.mp4" />);
    expect(getByText('Play')).toBeTruthy();
  });

  it('should toggle between Play and Pause', () => {
    const { getByText } = render(<VideoPlayer url="https://example.com/video.mp4" />);

    fireEvent.press(getByText('Play'));
    expect(getByText('Pause')).toBeTruthy();

    fireEvent.press(getByText('Pause'));
    expect(getByText('Play')).toBeTruthy();
  });

  it('should render Video component', () => {
    const { UNSAFE_getByType } = render(<VideoPlayer url="https://example.com/video.mp4" />);
    expect(() => UNSAFE_getByType('Video')).not.toThrow();
  });
});
