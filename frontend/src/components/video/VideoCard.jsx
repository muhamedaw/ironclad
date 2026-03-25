import { useState } from 'react';
import { useIntersection } from '../../hooks';

// ─── VideoCard ───────────────────────────────────────────────────
// Lazy-loads the YouTube embed only when in viewport
// Injected every 5 products in the grid
export default function VideoCard({ video, style }) {
  const [playing, setPlaying] = useState(false);
  const [ref, inView] = useIntersection({ threshold: 0.2 });

  const thumbUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <article
      ref={ref}
      style={style}
      className="reveal col-span-1 sm:col-span-2 bg-charcoal-900 border border-steel-700 rounded-xl overflow-hidden group"
    >
      {/* Label strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-steel-800">
        <span className="w-2 h-2 bg-rust-500 rounded-full animate-pulse" />
        <span className="text-xs font-display font-bold tracking-widest uppercase text-steel-400">
          Install Guide
        </span>
        <span className="ml-auto text-xs font-mono text-steel-600">{video.duration}</span>
      </div>

      {/* Video area */}
      <div className="relative aspect-video bg-charcoal-950">
        {inView && !playing ? (
          /* Thumbnail + play button */
          <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(true)}>
            <img
              src={thumbUrl}
              alt={video.title}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
              loading="lazy"
              onError={e => {
                // Fallback to lower res thumbnail
                e.target.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
              }}
            />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
                <PlayIcon />
              </div>
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 to-transparent pointer-events-none" />
          </div>
        ) : playing ? (
          /* Actual iframe — only loads when clicked */
          <iframe
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          /* Placeholder while not in view */
          <div className="w-full h-full flex items-center justify-center bg-charcoal-950">
            <div className="w-12 h-12 rounded-full bg-steel-800 animate-pulse" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <h4 className="font-display font-semibold text-sm tracking-wide text-cream-200 line-clamp-1">
          {video.title}
        </h4>
        <p className="text-xs font-mono text-steel-500 mt-0.5">{video.channel}</p>
      </div>
    </article>
  );
}

function PlayIcon() {
  return (
    <svg
      className="text-charcoal-900 ml-1"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
