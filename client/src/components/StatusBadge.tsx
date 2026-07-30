import type { InterestStatus, PurchaseStatus } from '../types/game';
import { interestLabel, interestTone, purchaseLabel, purchaseTone } from '../utils/format';

export function StatusBadge({
  interest,
  purchase,
}: {
  interest?: InterestStatus;
  purchase?: PurchaseStatus;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {interest ? (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs ring-1 ${interestTone(interest)}`}
          aria-label={`Interés: ${interestLabel(interest)}`}
        >
          {interestLabel(interest)}
        </span>
      ) : null}
      {purchase ? (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs ring-1 ${purchaseTone(purchase)}`}
          aria-label={`Compra: ${purchaseLabel(purchase)}`}
        >
          {purchaseLabel(purchase)}
        </span>
      ) : null}
    </div>
  );
}
