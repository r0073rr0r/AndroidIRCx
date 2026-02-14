/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/FirstRunSetupScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).FirstRunSetupScreen;

describe('FirstRunSetupScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});