// Unit tests for uploadVideo and makeParachuteVideoPath — verifies the
// Firebase Storage write path and the deterministic path-building.

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({ kind: 'storage' })),
  ref: jest.fn((_storage, path) => ({ path })),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('./firebase', () => ({ default: { name: 'app' } }));

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { makeParachuteVideoPath, uploadVideo } from './mediaUpload';

describe('uploadVideo', () => {
  const mockRef = ref as jest.Mock;
  const mockUpload = uploadBytes as jest.Mock;
  const mockUrl = getDownloadURL as jest.Mock;

  const fakeBlob = { type: 'video/quicktime' } as unknown as Blob;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(fakeBlob),
    });
  });

  it('should return expected data — download URL from Firebase Storage', async () => {
    mockUpload.mockResolvedValueOnce(undefined);
    mockUrl.mockResolvedValueOnce('https://files/abc');

    const url = await uploadVideo('file:///tmp/x.mov', 'videos/x.mov');

    expect(url).toBe('https://files/abc');
  });

  it('should handle missing input — defaults content type when blob has none', async () => {
    (global.fetch as any) = jest.fn().mockResolvedValueOnce({
      blob: () => Promise.resolve({ type: '' } as Blob),
    });
    mockUpload.mockResolvedValueOnce(undefined);
    mockUrl.mockResolvedValueOnce('https://files/y');

    await uploadVideo('file:///tmp/y.mov', 'videos/y.mov');

    expect(mockUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { contentType: 'video/mp4' }
    );
  });

  it('should handle error response — propagates upload failure', async () => {
    mockUpload.mockRejectedValueOnce(new Error('storage offline'));

    await expect(
      uploadVideo('file:///tmp/z.mov', 'videos/z.mov')
    ).rejects.toThrow('storage offline');
  });

  it('should call the correct Firebase function — ref + uploadBytes + getDownloadURL', async () => {
    mockUpload.mockResolvedValueOnce(undefined);
    mockUrl.mockResolvedValueOnce('https://files/final');

    await uploadVideo('file:///tmp/clip.mov', 'videos/parachute/clip.mov');

    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      'videos/parachute/clip.mov'
    );
    expect(mockUpload).toHaveBeenCalledWith(
      { path: 'videos/parachute/clip.mov' },
      fakeBlob,
      { contentType: 'video/quicktime' }
    );
    expect(mockUrl).toHaveBeenCalledWith({
      path: 'videos/parachute/clip.mov',
    });
  });
});

describe('makeParachuteVideoPath', () => {
  it('preserves the original extension and produces a unique path', () => {
    const a = makeParachuteVideoPath('file:///tmp/clip.MOV');
    const b = makeParachuteVideoPath('file:///tmp/clip.MOV');
    expect(a).toMatch(/^videos\/parachute\/\d+_[a-z0-9]{1,6}\.mov$/);
    expect(b).not.toBe(a);
  });

  it('falls back to .mov when the URI ends with a bare dot', () => {
    // `'file.'.split('.').pop()` is '' — the `|| 'mov'` guard kicks in.
    const path = makeParachuteVideoPath('file:///tmp/file.');
    expect(path.endsWith('.mov')).toBe(true);
  });
});
