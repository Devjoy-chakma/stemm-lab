// Unit tests for the Firebase initialiser — verifies it constructs the
// app once and exposes auth and db handles wired to that app.

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'init' })),
  getApps: jest.fn(),
  getApp: jest.fn(() => ({ name: 'existing' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn((app) => ({ kind: 'auth', app })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn((app) => ({ kind: 'db', app })),
}));

describe('firebase module', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should return expected data — auth and db exports are wired to the app', () => {
    const { getApps, initializeApp } = require('firebase/app');
    (getApps as jest.Mock).mockReturnValueOnce([]);
    (initializeApp as jest.Mock).mockReturnValueOnce({ name: 'fresh' });

    const mod = require('./firebase');

    expect(mod.auth).toEqual({ kind: 'auth', app: { name: 'fresh' } });
    expect(mod.db).toEqual({ kind: 'db', app: { name: 'fresh' } });
    expect(mod.default).toEqual({ name: 'fresh' });
  });

  it('should handle missing input — reuses existing app when one is already initialised', () => {
    const { getApps, getApp, initializeApp } = require('firebase/app');
    (getApps as jest.Mock).mockReturnValueOnce([{ name: 'existing' }]);
    (getApp as jest.Mock).mockReturnValueOnce({ name: 'existing' });

    const mod = require('./firebase');

    expect(initializeApp).not.toHaveBeenCalled();
    expect(getApp).toHaveBeenCalled();
    expect(mod.default).toEqual({ name: 'existing' });
  });

  it('should handle error response — propagates init failure', () => {
    const { getApps, initializeApp } = require('firebase/app');
    (getApps as jest.Mock).mockReturnValueOnce([]);
    (initializeApp as jest.Mock).mockImplementationOnce(() => {
      throw new Error('bad config');
    });

    expect(() => require('./firebase')).toThrow('bad config');
  });

  it('should call the correct Firebase functions — initializeApp + getAuth + getFirestore', () => {
    const { getApps, initializeApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');
    (getApps as jest.Mock).mockReturnValueOnce([]);
    (initializeApp as jest.Mock).mockReturnValueOnce({ name: 'fresh' });

    require('./firebase');

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledWith({ name: 'fresh' });
    expect(getFirestore).toHaveBeenCalledWith({ name: 'fresh' });
  });
});
