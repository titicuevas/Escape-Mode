import { useState } from 'react';

export function CoverImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(94,234,212,0.18),_transparent_55%),linear-gradient(160deg,#121a2b,#0b1220)] p-4 text-center text-sm text-ink-muted"
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        Sin portada
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      decoding="async"
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
