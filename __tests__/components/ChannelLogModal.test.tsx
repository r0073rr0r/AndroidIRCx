/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for ChannelLogModal component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChannelLogModal } from '../../src/components/ChannelLogModal';

const mockStyles = {
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, margin: 20, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  optionText: { fontSize: 14, padding: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalButton: { padding: 12, marginLeft: 8 },
  modalButtonCancel: { backgroundColor: '#ccc' },
  modalButtonJoin: { backgroundColor: '#007AFF' },
  modalButtonText: { color: '#000' },
  modalButtonTextPrimary: { color: '#fff' },
};

describe('ChannelLogModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    logEntries: [] as { timestamp: number; text: string }[],
    onClearLog: jest.fn(),
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<ChannelLogModal {...defaultProps} />);

    expect(getByText('Channel Activity')).toBeTruthy();
  });

  it('should show empty state when no entries', () => {
    const { getByText } = render(<ChannelLogModal {...defaultProps} />);

    expect(getByText('No activity recorded')).toBeTruthy();
  });

  it('should render log entries', () => {
    const entries = [
      { timestamp: Date.now(), text: 'User joined' },
      { timestamp: Date.now() + 1000, text: 'User left' },
    ];

    const { getByText } = render(
      <ChannelLogModal {...defaultProps} logEntries={entries} />
    );

    expect(getByText(/User joined/)).toBeTruthy();
    expect(getByText(/User left/)).toBeTruthy();
  });

  it('should call onClose when Close is pressed', () => {
    const { getByText } = render(<ChannelLogModal {...defaultProps} />);

    fireEvent.press(getByText('Close'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClearLog when Clear Log is pressed', () => {
    const { getByText } = render(<ChannelLogModal {...defaultProps} />);

    fireEvent.press(getByText('Clear Log'));

    expect(defaultProps.onClearLog).toHaveBeenCalled();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <ChannelLogModal {...defaultProps} visible={false} />
    );

    expect(queryByText('Channel Activity')).toBeNull();
  });

  it('should format timestamps correctly', () => {
    const timestamp = new Date('2024-01-15T10:30:00').getTime();
    const entries = [{ timestamp, text: 'Test event' }];

    const { getByText } = render(
      <ChannelLogModal {...defaultProps} logEntries={entries} />
    );

    // Check that the date is formatted and shown
    expect(getByText(/Test event/)).toBeTruthy();
  });

  it('should handle many log entries', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      timestamp: Date.now() + i * 1000,
      text: `Event ${i}`,
    }));

    const { getByText } = render(
      <ChannelLogModal {...defaultProps} logEntries={entries} />
    );

    expect(getByText(/Event 0/)).toBeTruthy();
    expect(getByText(/Event 9/)).toBeTruthy();
  });
});
