import type { RawgTrailer } from '../types/rawg';

export function GameTrailers({
  trailers,
  title = 'Trailer',
}: {
  trailers?: RawgTrailer[] | null;
  title?: string;
}) {
  const list = (trailers ?? []).filter((t) => t.videoUrl);
  if (list.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{title}</h3>
      {list.map((trailer) => (
        <div key={trailer.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <video
            className="aspect-video w-full bg-black"
            controls
            playsInline
            preload="metadata"
            poster={trailer.previewUrl ?? undefined}
            src={trailer.videoUrl!}
          >
            Tu navegador no puede reproducir este vídeo.
          </video>
          <p className="px-3 py-2 text-xs text-ink-muted">{trailer.name}</p>
        </div>
      ))}
    </div>
  );
}
