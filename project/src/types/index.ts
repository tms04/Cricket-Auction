export interface User {
  id: string;
  username: string;
  role: 'master' | 'auctioneer' | 'viewer';
  name: string;
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
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  station: string; // New field for player's station/location
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  category: 'A+' | 'A' | 'B' | 'C';
  basePrice: number;
  photo?: string; // New field for player's photo URL
  tournamentId: string;
  stats: {
    matches: number;
    runs?: number;
    wickets?: number;
    average?: number;
    strikeRate?: number;
  };
  image?: string;
  status: 'available' | 'sold' | 'unsold';
  soldTo?: string;
  soldPrice?: number;
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
}

export interface AppContextType {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  auctions: AuctionItem[];
  activeTournament: Tournament | null;
  setActiveTournament: (tournament: Tournament | null) => void;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => Tournament;
  addTeam: (team: Omit<Team, 'id'>) => Team;
  addPlayer: (player: Omit<Player, 'id'>) => Player;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  deleteTeam: (id: string) => void;
  deletePlayer: (id: string) => void;
  startAuction: (playerId: string) => AuctionItem | null;
  placeBid: (auctionId: string, teamId: string, amount: number) => boolean;
  completeAuction: (auctionId: string, winnerId?: string) => boolean;
  resetPlayerStatuses: () => void;
}