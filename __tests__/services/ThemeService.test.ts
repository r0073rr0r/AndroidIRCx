/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { themeService } from '../../src/services/ThemeService';

describe('ThemeService', () => {
  it('exports singleton', () => {
    expect(themeService).toBeDefined();
    expect(typeof themeService.getCurrentTheme).toBe('function');
  });
});
