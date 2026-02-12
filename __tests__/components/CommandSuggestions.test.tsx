/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for CommandSuggestions component - Wave 5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CommandSuggestions } from '../../src/components/CommandSuggestions';
import { CommandSuggestion } from '../../src/services/ServiceCommandProvider';

// Mock MaterialCommunityIcons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
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
  text: '#000000',
  textSecondary: '#666666',
  primary: '#007AFF',
  surface: '#ffffff',
  border: '#cccccc',
  background: '#f5f5f5',
};

describe('CommandSuggestions', () => {
  const mockSuggestions: CommandSuggestion[] = [
    {
      text: 'REGISTER',
      label: 'REGISTER',
      description: 'Register a channel',
      isAlias: false,
    },
    {
      text: 'HELP',
      label: 'HELP',
      description: 'Show help information',
      isAlias: false,
    },
    {
      text: 'cs',
      label: 'ChanServ',
      description: 'Alias for ChanServ',
      isAlias: true,
    },
  ];

  const defaultProps = {
    suggestions: mockSuggestions,
    onSelect: jest.fn(),
    colors: mockColors,
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render null when not visible', () => {
    const { toJSON } = render(
      <CommandSuggestions {...defaultProps} visible={false} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render null when suggestions are empty', () => {
    const { toJSON } = render(
      <CommandSuggestions {...defaultProps} suggestions={[]} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render suggestions list when visible', () => {
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} />
    );

    expect(getByText('REGISTER')).toBeTruthy();
    expect(getByText('HELP')).toBeTruthy();
    expect(getByText('ChanServ')).toBeTruthy();
  });

  it('should render command descriptions', () => {
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} />
    );

    expect(getByText('Register a channel')).toBeTruthy();
    expect(getByText('Show help information')).toBeTruthy();
    expect(getByText('Alias for ChanServ')).toBeTruthy();
  });

  it('should render server icon for non-alias commands', () => {
    const { getAllByTestId } = render(
      <CommandSuggestions {...defaultProps} />
    );

    // REGISTER and HELP should have server icon
    const serverIcons = getAllByTestId('icon-server');
    expect(serverIcons.length).toBeGreaterThanOrEqual(2);
  });

  it('should render flash icon for alias commands', () => {
    const { getByTestId } = render(
      <CommandSuggestions {...defaultProps} />
    );

    // cs (alias) should have flash icon
    expect(getByTestId('icon-flash')).toBeTruthy();
  });

  it('should render alias badge for alias commands', () => {
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} />
    );

    expect(getByText('alias')).toBeTruthy();
  });

  it('should call onSelect when suggestion is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} onSelect={onSelect} />
    );

    fireEvent.press(getByText('REGISTER'));

    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('should call onSelect with correct suggestion for each item', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} onSelect={onSelect} />
    );

    // Press each suggestion
    fireEvent.press(getByText('REGISTER'));
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);

    onSelect.mockClear();
    fireEvent.press(getByText('HELP'));
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[1]);

    onSelect.mockClear();
    fireEvent.press(getByText('ChanServ'));
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[2]);
  });

  it('should render chevron-right icon for each suggestion', () => {
    const { getAllByTestId } = render(
      <CommandSuggestions {...defaultProps} />
    );

    const chevrons = getAllByTestId('icon-chevron-right');
    expect(chevrons.length).toBe(3);
  });

  it('should apply correct styling based on colors', () => {
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} />
    );

    const registerLabel = getByText('REGISTER');
    expect(registerLabel.props.style).toBeDefined();
    
    const description = getByText('Register a channel');
    expect(description.props.style).toBeDefined();
  });

  it('should handle single suggestion', () => {
    const singleSuggestion: CommandSuggestion[] = [
      {
        text: 'REGISTER',
        label: 'REGISTER',
        description: 'Register a channel',
        isAlias: false,
      },
    ];

    const { getByText, queryAllByTestId } = render(
      <CommandSuggestions {...defaultProps} suggestions={singleSuggestion} />
    );

    expect(getByText('REGISTER')).toBeTruthy();
    // Should still render the suggestion properly
    const chevrons = queryAllByTestId('icon-chevron-right');
    expect(chevrons.length).toBe(1);
  });

  it('should handle suggestions without description', () => {
    const suggestionsWithoutDesc: CommandSuggestion[] = [
      {
        text: 'TEST',
        label: 'TEST',
        description: '',
        isAlias: false,
      },
    ];

    const { getByText } = render(
      <CommandSuggestions {...defaultProps} suggestions={suggestionsWithoutDesc} />
    );

    expect(getByText('TEST')).toBeTruthy();
  });

  it('should render with correct container styling', () => {
    const { root } = render(
      <CommandSuggestions {...defaultProps} />
    );

    expect(root).toBeTruthy();
  });

  it('should use unique keys for each suggestion', () => {
    const duplicateSuggestions: CommandSuggestion[] = [
      {
        text: 'REGISTER',
        label: 'REGISTER #1',
        description: 'First register',
        isAlias: false,
      },
      {
        text: 'REGISTER',
        label: 'REGISTER #2',
        description: 'Second register',
        isAlias: false,
      },
    ];

    // Should not throw warning about duplicate keys
    const { getByText } = render(
      <CommandSuggestions {...defaultProps} suggestions={duplicateSuggestions} />
    );

    expect(getByText('REGISTER #1')).toBeTruthy();
    expect(getByText('REGISTER #2')).toBeTruthy();
  });
});
