import { describe, expect, it } from 'vitest';
import { albumSchema, emptyAlbum, hotspotSchema, imageCoordinates, publicAlbums, validateGalleryFile } from './lookbook';
describe('Lookbook rules', () => {
  it('excludes draft albums from the public gallery', () => {
    expect(publicAlbums([{ id: 'draft', is_published: false }, { id: 'live', is_published: true }]).map(a => a.id)).toEqual(['live']);
  });
  it('keeps hotspot coordinates relative to the image at any display size', () => {
    expect(imageCoordinates(200, 125, { left: 100, top: 50, width: 400, height: 300 })).toEqual({ x: 25, y: 25 });
    expect(imageCoordinates(150, 87.5, { left: 100, top: 50, width: 200, height: 150 })).toEqual({ x: 25, y: 25 });
  });
  it('bounds coordinates to the actual image', () => {
    expect(imageCoordinates(-10, 500, { left: 0, top: 0, width: 100, height: 100 })).toEqual({ x: 0, y: 100 });
    expect(hotspotSchema.safeParse({ post_id: 'c5f76308-069f-47f6-bac0-063be20fda68', x: 101, y: 50 }).success).toBe(false);
  });
  it('supports all three requested layouts', () => {
    for (const layout of ['grid', 'slider', 'masonry']) expect(albumSchema.safeParse({ ...emptyAlbum, title: 'GTA Showcase', layout }).success).toBe(true);
    expect(albumSchema.safeParse({ ...emptyAlbum, title: 'GTA Showcase', layout: 'invalid' }).success).toBe(false);
  });
  it('rejects non-images and allows full-resolution photos up to the bucket limit', () => {
    expect(() => validateGalleryFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 })).not.toThrow();
    expect(() => validateGalleryFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 + 1 })).toThrow();
    expect(() => validateGalleryFile({ type: 'image/svg+xml', size: 100 })).toThrow();
  });
});