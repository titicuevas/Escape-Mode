import { Link } from 'react-router-dom';
import type { Game } from '../types/game';
import { formatDateEs, formatEuro, interestLabel, interestTone, purchaseLabel, purchaseTone } from '../utils/format';
import { CoverImage } from './CoverImage';

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group card-enter overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_12px_40px_-20px_rgba(94,234,212,0.45)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <CoverImage
          src={game.coverUrl}
          title={game.title}
          alt={`Portada de ${game.title}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 pt-16">
          <p className="text-[11px] font-medium text-white/85">{formatDateEs(game.mainDate)}</p>
        </div>
      </div>
      <div className="space-y-2.5 p-3.5">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug tracking-tight">
          {game.title}
        </h3>
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
        <p className="text-sm font-medium text-accent">
          {game.totalPrice == null ? 'Precio pendiente' : formatEuro(game.totalPrice)}
        </p>
      </div>
    </Link>
  );
}
