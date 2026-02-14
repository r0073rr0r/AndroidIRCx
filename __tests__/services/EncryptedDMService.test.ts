/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { encryptedDMService } from '../../src/services/EncryptedDMService';

describe('EncryptedDMService', () => {
  it('exports singleton', () => {
    expect(encryptedDMService).toBeDefined();
    expect(typeof encryptedDMService).toBe('object');
  });
});
