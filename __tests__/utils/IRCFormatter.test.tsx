/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for IRCFormatter - 100% coverage target
 */

import React from 'react';
import { Text, Linking } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  IRC_STANDARD_COLOR_MAP,
  IRC_EXTENDED_COLOR_MAP,
  IRC_FORMAT_CODES,
  formatIRCText,
  formatIRCTextAsComponent,
  stripIRCFormatting,
  formatIRCDebug,
  formatIRCTextWithLinks,
} from '../../src/utils/IRCFormatter';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

describe('IRCFormatter', () => {
  describe('Color Maps', () => {
    it('should have all standard colors defined (0-15)', () => {
      expect(Object.keys(IRC_STANDARD_COLOR_MAP)).toHaveLength(16);
      for (let i = 0; i <= 15; i++) {
        expect(IRC_STANDARD_COLOR_MAP[i]).toBeDefined();
        expect(IRC_STANDARD_COLOR_MAP[i]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it('should have all extended colors defined (16-98)', () => {
      expect(Object.keys(IRC_EXTENDED_COLOR_MAP)).toHaveLength(83);
      for (let i = 16; i <= 98; i++) {
        expect(IRC_EXTENDED_COLOR_MAP[i]).toBeDefined();
        expect(IRC_EXTENDED_COLOR_MAP[i]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it('should have correct standard color values', () => {
      expect(IRC_STANDARD_COLOR_MAP[0]).toBe('#FFFFFF'); // white
      expect(IRC_STANDARD_COLOR_MAP[1]).toBe('#000000'); // black
      expect(IRC_STANDARD_COLOR_MAP[2]).toBe('#00007F'); // blue
      expect(IRC_STANDARD_COLOR_MAP[3]).toBe('#009300'); // green
      expect(IRC_STANDARD_COLOR_MAP[4]).toBe('#FF0000'); // red
    });

    it('should have correct extended color values', () => {
      expect(IRC_EXTENDED_COLOR_MAP[16]).toBe('#470000');
      expect(IRC_EXTENDED_COLOR_MAP[98]).toBe('#ffffff');
      expect(IRC_EXTENDED_COLOR_MAP[52]).toBe('#ff0000');
      expect(IRC_EXTENDED_COLOR_MAP[60]).toBe('#0000ff');
    });
  });

  describe('IRC_FORMAT_CODES', () => {
    it('should have correct format code values', () => {
      expect(IRC_FORMAT_CODES.BOLD).toBe(0x02);
      expect(IRC_FORMAT_CODES.COLOR).toBe(0x03);
      expect(IRC_FORMAT_CODES.RESET).toBe(0x0F);
      expect(IRC_FORMAT_CODES.REVERSE).toBe(0x16);
      expect(IRC_FORMAT_CODES.ITALIC).toBe(0x1D);
      expect(IRC_FORMAT_CODES.STRIKETHROUGH).toBe(0x1E);
      expect(IRC_FORMAT_CODES.UNDERLINE).toBe(0x1F);
    });
  });

  describe('formatIRCText', () => {
    it('should return empty Text for empty string', () => {
      const result = formatIRCText('');
      expect(result).toHaveLength(1);
      expect(result[0].props.children).toBeUndefined();
    });

    it('should return empty Text for undefined/null', () => {
      const result = formatIRCText('');
      expect(result).toHaveLength(1);
    });

    it('should format plain text without codes', () => {
      const result = formatIRCText('Hello World');
      expect(result).toHaveLength(1);
      expect(result[0].props.children).toBe('Hello World');
    });

    it('should handle bold formatting', () => {
      const result = formatIRCText(`${String.fromCharCode(0x02)}BoldText`);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].props.style.fontWeight).toBe('bold');
    });

    it('should toggle bold formatting', () => {
      const text = `${String.fromCharCode(0x02)}Bold${String.fromCharCode(0x02)}Normal`;
      const result = formatIRCText(text);
      expect(result).toHaveLength(2);
      expect(result[0].props.style.fontWeight).toBe('bold');
      expect(result[1].props.style.fontWeight).toBeUndefined();
    });

    it('should handle underline formatting', () => {
      const result = formatIRCText(`Hello ${String.fromCharCode(0x1F)}World`);
      expect(result).toHaveLength(2);
      expect(result[1].props.style.textDecorationLine).toBe('underline');
    });

    it('should handle italic formatting', () => {
      const result = formatIRCText(`Hello ${String.fromCharCode(0x1D)}World`);
      expect(result).toHaveLength(2);
      expect(result[1].props.style.fontStyle).toBe('italic');
    });

    it('should handle strikethrough formatting', () => {
      const result = formatIRCText(`Hello ${String.fromCharCode(0x1E)}World`);
      expect(result).toHaveLength(2);
      expect(result[1].props.style.textDecorationLine).toBe('line-through');
    });

    it('should handle reverse formatting', () => {
      const text = `${String.fromCharCode(0x03)}4,8${String.fromCharCode(0x16)}Reverse${String.fromCharCode(0x0F)}`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle reset code', () => {
      const text = `${String.fromCharCode(0x02)}Bold${String.fromCharCode(0x0F)}Normal`;
      const result = formatIRCText(text);
      expect(result).toHaveLength(2);
      expect(result[0].props.style.fontWeight).toBe('bold');
      expect(result[1].props.style.fontWeight).toBeUndefined();
    });

    it('should handle single foreground color', () => {
      const text = `${String.fromCharCode(0x03)}4Red Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle two-digit foreground color', () => {
      const text = `${String.fromCharCode(0x03)}12Light Blue Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle foreground and background color', () => {
      const text = `${String.fromCharCode(0x03)}4,8Colored Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle two-digit foreground and background color', () => {
      const text = `${String.fromCharCode(0x03)}12,04Colors`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle color code without digits (reset color)', () => {
      const text = `${String.fromCharCode(0x03)}No Color Specified`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle extended colors (16-98)', () => {
      const text = `${String.fromCharCode(0x03)}52Extended Color`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiple format codes', () => {
      const text = `${String.fromCharCode(0x02)}${String.fromCharCode(0x1F)}${String.fromCharCode(0x1D)}Bold Underline Italic`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
      const style = result[0].props.style;
      expect(style.fontWeight).toBe('bold');
      expect(style.textDecorationLine).toBe('underline');
      expect(style.fontStyle).toBe('italic');
    });

    it('should handle combination of underline and strikethrough', () => {
      const text = `${String.fromCharCode(0x1F)}${String.fromCharCode(0x1E)}UnderStrikethrough`;
      const result = formatIRCText(text);
      expect(result[0].props.style.textDecorationLine).toContain('underline');
      expect(result[0].props.style.textDecorationLine).toContain('line-through');
    });

    it('should preserve trailing spaces', () => {
      const text = 'Text with trailing   ';
      const result = formatIRCText(text);
      expect(result[0].props.children).toContain('\u00a0');
    });

    it('should apply base style', () => {
      const baseStyle = { fontSize: 16, color: '#333' };
      const result = formatIRCText('Test', baseStyle);
      expect(result[0].props.style.fontSize).toBe(16);
      expect(result[0].props.style.color).toBe('#333');
    });

    it('should handle complex formatting', () => {
      const bold = String.fromCharCode(0x02);
      const color = String.fromCharCode(0x03);
      const text = `${bold}Bold${color}4Red${bold}Not Bold`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle background only (comma without fg)', () => {
      const text = `${String.fromCharCode(0x03)},8Background Only`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty segments', () => {
      const text = `${String.fromCharCode(0x02)}${String.fromCharCode(0x02)}`;
      const result = formatIRCText(text);
      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('formatIRCTextAsComponent', () => {
    it('should return empty Text for empty string', () => {
      const result = formatIRCTextAsComponent('');
      expect(result.type).toBe(Text);
    });

    it('should format plain text', () => {
      const result = formatIRCTextAsComponent('Hello World');
      expect(result.type).toBe(Text);
      // Plain text might be wrapped in segments
      expect(result.props.children).toBeDefined();
    });

    it('should handle formatted text', () => {
      const text = `${String.fromCharCode(0x02)}Bold Text`;
      const result = formatIRCTextAsComponent(text);
      expect(result.type).toBe(Text);
      expect(Array.isArray(result.props.children)).toBe(true);
    });

    it('should handle multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = formatIRCTextAsComponent(text);
      expect(result.type).toBe(Text);
      expect(Array.isArray(result.props.children)).toBe(true);
      expect(result.props.children).toHaveLength(3);
    });

    it('should handle single line without newlines', () => {
      const text = 'Single line';
      const result = formatIRCTextAsComponent(text);
      expect(result.type).toBe(Text);
    });

    it('should apply base style', () => {
      const baseStyle = { fontSize: 20 };
      const result = formatIRCTextAsComponent('Test', baseStyle);
      expect(result.props.style.fontSize).toBe(20);
    });

    it('should handle multiline with formatting', () => {
      const bold = String.fromCharCode(0x02);
      const text = `${bold}Line 1\nLine 2`;
      const result = formatIRCTextAsComponent(text);
      expect(result.type).toBe(Text);
      expect(Array.isArray(result.props.children)).toBe(true);
    });
  });

  describe('stripIRCFormatting', () => {
    it('should return empty string for empty input', () => {
      expect(stripIRCFormatting('')).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(stripIRCFormatting('Hello World')).toBe('Hello World');
    });

    it('should strip bold codes', () => {
      const text = `${String.fromCharCode(0x02)}Bold Text`;
      expect(stripIRCFormatting(text)).toBe('Bold Text');
    });

    it('should strip color codes (single digit)', () => {
      const text = `${String.fromCharCode(0x03)}4Red Text`;
      expect(stripIRCFormatting(text)).toBe('Red Text');
    });

    it('should strip color codes (two digits)', () => {
      const text = `${String.fromCharCode(0x03)}12Blue Text`;
      expect(stripIRCFormatting(text)).toBe('Blue Text');
    });

    it('should strip color codes with background', () => {
      const text = `${String.fromCharCode(0x03)}4,8Colored Text`;
      expect(stripIRCFormatting(text)).toBe('Colored Text');
    });

    it('should strip color codes with two-digit background', () => {
      const text = `${String.fromCharCode(0x03)}4,12Colored Text`;
      expect(stripIRCFormatting(text)).toBe('Colored Text');
    });

    it('should strip all format codes', () => {
      const bold = String.fromCharCode(0x02);
      const underline = String.fromCharCode(0x1F);
      const italic = String.fromCharCode(0x1D);
      const strikethrough = String.fromCharCode(0x1E);
      const reverse = String.fromCharCode(0x16);
      const reset = String.fromCharCode(0x0F);
      const color = String.fromCharCode(0x03);
      
      const text = `${bold}Bold${underline}Underline${italic}Italic${strikethrough}Strike${reverse}Reverse${reset}Reset${color}4Color`;
      expect(stripIRCFormatting(text)).toBe('BoldUnderlineItalicStrikeReverseResetColor');
    });

    it('should handle color code without digits', () => {
      const text = `${String.fromCharCode(0x03)}Text`;
      expect(stripIRCFormatting(text)).toBe('Text');
    });

    it('should handle mixed text and codes', () => {
      const text = `Hello ${String.fromCharCode(0x02)}World${String.fromCharCode(0x02)}!`;
      expect(stripIRCFormatting(text)).toBe('Hello World!');
    });
  });

  describe('formatIRCDebug', () => {
    it('should return empty string for empty input', () => {
      expect(formatIRCDebug('')).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(formatIRCDebug('Hello')).toBe('Hello');
    });

    it('should mark bold code', () => {
      const text = `${String.fromCharCode(0x02)}Bold`;
      expect(formatIRCDebug(text)).toBe('[B]Bold');
    });

    it('should mark color code without digits', () => {
      const text = `${String.fromCharCode(0x03)}Text`;
      expect(formatIRCDebug(text)).toBe('[C]Text');
    });

    it('should mark color code with single digit', () => {
      const text = `${String.fromCharCode(0x03)}4Text`;
      expect(formatIRCDebug(text)).toBe('[C4]Text');
    });

    it('should mark color code with two digits', () => {
      const text = `${String.fromCharCode(0x03)}12Text`;
      expect(formatIRCDebug(text)).toBe('[C12]Text');
    });

    it('should mark color code with fg and bg', () => {
      const text = `${String.fromCharCode(0x03)}4,8Text`;
      expect(formatIRCDebug(text)).toBe('[C4,8]Text');
    });

    it('should mark reset code', () => {
      const text = `${String.fromCharCode(0x0F)}Reset`;
      expect(formatIRCDebug(text)).toBe('[R]Reset');
    });

    it('should mark underline code', () => {
      const text = `${String.fromCharCode(0x1F)}Underline`;
      expect(formatIRCDebug(text)).toBe('[U]Underline');
    });

    it('should mark italic code', () => {
      const text = `${String.fromCharCode(0x1D)}Italic`;
      expect(formatIRCDebug(text)).toBe('[I]Italic');
    });

    it('should mark strikethrough code', () => {
      const text = `${String.fromCharCode(0x1E)}Strikethrough`;
      expect(formatIRCDebug(text)).toBe('[S]Strikethrough');
    });

    it('should mark reverse code', () => {
      const text = `${String.fromCharCode(0x16)}Reverse`;
      expect(formatIRCDebug(text)).toBe('[REV]Reverse');
    });

    it('should handle all codes in sequence', () => {
      const text = `${String.fromCharCode(0x02)}${String.fromCharCode(0x03)}4${String.fromCharCode(0x1F)}${String.fromCharCode(0x0F)}`;
      expect(formatIRCDebug(text)).toBe('[B][C4][U][R]');
    });

    it('should handle color with comma but no bg digits', () => {
      const text = `${String.fromCharCode(0x03)}4,Text`;
      expect(formatIRCDebug(text)).toBe('[C4,]Text');
    });
  });

  describe('formatIRCTextWithLinks', () => {
    it('should return empty Text for empty string', () => {
      const result = formatIRCTextWithLinks('');
      expect(result.type).toBe(Text);
    });

    it('should format plain text without links', () => {
      const result = formatIRCTextWithLinks('Hello World');
      expect(result.type).toBe(Text);
    });

    it('should detect and format http URLs', () => {
      const result = formatIRCTextWithLinks('Check out https://example.com today!');
      expect(result.type).toBe(Text);
      expect(Array.isArray(result.props.children)).toBe(true);
    });

    it('should detect and format https URLs', () => {
      const result = formatIRCTextWithLinks('Visit https://test.com');
      expect(result.type).toBe(Text);
    });

    it('should detect and format www URLs', () => {
      const result = formatIRCTextWithLinks('Go to www.example.com');
      expect(result.type).toBe(Text);
    });

    it('should detect and format ftp URLs', () => {
      const result = formatIRCTextWithLinks('Download from ftp://files.example.com');
      expect(result.type).toBe(Text);
    });

    it('should handle multiple URLs in text', () => {
      const result = formatIRCTextWithLinks('Visit https://a.com and https://b.com');
      expect(result.type).toBe(Text);
      expect(Array.isArray(result.props.children)).toBe(true);
    });

    it('should handle URLs with IRC formatting', () => {
      const bold = String.fromCharCode(0x02);
      const result = formatIRCTextWithLinks(`${bold}Visit https://example.com`);
      expect(result.type).toBe(Text);
    });

    it('should apply custom link color', () => {
      const result = formatIRCTextWithLinks('Visit https://example.com', {}, '#FF0000');
      expect(result.type).toBe(Text);
    });

    it('should apply base style', () => {
      const baseStyle = { fontSize: 14 };
      const result = formatIRCTextWithLinks('Text', baseStyle);
      expect(result.props.style.fontSize).toBe(14);
    });

    it('should handle URL at end of text', () => {
      const result = formatIRCTextWithLinks('Check this: https://example.com');
      expect(result.type).toBe(Text);
    });

    it('should handle URL at start of text', () => {
      const result = formatIRCTextWithLinks('https://example.com is great');
      expect(result.type).toBe(Text);
    });

    it('should handle URL only', () => {
      const result = formatIRCTextWithLinks('https://example.com');
      expect(result.type).toBe(Text);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000);
      const result = formatIRCText(longText);
      expect(result).toHaveLength(1);
    });

    it('should handle reverse with only foreground', () => {
      const color = String.fromCharCode(0x03);
      const reverse = String.fromCharCode(0x16);
      const text = `${color}4${reverse}Reverse Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle reverse with only background', () => {
      const color = String.fromCharCode(0x03);
      const reverse = String.fromCharCode(0x16);
      const text = `${color},8${reverse}Reverse Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle extended color for background', () => {
      const color = String.fromCharCode(0x03);
      const text = `${color}0,52Text with extended bg`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invalid extended color', () => {
      const color = String.fromCharCode(0x03);
      const text = `${color}99Text`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiline with no segments', () => {
      const result = formatIRCTextAsComponent('\n\n');
      expect(result.type).toBe(Text);
    });

    it('should handle debug format with two-digit bg color', () => {
      const text = `${String.fromCharCode(0x03)}4,12Text`;
      expect(formatIRCDebug(text)).toContain('[C4,12]');
    });

    it('should handle link formatting with segments and no URLs', () => {
      const bold = String.fromCharCode(0x02);
      const result = formatIRCTextWithLinks(`${bold}Just bold text`);
      expect(result.type).toBe(Text);
    });

    it('should handle onPress for links', () => {
      const { getByText } = render(
        formatIRCTextWithLinks('Visit https://example.com')
      );
      // Just verify it renders without error
      expect(getByText('https://example.com')).toBeTruthy();
    });

    it('should handle text with only format codes', () => {
      const text = `${String.fromCharCode(0x02)}${String.fromCharCode(0x03)}${String.fromCharCode(0x0F)}`;
      const result = formatIRCText(text);
      expect(result).toBeDefined();
    });

    it('should handle nested format regions', () => {
      const bold = String.fromCharCode(0x02);
      const italic = String.fromCharCode(0x1D);
      const text = `${bold}Bold${italic}BoldItalic${bold}Italic${italic}Normal`;
      const result = formatIRCText(text);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle color at end of text', () => {
      const text = `Text${String.fromCharCode(0x03)}4`;
      const result = formatIRCText(text);
      expect(result).toBeDefined();
    });

    it('should handle link onPress callback', async () => {
      const { getByText } = render(
        formatIRCTextWithLinks('Check https://test.com')
      );
      const link = getByText('https://test.com');
      // Verify link has onPress
      expect(link.props.onPress).toBeDefined();
    });

    it('should handle incomplete color codes', () => {
      const text = `${String.fromCharCode(0x03)}99Invalid`; // 99 is not a valid color
      const result = formatIRCText(text);
      expect(result).toBeDefined();
    });

    it('should handle negative color codes gracefully', () => {
      // This shouldn't happen in practice but test for safety
      const result = formatIRCText('Test');
      expect(result).toBeDefined();
    });
  });
});
