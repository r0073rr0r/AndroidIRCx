/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for ChannelNoteModal component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChannelNoteModal } from '../../src/components/ChannelNoteModal';

const mockStyles = {
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, margin: 20, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalButton: { padding: 12, marginLeft: 8 },
  modalButtonCancel: { backgroundColor: '#ccc' },
  modalButtonJoin: { backgroundColor: '#007AFF' },
  modalButtonText: { color: '#000' },
  modalButtonTextPrimary: { color: '#fff' },
};

describe('ChannelNoteModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    channelName: '#general',
    value: '',
    onChangeValue: jest.fn(),
    onSave: jest.fn(),
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<ChannelNoteModal {...defaultProps} />);

    expect(getByText('Channel Note (#general)')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(<ChannelNoteModal {...defaultProps} visible={false} />);

    expect(queryByText('Channel Note (#general)')).toBeNull();
  });

  it('should call onClose when Cancel is pressed', () => {
    const { getByText } = render(<ChannelNoteModal {...defaultProps} />);

    fireEvent.press(getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose and onSave when Save is pressed', () => {
    const { getByText } = render(<ChannelNoteModal {...defaultProps} />);

    fireEvent.press(getByText('Save'));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('should call onChangeValue when text is entered', () => {
    const { getByPlaceholderText } = render(<ChannelNoteModal {...defaultProps} />);

    const input = getByPlaceholderText('Enter a note for this channel');
    fireEvent.changeText(input, 'Test note');

    expect(defaultProps.onChangeValue).toHaveBeenCalledWith('Test note');
  });

  it('should display current value in input', () => {
    const { getByDisplayValue } = render(
      <ChannelNoteModal {...defaultProps} value="Existing note" />
    );

    expect(getByDisplayValue('Existing note')).toBeTruthy();
  });

  it('should display different channel name', () => {
    const { getByText } = render(
      <ChannelNoteModal {...defaultProps} channelName="#random" />
    );

    expect(getByText('Channel Note (#random)')).toBeTruthy();
  });

  it('should have multiline input', () => {
    const { getByPlaceholderText } = render(<ChannelNoteModal {...defaultProps} />);

    const input = getByPlaceholderText('Enter a note for this channel');
    expect(input.props.multiline).toBe(true);
  });
});
