/**
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Tests for useServerTabNameSync hook
 */

import { renderHook } from '@testing-library/react-hooks';
import { useServerTabNameSync } from '../../src/hooks/useServerTabNameSync';

describe('useServerTabNameSync', () => {
  it('should not throw when networkName is empty', () => {
    expect(() => {
      renderHook(() => useServerTabNameSync({ networkName: '' }));
    }).not.toThrow();
  });

  it('should not throw when networkName is "Not connected"', () => {
    expect(() => {
      renderHook(() => useServerTabNameSync({ networkName: 'Not connected' }));
    }).not.toThrow();
  });

  it('should not throw with valid network name', () => {
    expect(() => {
      renderHook(() => useServerTabNameSync({ networkName: 'freenode' }));
    }).not.toThrow();
  });

  it('should handle network name changes', () => {
    const { rerender } = renderHook(
      ({ networkName }) => useServerTabNameSync({ networkName }),
      { initialProps: { networkName: 'freenode' } }
    );

    // Should not throw on rerender with same value
    expect(() => {
      rerender({ networkName: 'freenode' });
    }).not.toThrow();

    // Should not throw on rerender with different value
    expect(() => {
      rerender({ networkName: 'dalnet' });
    }).not.toThrow();
  });

  it('should handle transition from empty to valid network', () => {
    const { rerender } = renderHook(
      ({ networkName }) => useServerTabNameSync({ networkName }),
      { initialProps: { networkName: '' } }
    );

    expect(() => {
      rerender({ networkName: 'freenode' });
    }).not.toThrow();
  });

  it('should handle transition from valid to empty network', () => {
    const { rerender } = renderHook(
      ({ networkName }) => useServerTabNameSync({ networkName }),
      { initialProps: { networkName: 'freenode' } }
    );

    expect(() => {
      rerender({ networkName: '' });
    }).not.toThrow();
  });
});
