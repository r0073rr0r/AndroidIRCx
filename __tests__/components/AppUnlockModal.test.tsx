/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for AppUnlockModal component - Wave 5
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppUnlockModal } from '../../src/components/AppUnlockModal';

// Mock useSettingsSecurity hook
jest.mock('../../src/hooks/useSettingsSecurity', () => ({
  useSettingsSecurity: jest.fn().mockReturnValue({
    killSwitchCustomName: 'Emergency Exit',
    killSwitchCustomIcon: 'skull',
    killSwitchCustomColor: '#FF0000',
  }),
}));

// Mock FontAwesome5 icon
jest.mock('react-native-vector-icons/FontAwesome5', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, size, color }: any) => {
      return React.createElement(Text, { testID: `icon-${name}` }, `${name}`);
    },
  };
});

const mockColors = {
  surface: '#ffffff',
  border: '#cccccc',
  primary: '#007AFF',
  error: '#FF3B30',
  text: '#000000',
  textSecondary: '#666666',
};

const mockStyles = {
  lockOverlay: {},
  modalContent: {},
  modalTitle: {},
  modalInput: {},
  modalButtons: {},
  modalButton: {},
  modalButtonJoin: {},
  modalButtonText: {},
  modalButtonTextPrimary: {},
  optionText: {},
  killSwitchButton: {},
  killSwitchText: {},
};

describe('AppUnlockModal', () => {
  const defaultProps = {
    visible: true,
    useBiometric: false,
    usePin: true,
    pinEntry: '',
    pinError: '',
    onChangePinEntry: jest.fn(),
    onClearPinError: jest.fn(),
    onBiometricUnlock: jest.fn(),
    onPinUnlock: jest.fn(),
    onKillSwitch: undefined,
    colors: mockColors,
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByPlaceholderText, getByText } = render(
      <AppUnlockModal {...defaultProps} />
    );

    expect(getByText('App Locked')).toBeTruthy();
    expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
  });

  it('should not render content when not visible', () => {
    const { queryByText } = render(
      <AppUnlockModal {...defaultProps} visible={false} />
    );

    // Modal is controlled by visible prop - content is not accessible when not visible
    expect(queryByText('App Locked')).toBeNull();
  });

  it('should render PIN input when usePin is true', () => {
    const { getByPlaceholderText } = render(
      <AppUnlockModal {...defaultProps} usePin={true} />
    );

    expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
  });

  it('should not render PIN input when usePin is false', () => {
    const { queryByPlaceholderText } = render(
      <AppUnlockModal {...defaultProps} usePin={false} />
    );

    expect(queryByPlaceholderText('Enter PIN')).toBeNull();
  });

  it('should render biometric button when useBiometric is true', () => {
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} useBiometric={true} />
    );

    expect(getByText('Use Biometrics')).toBeTruthy();
  });

  it('should not render biometric button when useBiometric is false', () => {
    const { queryByText } = render(
      <AppUnlockModal {...defaultProps} useBiometric={false} />
    );

    expect(queryByText('Use Biometrics')).toBeNull();
  });

  it('should render unlock button when usePin is true', () => {
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} usePin={true} />
    );

    expect(getByText('Unlock')).toBeTruthy();
  });

  it('should call onChangePinEntry when PIN is entered', () => {
    const onChangePinEntry = jest.fn();
    const { getByPlaceholderText } = render(
      <AppUnlockModal {...defaultProps} onChangePinEntry={onChangePinEntry} />
    );

    const input = getByPlaceholderText('Enter PIN');
    fireEvent.changeText(input, '1234');

    expect(onChangePinEntry).toHaveBeenCalledWith('1234');
  });

  it('should sanitize non-numeric input in PIN field', () => {
    const onChangePinEntry = jest.fn();
    const onClearPinError = jest.fn();
    const { getByPlaceholderText } = render(
      <AppUnlockModal 
        {...defaultProps} 
        onChangePinEntry={onChangePinEntry}
        onClearPinError={onClearPinError}
      />
    );

    const input = getByPlaceholderText('Enter PIN');
    fireEvent.changeText(input, '12ab34');

    // Should only pass numeric characters
    expect(onChangePinEntry).toHaveBeenCalledWith('1234');
  });

  it('should clear error when PIN is entered', () => {
    const onClearPinError = jest.fn();
    const { getByPlaceholderText } = render(
      <AppUnlockModal {...defaultProps} pinError="Invalid PIN" onClearPinError={onClearPinError} />
    );

    const input = getByPlaceholderText('Enter PIN');
    fireEvent.changeText(input, '1');

    expect(onClearPinError).toHaveBeenCalled();
  });

  it('should display error message when pinError is provided', () => {
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} pinError="Invalid PIN" />
    );

    expect(getByText('Invalid PIN')).toBeTruthy();
  });

  it('should call onBiometricUnlock when biometric button is pressed', () => {
    const onBiometricUnlock = jest.fn();
    const onClearPinError = jest.fn();
    const { getByText } = render(
      <AppUnlockModal 
        {...defaultProps} 
        useBiometric={true}
        usePin={false}
        onBiometricUnlock={onBiometricUnlock}
        onClearPinError={onClearPinError}
      />
    );

    fireEvent.press(getByText('Use Biometrics'));

    expect(onBiometricUnlock).toHaveBeenCalledWith(true);
    // onClearPinError is only called if there's an error
  });

  it('should call onPinUnlock when unlock button is pressed', () => {
    const onPinUnlock = jest.fn();
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} onPinUnlock={onPinUnlock} />
    );

    fireEvent.press(getByText('Unlock'));

    expect(onPinUnlock).toHaveBeenCalled();
  });

  it('should render kill switch button when onKillSwitch is provided', () => {
    const onKillSwitch = jest.fn();
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} onKillSwitch={onKillSwitch} />
    );

    expect(getByText('Emergency Exit')).toBeTruthy();
  });

  it('should not render kill switch button when onKillSwitch is not provided', () => {
    const { queryByText } = render(
      <AppUnlockModal {...defaultProps} onKillSwitch={undefined} />
    );

    expect(queryByText('Emergency Exit')).toBeNull();
  });

  it('should call onKillSwitch when kill switch button is pressed', () => {
    const onKillSwitch = jest.fn();
    const { getByText } = render(
      <AppUnlockModal {...defaultProps} onKillSwitch={onKillSwitch} />
    );

    fireEvent.press(getByText('Emergency Exit'));

    expect(onKillSwitch).toHaveBeenCalled();
  });

  it('should handle both biometric and PIN enabled', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AppUnlockModal {...defaultProps} useBiometric={true} usePin={true} />
    );

    expect(getByText('Use Biometrics')).toBeTruthy();
    expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
    // The "Unlock" button for PIN is rendered
    expect(queryByText('Unlock')).toBeTruthy();
  });

  it('should render with custom kill switch configuration', () => {
    const onKillSwitch = jest.fn();
    const { getByText, getByTestId } = render(
      <AppUnlockModal {...defaultProps} onKillSwitch={onKillSwitch} />
    );

    expect(getByText('Emergency Exit')).toBeTruthy();
    expect(getByTestId('icon-skull')).toBeTruthy();
  });
});
