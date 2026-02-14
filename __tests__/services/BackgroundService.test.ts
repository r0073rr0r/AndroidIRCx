/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { backgroundService } from '../../src/services/BackgroundService';

describe('BackgroundService', () => {
  it('exports singleton', () => {
    expect(backgroundService).toBeDefined();
    expect(typeof backgroundService.initialize).toBe('function');
  });
});
