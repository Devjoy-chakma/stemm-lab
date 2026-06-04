// Unit tests for getCurrentLocationOrNull — verifies permission gating
// and graceful degradation when the device refuses or errors.

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';

import { getCurrentLocationOrNull } from './location';

describe('getCurrentLocationOrNull', () => {
  const mockPerm = Location.requestForegroundPermissionsAsync as jest.Mock;
  const mockPos = Location.getCurrentPositionAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('should return expected data — lat/lng when permission is granted', async () => {
    mockPerm.mockResolvedValueOnce({ status: 'granted' });
    mockPos.mockResolvedValueOnce({
      coords: { latitude: -33.86, longitude: 151.21 },
    });

    const result = await getCurrentLocationOrNull();

    expect(result).toEqual({ lat: -33.86, lng: 151.21 });
  });

  it('should handle missing input — returns null when permission is denied', async () => {
    mockPerm.mockResolvedValueOnce({ status: 'denied' });

    const result = await getCurrentLocationOrNull();

    expect(result).toBeNull();
    expect(mockPos).not.toHaveBeenCalled();
  });

  it('should handle error response — returns null and warns when location throws', async () => {
    mockPerm.mockResolvedValueOnce({ status: 'granted' });
    mockPos.mockRejectedValueOnce(new Error('no gps'));

    const result = await getCurrentLocationOrNull();

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('should call the correct Location function — balanced accuracy', async () => {
    mockPerm.mockResolvedValueOnce({ status: 'granted' });
    mockPos.mockResolvedValueOnce({ coords: { latitude: 0, longitude: 0 } });

    await getCurrentLocationOrNull();

    expect(mockPos).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });
});
