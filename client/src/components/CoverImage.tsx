import { useState } from 'react';

function initialsFrom(alt: string): string {
  const clean = alt.replace(/^Portada de\s+/i, '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function CoverImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  title,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const monogram = initialsFrom(title || alt);

  if (!showImage) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-surface-elevated p-4 text-center"
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(94,234,212,0.22), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.14), transparent 45%), linear-gradient(165deg, #152038 0%, #0b1220 70%)',
          }}
        />
        <span className="relative font-display text-4xl font-semibold tracking-tight text-accent/90 sm:text-5xl">
          {monogram}
        </span>
        <span className="relative mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          Sin portada
        </span>
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
