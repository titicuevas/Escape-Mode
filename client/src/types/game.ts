export type InterestStatus = 'INTERESTED' | 'THINKING' | 'NOT_INTERESTED' | 'MUST_BUY';
export type PurchaseStatus =
  | 'UNRESERVED'
  | 'WAITING_OFFER'
  | 'RESERVED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'RECEIVED'
  | 'PLAYING'
  | 'COMPLETED';
export type DateSource = 'RAWG' | 'MANUAL' | 'OFFICIAL' | 'UNKNOWN';
export type MediaFormat = 'PHYSICAL' | 'DIGITAL' | 'UNKNOWN';
export type PlatformFamily =
  | 'PLAYSTATION_5'
  | 'XBOX_SERIES'
  | 'NINTENDO_SWITCH'
  | 'NINTENDO_SWITCH_2'
  | 'PC'
  | 'OTHER';

export interface Game {
  id: string;
  userId: string;
  rawgId: number | null;
  title: string;
  slug: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  description: string | null;
  releaseDate: string | null;
  earlyAccessDate: string | null;
  dateSource: DateSource;
  officialUrl: string | null;
  rawgUrl: string | null;
  platforms: string[];
  normalizedPlatforms: PlatformFamily[];
  genres: string[];
  developer: string | null;
  publisher: string | null;
  esrbRating: string | null;
  metacritic: number | null;
  interestStatus: InterestStatus;
  purchaseStatus: PurchaseStatus;
  selectedPlatform: string | null;
  selectedEdition: string | null;
  selectedStore: string | null;
  mediaFormat: MediaFormat;
  totalPrice: string | null;
  amountPaid: string;
  targetPrice: string | null;
  remainingAmount: string | null;
  remainingAmountLabel: string;
  mainDate: string | null;
  reservationDate: string | null;
  paymentDeadline: string | null;
  orderNumber: string | null;
  purchaseUrl: string | null;
  includesBonus: boolean;
  bonusDescription: string | null;
  useEarlyAccessAsMainDate: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamesListResponse {
  items: Game[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardResponse {
  nextRelease: {
    game: Game;
    mainDate: string | null;
    daysRemaining: number;
  } | null;
  nextFiveReleases: Game[];
  upcomingCommittedReleases: Game[];
  thisWeek: Array<Game & { daysRemaining: number }>;
  thisMonth: Array<Game & { daysRemaining: number }>;
  reminders: Array<{
    type: 'release' | 'payment';
    gameId: string;
    title: string;
    date: string | null;
    daysRemaining: number;
    remaining?: string;
  }>;
  reminderDaysBefore: number;
  browserNotifications: boolean;
  activeReservations: Game[];
  paidGamesCount: number;
  pendingAmountThisMonth: string;
  nextPaymentDue: {
    game: Game;
    due: string | null;
    remaining: string;
  } | null;
  recentlyUpdated: Game[];
  interestCounts: Record<InterestStatus, number>;
  pendingReviewCount: number;
  thinkingGames: Game[];
}
