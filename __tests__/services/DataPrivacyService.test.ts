/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { dataPrivacyService } from '../../src/services/DataPrivacyService';

describe('DataPrivacyService', () => {
  it('exports singleton', () => {
    expect(dataPrivacyService).toBeDefined();
    expect(typeof dataPrivacyService).toBe('object');
  });
});
