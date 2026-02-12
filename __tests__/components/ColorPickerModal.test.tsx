/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for ColorPickerModal component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../src/i18n/transifex', () => ({
  useT: jest.fn().mockReturnValue((key: string) => key),
}));

jest.mock('../../src/components/ColorPalettePicker', () => ({
  ColorPalettePicker: () => null,
}));

import { ColorPickerModal } from '../../src/components/ColorPickerModal';

describe('ColorPickerModal', () => {
  const mockColors = {
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    surface: '#ffffff',
    border: '#cccccc',
    background: '#f0f0f0',
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onInsert: jest.fn(),
    colors: mockColors,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<ColorPickerModal {...defaultProps} />);
    expect(getByText('mIRC Colors')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(<ColorPickerModal {...defaultProps} visible={false} />);
    expect(queryByText('mIRC Colors')).toBeNull();
  });

  it('should render custom title when provided', () => {
    const { getByText } = render(<ColorPickerModal {...defaultProps} title="Custom Title" />);
    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('should call onClose when Close is pressed', () => {
    const { getByText } = render(<ColorPickerModal {...defaultProps} />);
    fireEvent.press(getByText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
