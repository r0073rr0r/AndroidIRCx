/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as moduleUnderTest from '../../../../src/services/irc/sendCommands/EncryptionCommands';

describe('EncryptionCommands', () => {
  it('loads module exports', () => {
    expect(moduleUnderTest).toBeDefined();
    expect(Object.keys(moduleUnderTest).length).toBeGreaterThan(0);
  });
});


