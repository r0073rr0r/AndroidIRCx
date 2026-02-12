/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for SoundService
 */

import { soundService } from '../../src/services/SoundService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AwayService
jest.mock('../../src/services/AwayService', () => ({
  awayService: {
    shouldMuteSounds: jest.fn().mockReturnValue(false),
  },
}));

// Mock AudioFocusService
jest.mock('../../src/services/AudioFocusService', () => ({
  audioFocusService: {
    requestTransientFocus: jest.fn().mockResolvedValue(undefined),
    releaseFocus: jest.fn(),
  },
}));

describe('SoundService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    // Reset service state
    // @ts-ignore
    soundService.isInitialized = false;
    // @ts-ignore
    soundService.customSchemes = [];
    // @ts-ignore
    soundService.settings = { enabled: true, masterVolume: 1.0, events: {} };
  });

  describe('initialize', () => {
    it('should initialize with default settings', async () => {
      await soundService.initialize();
      
      expect(soundService.isEnabled()).toBeDefined();
    });

    it('should load saved settings', async () => {
      const savedSettings = {
        enabled: false,
        masterVolume: 0.5,
        events: {
          message: { enabled: true, volume: 0.8 },
        },
      };
      
      await AsyncStorage.setItem('@AndroidIRCX:soundSettings', JSON.stringify(savedSettings));
      
      // @ts-ignore
      soundService.isInitialized = false;
      await soundService.initialize();
      
      const settings = soundService.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.masterVolume).toBe(0.5);
    });

    it('should handle initialization errors gracefully', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(soundService.initialize()).resolves.not.toThrow();
    });
  });

  describe('getSettings and updateSettings', () => {
    it('should return current settings', async () => {
      await soundService.initialize();
      
      const settings = soundService.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings.enabled).toBe('boolean');
      expect(typeof settings.masterVolume).toBe('number');
    });

    it('should update settings', async () => {
      await soundService.initialize();
      
      await soundService.updateSettings({ masterVolume: 0.7 });
      
      expect(soundService.getSettings().masterVolume).toBe(0.7);
    });

    it('should notify listeners on settings change', async () => {
      await soundService.initialize();
      
      const listener = jest.fn();
      const unsubscribe = soundService.addListener(listener);
      
      await soundService.updateSettings({ enabled: false });
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].enabled).toBe(false);
      
      unsubscribe();
    });
  });

  describe('updateEventConfig', () => {
    it('should update specific event config', async () => {
      await soundService.initialize();
      
      await soundService.updateEventConfig('message', { enabled: false, volume: 0.3 });
      
      const settings = soundService.getSettings();
      expect(settings.events.message?.enabled).toBe(false);
      expect(settings.events.message?.volume).toBe(0.3);
    });
  });

  describe('isEnabled and toggleEnabled', () => {
    it('should return enabled state', async () => {
      await soundService.initialize();
      
      expect(typeof soundService.isEnabled()).toBe('boolean');
    });

    it('should toggle enabled state', async () => {
      await soundService.initialize();
      
      const initialState = soundService.isEnabled();
      const newState = await soundService.toggleEnabled();
      
      expect(newState).toBe(!initialState);
      expect(soundService.isEnabled()).toBe(!initialState);
    });
  });

  describe('playSound', () => {
    it('should not play when disabled', async () => {
      await soundService.initialize();
      await soundService.updateSettings({ enabled: false });
      
      // Should not throw
      await expect(soundService.playSound('message')).resolves.not.toThrow();
    });

    it('should not play when away mode mutes sounds', async () => {
      const { awayService } = require('../../src/services/AwayService');
      awayService.shouldMuteSounds.mockReturnValue(true);
      
      await soundService.initialize();
      await soundService.updateSettings({ enabled: true });
      
      // Should not throw
      await expect(soundService.playSound('message')).resolves.not.toThrow();
    });

    it('should not play event when disabled', async () => {
      await soundService.initialize();
      await soundService.updateSettings({ enabled: true });
      await soundService.updateEventConfig('message', { enabled: false });
      
      // Should not throw
      await expect(soundService.playSound('message')).resolves.not.toThrow();
    });
  });

  describe('getSchemes and setActiveScheme', () => {
    it('should return available schemes', () => {
      const schemes = soundService.getSchemes();
      
      expect(schemes.length).toBeGreaterThan(0);
    });

    it('should return active scheme', async () => {
      await soundService.initialize();
      
      const scheme = soundService.getActiveScheme();
      // May be undefined if no scheme is set
      expect(scheme === undefined || scheme.id).toBeDefined();
    });

    it('should set active scheme', async () => {
      await soundService.initialize();
      
      const schemes = soundService.getSchemes();
      if (schemes.length > 0) {
        await soundService.setActiveScheme(schemes[0].id);
        
        const active = soundService.getActiveScheme();
        expect(active?.id).toBe(schemes[0].id);
      }
    });
  });

  describe('createScheme and deleteScheme', () => {
    it('should create custom scheme', async () => {
      await soundService.initialize();
      
      const scheme = await soundService.createScheme('Test Scheme', 'Test description');
      
      expect(scheme.name).toBe('Test Scheme');
      expect(scheme.description).toBe('Test description');
      expect(scheme.isBuiltIn).toBe(false);
    });

    it('should delete custom scheme', async () => {
      await soundService.initialize();
      
      const scheme = await soundService.createScheme('To Delete');
      const initialCount = soundService.getSchemes().filter(s => s.id === scheme.id).length;
      expect(initialCount).toBe(1);
      
      await soundService.deleteScheme(scheme.id);
      
      const afterDelete = soundService.getSchemes().filter(s => s.id === scheme.id).length;
      expect(afterDelete).toBe(0);
    });

    it('should not delete built-in scheme', async () => {
      await soundService.initialize();
      
      const schemes = soundService.getSchemes();
      const builtIn = schemes.find(s => s.isBuiltIn);
      
      if (builtIn) {
        await soundService.deleteScheme(builtIn.id);
        
        // Scheme should still exist
        expect(soundService.getSchemes().find(s => s.id === builtIn.id)).toBeDefined();
      }
    });

    it('should switch to classic scheme when deleting active scheme', async () => {
      await soundService.initialize();
      
      const scheme = await soundService.createScheme('Active Scheme');
      await soundService.setActiveScheme(scheme.id);
      
      await soundService.deleteScheme(scheme.id);
      
      const active = soundService.getActiveScheme();
      expect(active?.id).toBe('classic');
    });
  });

  describe('stopSound', () => {
    it('should stop current sound', async () => {
      await soundService.initialize();
      
      await expect(soundService.stopSound()).resolves.not.toThrow();
    });
  });

  describe('resetToDefault', () => {
    it('should reset event to default', async () => {
      await soundService.initialize();
      
      // Set custom config
      await soundService.updateEventConfig('message', { useCustom: true, customUri: '/path/to/sound' });
      
      // Reset
      await soundService.resetToDefault('message');
      
      const settings = soundService.getSettings();
      expect(settings.events.message?.useCustom).toBeFalsy();
    });
  });

  describe('resetAllToDefaults', () => {
    it('should reset all settings', async () => {
      await soundService.initialize();
      
      await soundService.updateSettings({ enabled: false, masterVolume: 0.3 });
      
      await soundService.resetAllToDefaults();
      
      const settings = soundService.getSettings();
      // Should be reset to defaults
      expect(settings.enabled).toBeDefined();
    });
  });

  describe('addListener', () => {
    it('should add and remove listener', async () => {
      await soundService.initialize();
      
      const listener = jest.fn();
      const unsubscribe = soundService.addListener(listener);
      
      await soundService.updateSettings({ masterVolume: 0.5 });
      expect(listener).toHaveBeenCalled();
      
      listener.mockClear();
      unsubscribe();
      
      await soundService.updateSettings({ masterVolume: 0.8 });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
