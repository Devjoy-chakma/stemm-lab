// Unit tests for the haptic wrapper — verifies it dispatches to the
// correct expo-haptics function and swallows failures.

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'L', Medium: 'M', Heavy: 'H' },
  NotificationFeedbackType: { Success: 'S', Error: 'E', Warning: 'W' },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

import * as Haptics from 'expo-haptics';

import { haptic } from './haptics';

describe('haptic', () => {
  const mockImpact = Haptics.impactAsync as jest.Mock;
  const mockNotif = Haptics.notificationAsync as jest.Mock;
  const mockSelect = Haptics.selectionAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockImpact.mockResolvedValue(undefined);
    mockNotif.mockResolvedValue(undefined);
    mockSelect.mockResolvedValue(undefined);
  });

  it('should return expected data — fire-and-forget undefined for each method', () => {
    expect(haptic.light()).toBeUndefined();
    expect(haptic.medium()).toBeUndefined();
    expect(haptic.heavy()).toBeUndefined();
    expect(haptic.success()).toBeUndefined();
    expect(haptic.error()).toBeUndefined();
    expect(haptic.warning()).toBeUndefined();
    expect(haptic.selection()).toBeUndefined();
  });

  it('should handle missing input — selection has no args yet still dispatches', () => {
    haptic.selection();
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('should handle error response — rejected promise is swallowed', async () => {
    mockImpact.mockRejectedValueOnce(new Error('no taptic engine'));

    expect(() => haptic.heavy()).not.toThrow();
    // Let the microtask queue drain so the catch handler runs.
    await Promise.resolve();
    await Promise.resolve();
  });

  it('should call the correct Haptics function — each helper picks its style', () => {
    haptic.light();
    haptic.medium();
    haptic.heavy();
    haptic.success();
    haptic.error();
    haptic.warning();

    expect(mockImpact).toHaveBeenNthCalledWith(1, 'L');
    expect(mockImpact).toHaveBeenNthCalledWith(2, 'M');
    expect(mockImpact).toHaveBeenNthCalledWith(3, 'H');
    expect(mockNotif).toHaveBeenNthCalledWith(1, 'S');
    expect(mockNotif).toHaveBeenNthCalledWith(2, 'E');
    expect(mockNotif).toHaveBeenNthCalledWith(3, 'W');
  });
});
