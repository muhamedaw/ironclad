/**
 * hooks/useVideoSearch.js
 *
 * Smart video fetching hook for the product grid injection system.
 *
 * Features:
 *  - Fetches YouTube videos by car brand + model query
 *  - In-memory LRU cache (configurable TTL, avoids re-fetching same query)
 *  - Deduplication across sessions using a Set of seen video IDs
 *  - Graceful fallback to curated static videos if API quota exceeded
 *  - IntersectionObserver-based lazy loading (videos only load when near viewport)
 *  - Returns videos in randomised order within the same cache slot
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── In-module singletons (shared across all hook instances) ───────
const CACHE_TTL_MS  = 10 * 60 * 1000;  // 10 minutes
const MAX_CACHE     = 50;               // max cached queries
const seenVideoIds  = new Set();        // global dedup registry

/** LRU Map: key = query string, value = { videos, expiresAt } */
const videoCache = new Map();

function cacheGet(key) {
  const entry = videoCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    videoCache.delete(key);
    return null;
  }
  // LRU: move to end
  videoCache.delete(key);
  videoCache.set(key, entry);
  return entry.videos;
}

function cacheSet(key, videos) {
  // Evict oldest when full
  if (videoCache.size >= MAX_CACHE) {
    videoCache.delete(videoCache.keys().next().value);
  }
  videoCache.set(key, { videos, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Curated fallback library ──────────────────────────────────────
// Used when the YouTube API quota is exceeded or API key is missing.
const FALLBACK_VIDEOS = [
  { videoId: 'scK77q0TSEE', title: 'How to Replace Brake Pads — Complete Guide', channel: 'ChrisFix', duration: '14:22' },
  { videoId: 'X4RL8-GGLO8', title: 'Engine Oil Change — Step by Step', channel: 'Scotty Kilmer', duration: '11:05' },
  { videoId: 'j3PxEXpMlrw', title: 'Air Filter Replacement (Any Car)', channel: 'ChrisFix', duration: '8:47' },
  { videoId: 'GAJl6Nnck10', title: 'Spark Plug Replacement Guide', channel: 'EricTheCarGuy', duration: '12:30' },
  { videoId: '5wdUFnBNgBg', title: 'Car Battery Replacement', channel: 'ChrisFix', duration: '9:12' },
  { videoId: 'TmjDnXD2Fhg', title: 'Timing Belt Tips & Tricks', channel: 'SouthernSaab', duration: '18:15' },
  { videoId: '8lbpFNSwAlk', title: 'How to Diagnose Engine Problems', channel: 'EricTheCarGuy', duration: '16:00' },
  { videoId: 'q_0NXXozeGk', title: 'Suspension Replacement Guide', channel: 'AutoHow', duration: '20:44' },
];

/**
 * Build a YouTube Data API v3 search URL.
 * Swap the API key with your own from Google Cloud Console.
 */
function buildYouTubeUrl(query, maxResults = 6) {
  const API_KEY = import.meta.env?.VITE_YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY || '';
  const params = new URLSearchParams({
    part:          'snippet',
    q:             query,
    type:          'video',
    videoCategoryId: '2',   // Autos & Vehicles
    maxResults,
    order:         'relevance',
    relevanceLanguage: 'en',
    safeSearch:    'moderate',
    key:           API_KEY,
  });
  return `https://www.googleapis.com/youtube/v3/search?${params}`;
}

/**
 * Parse the raw YouTube API response into a normalised shape.
 */
function parseYouTubeResponse(data) {
  return (data?.items || [])
    .filter(item => item.id?.videoId)
    .map(item => ({
      videoId:   item.id.videoId,
      title:     item.snippet?.title      || 'Auto Parts Tutorial',
      channel:   item.snippet?.channelTitle || 'Auto Channel',
      thumbnail: item.snippet?.thumbnails?.medium?.url
               || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      publishedAt: item.snippet?.publishedAt,
      duration:  '',  // requires a second API call (videos endpoint) — omit for simplicity
    }));
}

/**
 * Remove already-seen video IDs from a candidate list.
 * Mutates seenVideoIds as a side-effect so future calls avoid the same videos.
 */
function deduplicate(videos) {
  return videos.filter(v => {
    if (seenVideoIds.has(v.videoId)) return false;
    seenVideoIds.add(v.videoId);
    return true;
  });
}

// ── Main hook ─────────────────────────────────────────────────────

/**
 * useVideoSearch(brand, model, options)
 *
 * @param {string}  brand    Vehicle brand, e.g. "BMW"
 * @param {string}  model    Vehicle model, e.g. "3 Series"
 * @param {object}  options
 * @param {number}  options.maxResults   How many videos to fetch (default 6)
 * @param {boolean} options.enabled      Fetch only when true (for lazy triggering)
 * @param {string}  options.querySuffix  Extra search term, e.g. "brake pads repair"
 *
 * @returns {{ videos, loading, error, refetch }}
 */
export function useVideoSearch(brand, model, {
  maxResults   = 6,
  enabled      = true,
  querySuffix  = 'repair tutorial how to fix',
} = {}) {
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  // Build the search query from brand + model
  const query = [brand, model, querySuffix].filter(Boolean).join(' ').trim();
  const cacheKey = `${query}|${maxResults}`;

  const fetchVideos = useCallback(async () => {
    if (!query || !enabled) return;

    // Cache hit
    const cached = cacheGet(cacheKey);
    if (cached) {
      setVideos(deduplicate([...cached])); // deduplicate against global seen set
      return;
    }

    setLoading(true);
    setError(null);

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const apiKey = import.meta.env?.VITE_YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;

      let results;

      if (!apiKey) {
        // No API key — use fallback library, filtered by brand/model keywords
        await new Promise(r => setTimeout(r, 250)); // simulate network
        results = FALLBACK_VIDEOS.filter(v =>
          v.title.toLowerCase().includes(brand?.toLowerCase() || '') ||
          v.title.toLowerCase().includes(model?.toLowerCase() || '') ||
          Math.random() > 0.3  // always return some fallback videos
        ).slice(0, maxResults);
      } else {
        const res = await fetch(buildYouTubeUrl(query, maxResults), {
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          // Quota exceeded (403) or other error — fallback gracefully
          if (res.status === 403) {
            results = FALLBACK_VIDEOS.slice(0, maxResults);
          } else {
            throw new Error(`YouTube API error: ${res.status}`);
          }
        } else {
          const data = await res.json();
          results = parseYouTubeResponse(data);
        }
      }

      // Shuffle so products never see the same order
      const shuffled = [...results].sort(() => Math.random() - 0.5);
      cacheSet(cacheKey, shuffled);
      setVideos(deduplicate(shuffled));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      // Always show fallback videos on error
      setVideos(deduplicate(FALLBACK_VIDEOS.slice(0, maxResults)));
    } finally {
      setLoading(false);
    }
  }, [query, cacheKey, enabled, maxResults, brand, model]);

  useEffect(() => {
    fetchVideos();
    return () => abortRef.current?.abort();
  }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}


/**
 * useInViewport(rootMargin)
 * Returns [ref, isVisible] — true once the element enters the viewport.
 * Used for lazy-loading video thumbnails and iframes.
 */
export function useInViewport(rootMargin = '200px') {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // fire once
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, isVisible];
}


/**
 * useLazyImage(src)
 * Returns [imgRef, loaded] — loads the image only when it enters the viewport.
 */
export function useLazyImage(src) {
  const [imgRef, inViewport] = useInViewport('300px');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !inViewport || !src) return;
    img.src = src;
    img.onload  = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // still unblock UI on error
  }, [inViewport, src, imgRef]);

  return [imgRef, loaded];
}


/**
 * useCacheStats()
 * Dev utility — exposes live cache metrics.
 */
export function useCacheStats() {
  const [stats, setStats] = useState({ size: 0, seenVideos: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      setStats({ size: videoCache.size, seenVideos: seenVideoIds.size });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return stats;
}
