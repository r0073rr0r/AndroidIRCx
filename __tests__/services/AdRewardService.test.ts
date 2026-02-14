/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { adRewardService } from '../../src/services/AdRewardService';

describe('AdRewardService', () => {
  it('exports singleton', () => {
    expect(adRewardService).toBeDefined();
    expect(typeof adRewardService.initialize).toBe('function');
  });
});
