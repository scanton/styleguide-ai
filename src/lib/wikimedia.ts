/**
 * Wikimedia Commons now restricts thumbnails to a fixed set of bucket widths
 * (arbitrary widths return HTTP 400). Requests are snapped up to the nearest
 * allowed bucket.
 */
const THUMB_BUCKETS = [250, 330, 500, 960, 1920, 3840] as const;

function snapToBucket(width: number): number {
  for (const b of THUMB_BUCKETS) {
    if (b >= width) return b;
  }
  return THUMB_BUCKETS[THUMB_BUCKETS.length - 1];
}

/**
 * Returns a resized Wikimedia Commons thumbnail URL for an original or
 * thumb-form upload.wikimedia.org image URL. Falls back to the original
 * URL when the pattern doesn't match or the original is already small enough.
 */
export function wikimediaThumb(
  url: string,
  width: number,
  originalWidth?: number
): string {
  const bucket = snapToBucket(width);
  if (originalWidth !== undefined && originalWidth <= bucket) return url;
  try {
    if (url.includes("/thumb/")) {
      // .../thumb/a/ab/File.jpg/3840px-File.jpg → swap the px prefix
      return url.replace(/\/\d+px-([^/]+)$/, `/${bucket}px-$1`);
    }
    const prefix = "https://upload.wikimedia.org/wikipedia/commons/";
    if (!url.startsWith(prefix)) return url;
    const path = url.slice(prefix.length); // e.g. "6/68/File.jpg"
    const file = path.split("/").pop();
    if (!file) return url;
    return `${prefix}thumb/${path}/${bucket}px-${file}`;
  } catch {
    return url;
  }
}
