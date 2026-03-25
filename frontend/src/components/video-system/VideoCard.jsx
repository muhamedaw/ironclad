/**
 * components/VideoCard.jsx
 *
 * A single YouTube video card designed for injection into a product grid.
 *
 * Features:
 *  - Lazy-loaded thumbnail (only fetches image when near viewport)
 *  - Click-to-play embeds the YouTube iframe (avoids iframe cost before interaction)
 *  - Optional autoplay-muted when autoPlay prop is true
 *  - Skeleton shimmer while thumbnail loads
 *  - Responsive: spans 2 grid columns on larger screens
 *  - Accessible: keyboard navigable, aria labels
 */

import { useState, useRef } from 'react';
import { useInViewport, useLazyImage } from '../hooks/useVideoSearch';
import styles from './VideoCard.module.css';

// ── Build the YouTube embed URL ───────────────────────────────────
function buildEmbedUrl(videoId, { autoPlay = false, startTime = 0 } = {}) {
  const params = new URLSearchParams({
    autoplay:       autoPlay ? '1' : '1', // always autoplay on click
    mute:           autoPlay ? '1' : '0', // muted only for auto-play
    rel:            '0',   // don't show related videos from other channels
    modestbranding: '1',   // minimal YouTube branding
    playsinline:    '1',   // iOS inline play
    enablejsapi:    '1',   // allow JS API control
    origin:         window.location.origin,
    ...(startTime > 0 && { start: startTime }),
  });
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

// ── Duration badge pill ───────────────────────────────────────────
function DurationBadge({ duration }) {
  if (!duration) return null;
  return (
    <span className={styles.durationBadge} aria-label={`Duration: ${duration}`}>
      {duration}
    </span>
  );
}

// ── Play button overlay ───────────────────────────────────────────
function PlayButton() {
  return (
    <div className={styles.playButton} aria-hidden="true">
      <svg viewBox="0 0 36 36" width="48" height="48">
        <circle cx="18" cy="18" r="18" fill="rgba(0,0,0,0.75)" />
        <polygon points="14,11 28,18 14,25" fill="white" />
      </svg>
    </div>
  );
}

// ── Main VideoCard ────────────────────────────────────────────────
export default function VideoCard({
  video,
  autoPlay     = false,
  className    = '',
  onPlay,
}) {
  const { videoId, title, channel, duration } = video;

  const [playing,       setPlaying]       = useState(autoPlay);
  const [iframeLoaded,  setIframeLoaded]  = useState(false);
  const [cardRef, inViewport]             = useInViewport('150px');
  const iframeRef                         = useRef(null);

  // Lazy-load the thumbnail
  const thumbHd  = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const thumbMed = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  const [imgRef, imgLoaded] = useLazyImage(inViewport ? thumbHd : null);

  function handlePlay() {
    setPlaying(true);
    onPlay?.(video);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  }

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${className}`}
      aria-label={`Video: ${title}`}
    >
      {/* ── Label strip ── */}
      <div className={styles.labelStrip}>
        <span className={styles.labelDot} aria-hidden="true" />
        <span className={styles.labelText}>Install Guide</span>
        {duration && <DurationBadge duration={duration} />}
      </div>

      {/* ── Video area ── */}
      <div className={styles.videoWrapper}>
        {playing && inViewport ? (
          /* ── Iframe (loads only after click) ── */
          <>
            {!iframeLoaded && <div className={styles.skeleton} aria-hidden="true" />}
            <iframe
              ref={iframeRef}
              src={buildEmbedUrl(videoId, { autoPlay: true })}
              title={title}
              className={`${styles.iframe} ${iframeLoaded ? styles.iframeVisible : ''}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIframeLoaded(true)}
              loading="lazy"
            />
          </>
        ) : (
          /* ── Thumbnail + play overlay ── */
          <div
            className={styles.thumbnail}
            onClick={handlePlay}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`Play: ${title}`}
          >
            {/* Skeleton shimmer while image loads */}
            {!imgLoaded && <div className={styles.skeleton} aria-hidden="true" />}

            {/* Lazy image — src set by useLazyImage hook */}
            <img
              ref={imgRef}
              alt={title}
              className={`${styles.thumbImg} ${imgLoaded ? styles.thumbVisible : ''}`}
              onError={e => {
                // Fallback to medium quality if maxres 404s
                if (!e.target.src.includes('mqdefault')) {
                  e.target.src = thumbMed;
                }
              }}
            />

            {/* Dark gradient overlay */}
            <div className={styles.overlay} aria-hidden="true" />

            <PlayButton />

            {duration && <DurationBadge duration={duration} />}
          </div>
        )}
      </div>

      {/* ── Info footer ── */}
      <div className={styles.info}>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.channel}>{channel}</p>
      </div>
    </article>
  );
}
