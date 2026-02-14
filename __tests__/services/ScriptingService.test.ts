/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { scriptingService } from '../../src/services/ScriptingService';

describe('ScriptingService', () => {
  it('exports singleton', () => {
    expect(scriptingService).toBeDefined();
    expect(typeof scriptingService.initialize).toBe('function');
  });
});
