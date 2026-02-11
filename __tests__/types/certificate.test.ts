/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IRCService, FingerprintFormat } from '../../src/types/certificate';

describe('types/certificate', () => {
  it('should expose expected IRC service enum values', () => {
    expect(IRCService.NICKSERV).toBe('NickServ');
    expect(IRCService.CERTFP).toBe('CertFP');
    expect(IRCService.HOSTSERV).toBe('HostServ');
  });

  it('should expose expected fingerprint format enum values', () => {
    expect(FingerprintFormat.COLON_SEPARATED_UPPER).toBe('colon-upper');
    expect(FingerprintFormat.COLON_SEPARATED_LOWER).toBe('colon-lower');
    expect(FingerprintFormat.NO_COLON_UPPER).toBe('no-colon-upper');
    expect(FingerprintFormat.NO_COLON_LOWER).toBe('no-colon-lower');
  });
});

