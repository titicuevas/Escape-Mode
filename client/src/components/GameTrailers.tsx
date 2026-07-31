import type { RawgTrailer } from '../types/rawg';

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} trailer gameplay`)}`;
}

export function GameTrailers({
  trailers,
  title = 'Tráiler / gameplay',
  gameTitle,
  rawgUrl,
}: {
  trailers?: RawgTrailer[] | null;
  title?: string;
  gameTitle?: string | null;
  rawgUrl?: string | null;
}) {
  const list = (trailers ?? []).filter((t) => t.videoUrl || t.embedUrl);

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{title}</h3>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-surface/40 px-3 py-3 text-sm text-ink-muted">
          <p>
            RAWG casi nunca envía vídeo en el plan gratis (sobre todo en juegos aún no
            lanzados). Puedes abrirlo en YouTube:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {gameTitle ? (
              <a
                href={youtubeSearchUrl(gameTitle)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-accent/40 px-3 text-sm text-accent hover:bg-accent/10"
              >
                Buscar tráiler en YouTube
              </a>
            ) : null}
            {rawgUrl ? (
              <a
                href={rawgUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-sm text-ink-muted hover:bg-white/5"
              >
                Ver en RAWG
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        list.map((trailer) => (
          <div key={trailer.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {trailer.embedUrl ? (
              <iframe
                title={trailer.name}
                className="aspect-video w-full bg-black"
                src={trailer.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
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
            )}
            <p className="px-3 py-2 text-xs text-ink-muted">{trailer.name}</p>
          </div>
        ))
      )}

      {list.length > 0 && gameTitle ? (
        <a
          href={youtubeSearchUrl(gameTitle)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm text-accent underline-offset-2 hover:underline"
        >
          Buscar más gameplay en YouTube
        </a>
      ) : null}
    </div>
  );
}
