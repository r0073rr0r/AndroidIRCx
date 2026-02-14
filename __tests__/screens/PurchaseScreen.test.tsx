/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/PurchaseScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).PurchaseScreen;

describe('PurchaseScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});