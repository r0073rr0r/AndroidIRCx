/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as moduleUnderTest from '../../../src/screens/help/HelpTroubleshootingScreen';

describe('HelpTroubleshootingScreen', () => {
  it('loads help screen module', () => {
    expect(moduleUnderTest).toBeDefined();
    expect(Object.keys(moduleUnderTest).length).toBeGreaterThan(0);
  });
});

