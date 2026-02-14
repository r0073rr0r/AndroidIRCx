/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { killSwitchService } from '../../src/services/KillSwitchService';

describe('KillSwitchService', () => {
  it('exports singleton', () => {
    expect(killSwitchService).toBeDefined();
    expect(typeof killSwitchService).toBe('object');
  });
});
