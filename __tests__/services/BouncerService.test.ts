/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BouncerService, bouncerService } from '../../src/services/BouncerService';

describe('BouncerService', () => {
  it('exports class and singleton instance', () => {
    expect(BouncerService).toBeDefined();
    expect(bouncerService).toBeDefined();
  });
});
