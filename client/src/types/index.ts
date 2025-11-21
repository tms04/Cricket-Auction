export interface User {
  id: string;
  username: string;
  role: 'master' | 'auctioneer' | 'viewer';
  name: string;
  email?: string;
  photo?: string;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  maxTeams: number;
  budget: number;
  createdAt: string;
  logo?: string;
  auctioneerEmail?: string;
  auctioneerPassword?: string;
  maxTeamSize?: number;
  minTeamSize?: number;
  auctionType?: 'open' | 'categories';
  categories?: { category: string; numPlayers: number; minBalance: number }[];
}

export interface Team {
  id: string;
  name: string;
  tournamentId: string;
  owner: string;
  budget: number;
  remainingBudget: number;
  players: string[];
  color: string;
  logo?: string;
  totalBudget: number;
}

export interface Player {
  id: string;
  playerId?: string;
  participationId?: string;
  name: string;
  team?: string;
  teamName?: string;
  teamDetails?: {
    _id?: string;
    id?: string;
    name?: string;
    logo?: string;
    color?: string;
  };
  price?: number;
  basePrice?: number;
  isSold?: boolean;
  previousYearTeam?: string;
  nearestRailwayStation?: string;
  photo?: string;
  tournamentId?: string;
  status?: string;
  role?: string;
  station?: string;
  age?: number;
  category?: string;
  primaryRole?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerDetails?: Record<string, unknown>;
  participationDetails?: Record<string, unknown>;
}

export interface AuctionItem {
  id: string;
  playerId: string;
  tournamentId: string;
  currentBid: number;
  currentBidder?: string;
  status: 'upcoming' | 'active' | 'sold' | 'unsold';
  bids: Bid[];
  startTime?: string;
  endTime?: string;
  finalAmount?: number;
  bidAmount?: number;
}

export interface Bid {
  id: string;
  teamId: string;
  amount: number;
  timestamp: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
}

export interface AppContextType {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  auctions: AuctionItem[];
  myTournament: Tournament | null;
  activeTournament: Tournament | null;
  setActiveTournament: (tournament: Tournament | null) => void;
  isLoading: boolean;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => Promise<Tournament>;
  addTeam: (team: Omit<Team, 'id'>) => Promise<Team>;
  addPlayer: (player: Omit<Player, 'id'>) => Promise<Player>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  deletePlayer: (id: string, tournamentId?: string) => Promise<void>;
  startAuction: (playerId: string) => Promise<AuctionItem | null>;
  placeBid: (auctionId: string, teamId: string, amount: number) => Promise<boolean>;
  completeAuction: (auctionId: string, winnerId?: string, finalAmount?: number) => Promise<boolean>;
  resetPlayerStatuses: () => Promise<void>;
  fetchTeams?: () => Promise<void>;
  fetchPlayers?: () => Promise<void>;
  fetchAuctions?: () => Promise<void>;
}