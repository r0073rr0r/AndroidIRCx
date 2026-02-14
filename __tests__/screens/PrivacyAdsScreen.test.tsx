/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as ScreenModule from '../../src/screens/PrivacyAdsScreen';

const Screen = (ScreenModule as any).default ?? (ScreenModule as any).PrivacyAdsScreen;

describe('PrivacyAdsScreen', () => {
  it('exports screen component', () => {
    expect(Screen).toBeDefined();
  });
});