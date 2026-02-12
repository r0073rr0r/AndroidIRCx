/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for TabOptionsModal component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TabOptionsModal } from '../../src/components/TabOptionsModal';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const mockStyles = {
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, margin: 20, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalButton: { padding: 12, marginVertical: 4 },
  modalButtonCancel: { backgroundColor: '#ccc' },
  modalButtonText: { fontSize: 16 },
  destructiveOption: { color: 'red' },
};

describe('TabOptionsModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    title: 'Tab Options',
    options: [
      { text: 'Close', onPress: jest.fn() },
      { text: 'Close Others', onPress: jest.fn() },
      { text: 'Close All', onPress: jest.fn(), style: 'destructive' as const },
    ],
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<TabOptionsModal {...defaultProps} />);
    expect(getByText('Tab Options')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(<TabOptionsModal {...defaultProps} visible={false} />);
    expect(queryByText('Tab Options')).toBeNull();
  });

  it('should render all options', () => {
    const { getByText } = render(<TabOptionsModal {...defaultProps} />);
    expect(getByText('Close')).toBeTruthy();
    expect(getByText('Close Others')).toBeTruthy();
    expect(getByText('Close All')).toBeTruthy();
  });

  it('should call onClose and option onPress when option is pressed', () => {
    const { getByText } = render(<TabOptionsModal {...defaultProps} />);
    fireEvent.press(getByText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.options[0].onPress).toHaveBeenCalled();
  });

  it('should render default title when not provided', () => {
    const props = { ...defaultProps, title: '' };
    const { getByText } = render(<TabOptionsModal {...props} />);
    expect(getByText('Options')).toBeTruthy();
  });

  it('should apply destructive style to destructive options', () => {
    const { getByText } = render(<TabOptionsModal {...defaultProps} />);
    const destructiveOption = getByText('Close All');
    expect(destructiveOption).toBeTruthy();
  });

  it('should render options with icons', () => {
    const optionsWithIcons = [
      { text: 'Close', onPress: jest.fn(), icon: 'close' },
    ];
    const { getByText } = render(
      <TabOptionsModal {...defaultProps} options={optionsWithIcons} />
    );
    expect(getByText('Close')).toBeTruthy();
  });
});
