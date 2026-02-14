/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { protectionService } from '../../src/services/ProtectionService';

describe('ProtectionService', () => {
  it('exports singleton', () => {
    expect(protectionService).toBeDefined();
    expect(typeof protectionService).toBe('object');
  });
});
