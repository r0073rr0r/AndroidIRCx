/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { awayService } from '../../src/services/AwayService';

describe('AwayService', () => {
  it('exports singleton', () => {
    expect(awayService).toBeDefined();
    expect(typeof awayService.setAway).toBe('function');
  });
});
