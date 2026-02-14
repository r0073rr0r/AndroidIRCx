/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/NetworksListScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).NetworksListScreen;

describe('NetworksListScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});