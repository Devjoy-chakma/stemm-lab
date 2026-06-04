// Unit tests for ensureAnonymousAuth — verifies it reuses an existing
// signed-in user, falls through to signInAnonymously when none, and

jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(),
}));

jest.mock('./firebase', () => ({
  auth: { currentUser: null as { uid: string } | null },
}));

import { signInAnonymously } from 'firebase/auth';

import { ensureAnonymousAuth } from './auth';
import { auth } from './firebase';

describe('ensureAnonymousAuth', () => {
  const mockSignIn = signInAnonymously as jest.MockedFunction<
    typeof signInAnonymously
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = null;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('should return expected data — uid from existing session without calling signIn', async () => {
    (auth as any).currentUser = { uid: 'existing-uid' };

    const result = await ensureAnonymousAuth();

    expect(result).toBe('existing-uid');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should handle missing input — sign in anonymously when no current user', async () => {
    (auth as any).currentUser = null;
    mockSignIn.mockResolvedValueOnce({ user: { uid: 'new-uid' } } as any);

    const result = await ensureAnonymousAuth();

    expect(result).toBe('new-uid');
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('should handle error response — return null when signIn rejects', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('offline'));

    const result = await ensureAnonymousAuth();

    expect(result).toBeNull();
  });

  it('should call the correct Firebase function — signInAnonymously with auth', async () => {
    mockSignIn.mockResolvedValueOnce({ user: { uid: 'x' } } as any);

    await ensureAnonymousAuth();

    expect(mockSignIn).toHaveBeenCalledWith(auth);
  });
});
