/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { services } from '../../src/core/ServiceContainer';

describe('ServiceContainer', () => {
  it('exports services registry', () => {
    expect(services).toBeDefined();
    expect(services.irc).toBeDefined();
    expect(services.settings).toBeDefined();
    expect(services.command).toBeDefined();
    expect(services.tab).toBeDefined();
  });
});
