import { Link } from 'react-router-dom';
import type { Game } from '../types/game';
import { formatDateEs, formatEuro, interestLabel, interestTone, purchaseLabel, purchaseTone } from '../utils/format';
import { CoverImage } from './CoverImage';

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-surface-muted/50 transition hover:border-accent/40"
    >
      <div className="aspect-[3/4] overflow-hidden bg-surface-elevated">
        <CoverImage
          src={game.coverUrl}
          alt={`Portada de ${game.title}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{game.title}</h3>
        <p className="text-xs text-ink-muted">{formatDateEs(game.mainDate)}</p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${interestTone(game.interestStatus)}`}
          >
            {interestLabel(game.interestStatus)}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${purchaseTone(game.purchaseStatus)}`}
          >
            {purchaseLabel(game.purchaseStatus)}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          {game.totalPrice == null ? 'Precio pendiente de indicar' : formatEuro(game.totalPrice)}
        </p>
      </div>
    </Link>
  );
}
