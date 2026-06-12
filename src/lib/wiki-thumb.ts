"use client";

import { useEffect, useState } from "react";

/**
 * Fetches a portrait thumbnail from the Wikipedia REST summary API,
 * keyed by the artist's wikipediaUrl. Results (including misses) are
 * cached for the session; concurrent requests are deduped.
 */
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

export function fetchWikiThumb(wikipediaUrl: string): Promise<string | null> {
  if (cache.has(wikipediaUrl)) {
    return Promise.resolve(cache.get(wikipediaUrl) ?? null);
  }
  const existing = inflight.get(wikipediaUrl);
  if (existing) return existing;

  const title = wikipediaUrl.split("/wiki/")[1];
  if (!title) {
    cache.set(wikipediaUrl, null);
    return Promise.resolve(null);
  }

  const promise = fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    { headers: { Accept: "application/json" } }
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { thumbnail?: { source?: string } } | null) => {
      const url = data?.thumbnail?.source ?? null;
      cache.set(wikipediaUrl, url);
      inflight.delete(wikipediaUrl);
      return url;
    })
    .catch(() => {
      cache.set(wikipediaUrl, null);
      inflight.delete(wikipediaUrl);
      return null;
    });

  inflight.set(wikipediaUrl, promise);
  return promise;
}

/** React hook: resolves to a thumbnail URL (or null) once `enabled` is true. */
export function useWikiThumb(
  wikipediaUrl: string | undefined,
  enabled = true
): string | null {
  const [thumb, setThumb] = useState<string | null>(
    wikipediaUrl ? (cache.get(wikipediaUrl) ?? null) : null
  );

  useEffect(() => {
    if (!wikipediaUrl || !enabled) return;
    let cancelled = false;
    fetchWikiThumb(wikipediaUrl).then((url) => {
      if (!cancelled) setThumb(url);
    });
    return () => {
      cancelled = true;
    };
  }, [wikipediaUrl, enabled]);

  return thumb;
}
