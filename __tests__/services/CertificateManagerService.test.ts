/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { certificateManager } from '../../src/services/CertificateManagerService';

describe('CertificateManagerService', () => {
  it('exports certificate manager singleton', () => {
    expect(certificateManager).toBeDefined();
    expect(typeof certificateManager.extractFingerprintFromPem).toBe('function');
  });
});
