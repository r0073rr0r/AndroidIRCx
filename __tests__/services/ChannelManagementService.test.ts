/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelManagementService, channelManagementService } from '../../src/services/ChannelManagementService';

describe('ChannelManagementService', () => {
  it('exports class and singleton instance', () => {
    expect(ChannelManagementService).toBeDefined();
    expect(channelManagementService).toBeDefined();
  });
});
