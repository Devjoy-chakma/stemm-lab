// Unit tests for notifyActivityScored + ensureNotificationPermission —
// verifies permission gating and the scheduled notification payload.

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

import * as Notifications from 'expo-notifications';

const loadModule = () => {
  let mod!: typeof import('./notifications');
  jest.isolateModules(() => {
    mod = require('./notifications');
  });
  return mod;
};

describe('notifications', () => {
  const mockReq = Notifications.requestPermissionsAsync as jest.Mock;
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockSched = Notifications.scheduleNotificationAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('should return expected data — schedules notification on granted permission', async () => {
    const { notifyActivityScored } = loadModule();
    mockReq.mockResolvedValueOnce({ status: 'granted' });
    mockSched.mockResolvedValueOnce('notif-id');

    await notifyActivityScored('Alpha', 'Parachute Drop', 42);

    expect(mockSched).toHaveBeenCalledTimes(1);
  });

  it('should handle missing input — no notification when permission is denied', async () => {
    const { notifyActivityScored } = loadModule();
    mockReq.mockResolvedValueOnce({ status: 'denied' });

    await notifyActivityScored('Alpha', 'Parachute Drop', 1);

    expect(mockSched).not.toHaveBeenCalled();
  });

  it('should handle error response — swallows scheduling failure', async () => {
    const { notifyActivityScored } = loadModule();
    mockReq.mockResolvedValueOnce({ status: 'granted' });
    mockSched.mockRejectedValueOnce(new Error('blocked'));

    await expect(
      notifyActivityScored('Alpha', 'Parachute', 5)
    ).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('should call the correct Notifications function — payload includes team, activity, score', async () => {
    const { notifyActivityScored } = loadModule();
    mockReq.mockResolvedValueOnce({ status: 'granted' });
    mockSched.mockResolvedValueOnce('notif-id');

    await notifyActivityScored('Bravo', 'Sound Pollution', 73);

    expect(mockSched).toHaveBeenCalledWith({
      content: {
        title: expect.any(String),
        body: expect.stringContaining('Bravo'),
      },
      trigger: null,
    });
    const arg = mockSched.mock.calls[0][0];
    expect(arg.content.body).toContain('Sound Pollution');
    expect(arg.content.body).toContain('73');
  });

  it('reuses cached permission state on subsequent calls', async () => {
    const { ensureNotificationPermission } = loadModule();
    mockReq.mockResolvedValueOnce({ status: 'granted' });
    mockGet.mockResolvedValueOnce({ status: 'granted' });

    await ensureNotificationPermission();
    await ensureNotificationPermission();

    expect(mockReq).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
