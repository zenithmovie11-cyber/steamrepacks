import { describe, it, expect } from 'vitest';
import { downloadTarget, entitledPostIds, pendingPostIds, bundleName } from './product-access';
import { videoSource } from './product-media';
import { parseTheme } from './theme';

const free = { id: 'f', is_paid: false, download_path: 'a/file.zip', play_url: 'https://x.test' };
const freeLinkOnly = { id: 'l', is_paid: false, download_path: null, play_url: 'https://x.test' };
const paid = { id: 'p', is_paid: true, download_path: 'b/game.zip', play_url: null };

describe('product downloads', () => {
  it('free product downloads its uploaded file first', () => {
    expect(downloadTarget(free, new Set())).toBe('file');
  });
  it('free product without a file goes to the given link', () => {
    expect(downloadTarget(freeLinkOnly, new Set())).toBe('link');
  });
  it('paid product stays locked until a request is approved', () => {
    expect(downloadTarget(paid, new Set())).toBeNull();
    expect(downloadTarget(paid, entitledPostIds([{ post_ids: ['p'], status: 'pending' }]))).toBeNull();
    expect(downloadTarget(paid, entitledPostIds([{ post_ids: ['p'], status: 'rejected' }]))).toBeNull();
    expect(downloadTarget(paid, entitledPostIds([{ post_ids: ['p'], status: 'approved' }]))).toBe('file');
  });
  it('tracks pending requests separately', () => {
    expect(pendingPostIds([{ post_ids: ['p'], status: 'pending' }, { post_ids: ['q'], status: 'approved' }])).toEqual(new Set(['p']));
  });
  it('names a folder upload after its root folder', () => {
    expect(bundleName(['MyGame/a.txt', 'MyGame/data/b.bin'])).toBe('MyGame.zip');
    expect(bundleName(['a.txt', 'b.txt'])).toBe('files.zip');
  });
});

describe('product video', () => {
  it('plays YouTube links through an embedded player requesting 1080p', () => {
    expect(videoSource('https://youtu.be/dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube' });
    expect(videoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.src).toContain('vq=hd1080');
  });
  it('plays direct video files natively and rejects insecure links', () => {
    expect(videoSource('https://cdn.test/clip.mp4')).toEqual({ kind: 'file', src: 'https://cdn.test/clip.mp4' });
    expect(videoSource('http://cdn.test/clip.mp4')).toBeNull();
    expect(videoSource('javascript:alert(1)')).toBeNull();
  });
});

describe('theme', () => {
  it('defaults to the current light look', () => {
    expect(parseTheme(null)).toBe('light');
    expect(parseTheme('weird')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
  });
});
