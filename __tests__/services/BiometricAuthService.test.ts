/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for BiometricAuthService - Wave 7
 */

describe('BiometricAuthService', () => {
  // The service uses dynamic require with try-catch
  // Testing is limited without the actual keychain module

  it('should have service exported', () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    expect(biometricAuthService).toBeDefined();
  });

  it('should have required methods', () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    expect(typeof biometricAuthService.isAvailable).toBe('function');
    expect(typeof biometricAuthService.getBiometryType).toBe('function');
    expect(typeof biometricAuthService.enableLock).toBe('function');
    expect(typeof biometricAuthService.disableLock).toBe('function');
    expect(typeof biometricAuthService.authenticate).toBe('function');
  });

  it('should check availability', () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    // Returns false when keychain is not available
    const result = biometricAuthService.isAvailable();
    expect(typeof result).toBe('boolean');
  });

  it('should return null for biometry type when unavailable', async () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    const result = await biometricAuthService.getBiometryType();
    expect(result).toBeNull();
  });

  it('should have enableLock method that returns a boolean', async () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    const result = await biometricAuthService.enableLock();
    expect(typeof result).toBe('boolean');
  });

  it('should not throw when disabling lock', async () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    await expect(biometricAuthService.disableLock()).resolves.toBeUndefined();
  });

  it('should return object from authenticate', async () => {
    const { biometricAuthService } = require('../../src/services/BiometricAuthService');
    const result = await biometricAuthService.authenticate('Unlock');
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });
});
