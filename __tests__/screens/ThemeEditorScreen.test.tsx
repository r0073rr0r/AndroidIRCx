/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/ThemeEditorScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).ThemeEditorScreen;

describe('ThemeEditorScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});