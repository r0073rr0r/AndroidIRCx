/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

describe('irc/numerics/index', () => {
  it('currently throws on duplicate re-export names', () => {
    expect(() => require('../../../../src/services/irc/numerics/index')).toThrow();
  });
});


