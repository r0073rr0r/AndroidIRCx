/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { subscriptionService } from '../../src/services/SubscriptionService';

describe('SubscriptionService', () => {
  it('exports singleton', () => {
    expect(subscriptionService).toBeDefined();
    expect(typeof subscriptionService.initialize).toBe('function');
  });
});
