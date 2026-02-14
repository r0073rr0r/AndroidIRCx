/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  inAppPurchaseService,
  PRODUCT_CATALOG,
  PRODUCT_PRO_UNLIMITED,
  PRODUCT_REMOVE_ADS,
  PRODUCT_SUPPORTER_PRO,
} from '../../src/services/InAppPurchaseService';

describe('InAppPurchaseService', () => {
  it('exports singleton and product constants', () => {
    expect(inAppPurchaseService).toBeDefined();
    expect(PRODUCT_REMOVE_ADS).toBeDefined();
    expect(PRODUCT_PRO_UNLIMITED).toBeDefined();
    expect(PRODUCT_SUPPORTER_PRO).toBeDefined();
    expect(PRODUCT_CATALOG[PRODUCT_REMOVE_ADS]).toBeDefined();
  });
});
