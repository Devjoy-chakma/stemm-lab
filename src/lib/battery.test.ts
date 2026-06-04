// Unit tests for the useBattery hook — verifies it reads the initial
// battery state from expo-battery, reacts to listener events, and

import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('expo-battery', () => {
  const BatteryState = { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3 };
  return {
    BatteryState,
    getBatteryLevelAsync: jest.fn(),
    getBatteryStateAsync: jest.fn(),
    addBatteryLevelListener: jest.fn(),
    addBatteryStateListener: jest.fn(),
  };
});

import * as Battery from 'expo-battery';

import { useBattery } from './battery';

describe('useBattery', () => {
  const mockGetLevel = Battery.getBatteryLevelAsync as jest.Mock;
  const mockGetState = Battery.getBatteryStateAsync as jest.Mock;
  const mockAddLevel = Battery.addBatteryLevelListener as jest.Mock;
  const mockAddState = Battery.addBatteryStateListener as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddLevel.mockReturnValue({ remove: jest.fn() });
    mockAddState.mockReturnValue({ remove: jest.fn() });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('should return expected data — initial level and charging state', async () => {
    mockGetLevel.mockResolvedValueOnce(0.42);
    mockGetState.mockResolvedValueOnce(Battery.BatteryState.CHARGING);

    const { result } = renderHook(() => useBattery());

    await waitFor(() => {
      expect(result.current.level).toBeCloseTo(0.42);
      expect(result.current.charging).toBe(true);
    });
  });

  it('should handle missing input — defaults before async resolves', () => {
    mockGetLevel.mockReturnValue(new Promise(() => undefined));
    mockGetState.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useBattery());

    expect(result.current.level).toBe(1);
    expect(result.current.charging).toBe(false);
  });

  it('should handle error response — falls back when API rejects', async () => {
    mockGetLevel.mockRejectedValueOnce(new Error('no battery api'));
    mockGetState.mockRejectedValueOnce(new Error('no battery api'));

    const { result } = renderHook(() => useBattery());

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalled();
    });
    // Hook stays mounted with safe defaults.
    expect(result.current.level).toBe(1);
    expect(result.current.charging).toBe(false);
  });

  it('should call the correct Battery functions — subscribes to listeners', async () => {
    mockGetLevel.mockResolvedValueOnce(0.9);
    mockGetState.mockResolvedValueOnce(Battery.BatteryState.UNPLUGGED);

    let levelHandler: ((e: { batteryLevel: number }) => void) | undefined;
    mockAddLevel.mockImplementationOnce((cb) => {
      levelHandler = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useBattery());

    await waitFor(() => expect(result.current.level).toBeCloseTo(0.9));
    expect(mockAddLevel).toHaveBeenCalledTimes(1);
    expect(mockAddState).toHaveBeenCalledTimes(1);

    act(() => levelHandler?.({ batteryLevel: 0.25 }));

    await waitFor(() => expect(result.current.level).toBeCloseTo(0.25));
  });
});
