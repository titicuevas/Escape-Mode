export type PaymentType = 'RESERVATION' | 'PAYMENT' | 'REFUND';
export type Availability = 'AVAILABLE' | 'PREORDER' | 'OUT_OF_STOCK' | 'UNKNOWN';
export type BudgetGrouping = 'RELEASE' | 'RESERVATION' | 'PAYMENT';

export interface Payment {
  id: string;
  gameId: string;
  amount: string;
  paymentDate: string | null;
  paymentType: PaymentType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOffer {
  id: string;
  gameId: string;
  store: string;
  edition: string | null;
  platform: string | null;
  price: string;
  shippingCost: string;
  finalPrice: string;
  url: string | null;
  availability: Availability;
  includesBonus: boolean;
  bonusDescription: string | null;
  checkedAt: string;
  notes: string | null;
  isSelectedStore?: boolean;
  isLowestPrice?: boolean;
  targetReached?: boolean;
}

export interface OffersResponse {
  offers: StoreOffer[];
  targetPrice: string | null;
  selectedStore: string | null;
}

export interface BudgetResponse {
  year: number;
  month: number | null;
  grouping: BudgetGrouping;
  totalPaid: string;
  totalPending: string;
  totalSpend: string;
  spendByMonth: Array<{ key: string; amount: string }>;
  spendByPlatform: Array<{ key: string; amount: string }>;
  spendByStore: Array<{ key: string; amount: string }>;
  upcomingObligations: Array<{
    game: import('./game').Game;
    due: string | null;
    remaining: string;
  }>;
  gamesWithoutPrice: import('./game').Game[];
  partiallyPaidGames: import('./game').Game[];
}
