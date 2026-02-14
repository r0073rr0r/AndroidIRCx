/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectionQualityService, connectionQualityService } from '../../src/services/ConnectionQualityService';

describe('ConnectionQualityService', () => {
  it('exports class and singleton instance', () => {
    expect(ConnectionQualityService).toBeDefined();
    expect(connectionQualityService).toBeDefined();
  });
});
