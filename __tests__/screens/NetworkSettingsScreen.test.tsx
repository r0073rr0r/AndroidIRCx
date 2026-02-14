/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/NetworkSettingsScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).NetworkSettingsScreen;

describe('NetworkSettingsScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});