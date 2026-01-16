import axios from 'axios';
import { Tournament, Team, Player, AuctionItem } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://bidkaroo.techgg.org';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

type RawWithId<T> = Omit<T, 'id'> & { _id?: string; id?: string };

type RawTournament = RawWithId<Tournament>;
type RawTeam = RawWithId<Team>;
type RawPlayer = RawWithId<Player>;
type RawAuction = RawWithId<AuctionItem>;

const withNormalizedId = <T>(entity: RawWithId<T>): T => {
    const normalized = {
        ...entity,
        id: entity._id || entity.id || ''
    };
    return normalized as T;
};

const mapTournament = (tournament: RawTournament): Tournament => withNormalizedId(tournament);
const mapTeam = (team: RawTeam): Team => withNormalizedId(team);
const mapPlayer = (player: RawPlayer): Player => ({
    ...withNormalizedId(player),
    playerId: player.playerId || player._id || player.id || ''
});

interface PaginatedPlayersResponse {
    players?: RawPlayer[];
    total: number;
}

interface PaginatedTeamsResponse {
    teams?: RawTeam[];
    total: number;
}

// Token management
let token: string | null = null;
export const setToken = (newToken: string | null) => {
    token = newToken;
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

const authHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

// Auth
export const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return res.data;
};

export const getMe = async () => {
    const res = await axios.get(`${API_BASE}/auth/me`, { headers: authHeader() });
    return res.data;
};

export const updateProfile = async (profilePicture: string) => {
    const res = await axios.patch(`${API_BASE}/auth/profile`, { profilePicture }, { headers: authHeader() });
    return res.data;
};

// Tournaments
export const fetchTournaments = async (): Promise<Tournament[]> => {
    const res = await axios.get<RawTournament[]>(`${API_BASE}/tournaments`);
    return res.data.map(mapTournament);
};

export const createTournament = async (data: Partial<Tournament>): Promise<Tournament> => {
    const res = await axios.post<RawTournament>(`${API_BASE}/tournaments`, data, { headers: authHeader() });
    return mapTournament(res.data);
};

export const updateTournament = async (id: string, data: Partial<Tournament>): Promise<Tournament> => {
    const res = await axios.put<RawTournament>(`${API_BASE}/tournaments/${id}`, data, { headers: authHeader() });
    return mapTournament(res.data);
};

export const deleteTournament = async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/tournaments/${id}`, { headers: authHeader() });
};

// Teams
export const createTeam = async (data: Partial<Team>): Promise<Team> => {
    const res = await axios.post<RawTeam>(`${API_BASE}/teams`, data, { headers: authHeader() });
    return mapTeam(res.data);
};

export const updateTeam = async (id: string, data: Partial<Team>): Promise<Team> => {
    const res = await axios.put<RawTeam>(`${API_BASE}/teams/${id}`, data, { headers: authHeader() });
    return mapTeam(res.data);
};

export const deleteTeam = async (id: string): Promise<void> => {
    if (!id) throw new Error('Team ID is required');
    await axios.delete(`${API_BASE}/teams/${id}`, { headers: authHeader() });
};

// Players
type PlayerPayload = Omit<Player, 'id'> & { playerId?: string };

export const createPlayer = async (data: PlayerPayload): Promise<Player> => {
    const res = await axios.post<RawPlayer>(`${API_BASE}/players`, data, { headers: authHeader() });
    return mapPlayer(res.data);
};

export const updatePlayer = async (id: string, data: Partial<PlayerPayload>): Promise<Player> => {
    const res = await axios.put<RawPlayer>(`${API_BASE}/players/${id}`, data, { headers: authHeader() });
    return mapPlayer(res.data);
};

export const deletePlayer = async (id: string, tournamentId?: string): Promise<void> => {
    const params = new URLSearchParams();
    if (tournamentId) {
        params.set('tournamentId', tournamentId);
    }
    const query = params.toString();
    const url = query ? `${API_BASE}/players/${id}?${query}` : `${API_BASE}/players/${id}`;
    await axios.delete(url, { headers: authHeader() });
};

// Auctions
const mapAuction = (auction: RawAuction): AuctionItem => {
    // Some backend responses include only `player` (as id or populated object),
    // others normalize it to `playerId`. Make sure we always expose a string `playerId`.
    const raw: any = auction as any;
    const fallbackPlayerId =
        (typeof raw.player === 'string' && raw.player) ||
        (raw.player && (raw.player._id || raw.player.id)) ||
        '';

    return {
        ...withNormalizedId(auction),
        playerId: auction.playerId || fallbackPlayerId
    };
};

export const fetchAuctions = async (): Promise<AuctionItem[]> => {
    const res = await axios.get<RawAuction[]>(`${API_BASE}/auctions`);
    return res.data.map(mapAuction);
};

export const createAuction = async (data: Partial<AuctionItem>): Promise<AuctionItem> => {
    const res = await axios.post<RawAuction>(`${API_BASE}/auctions`, data, { headers: authHeader() });
    return mapAuction(res.data);
};

export const placeBid = async (auctionId: string, teamId: string, amount: number): Promise<AuctionItem> => {
    const res = await axios.post<RawAuction>(`${API_BASE}/auctions/bid`, { auctionId, teamId, amount }, { headers: authHeader() });
    return mapAuction(res.data);
};

export const completeAuction = async (auctionId: string, winnerId?: string, finalAmount?: number): Promise<AuctionItem> => {
    const res = await axios.post<RawAuction>(`${API_BASE}/auctions/complete`, { auctionId, winnerId, finalAmount }, { headers: authHeader() });
    return mapAuction(res.data);
};

export const updateAuction = async (id: string, data: Partial<AuctionItem>): Promise<AuctionItem> => {
    const res = await axios.put<RawAuction>(`${API_BASE}/auctions/${id}`, data, { headers: authHeader() });
    return mapAuction(res.data);
};

export const deleteAuction = async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/auctions/${id}`, { headers: authHeader() });
};

export const resetAuctions = async (tournamentId: string): Promise<void> => {
    await axios.post(`${API_BASE}/auctions/reset/${tournamentId}`, {}, { headers: authHeader() });
};

export const markPlayerUnsold = async (playerId: string): Promise<{ player: Player; team?: Team }> => {
    const res = await axios.post<{ player: RawPlayer; team?: RawTeam }>(`${API_BASE}/players/markUnsold`, { playerId }, { headers: authHeader() });
    return {
        player: mapPlayer(res.data.player),
        team: res.data.team ? mapTeam(res.data.team) : undefined
    };
};

export const revertUnsoldCategory = async (category: string, tournamentId?: string) => {
    const payload: { category: string; tournamentId?: string } = { category };
    if (tournamentId) payload.tournamentId = tournamentId;
    const res = await axios.post<{ matched: number; modified: number }>(`${API_BASE}/players/revertUnsoldCategory`, payload, { headers: authHeader() });
    return res.data;
};

export const revertUnsold1Category = async (category: string, tournamentId?: string) => {
    const payload: { category: string; tournamentId?: string } = { category };
    if (tournamentId) payload.tournamentId = tournamentId;
    const res = await axios.post<{ matched: number; modified: number }>(`${API_BASE}/players/revertUnsold1Category`, payload, { headers: authHeader() });
    return res.data;
};

export const fetchPlayerById = async (id: string, tournamentId?: string): Promise<Player> => {
    const params = new URLSearchParams();
    if (tournamentId) {
        params.set('tournamentId', tournamentId);
    }
    const query = params.toString();
    const url = query ? `${API_BASE}/players/${id}?${query}` : `${API_BASE}/players/${id}`;
    const res = await axios.get<RawPlayer>(url);
    return mapPlayer(res.data);
};

// Fetch only minimal player info for lists
export const fetchPlayerSummaries = async (tournamentId?: string): Promise<Player[]> => {
    let url = `${API_BASE}/players/summaries`;
    if (tournamentId) {
        url += `?tournamentId=${tournamentId}`;
    }
    const res = await axios.get<RawPlayer[]>(url);
    return res.data.map(mapPlayer);
};

// Public: fetch display-safe player cards for a tournament
export const fetchPublicPlayersByTournament = async (tournamentId: string): Promise<Player[]> => {
    const res = await axios.get<RawPlayer[]>(`${API_BASE}/players/check/${tournamentId}`);
    return res.data.map(mapPlayer);
};

export const checkDuplicatePlayerName = async (name: string): Promise<Player[]> => {
    const params = new URLSearchParams({ name });
    const res = await axios.get<RawPlayer[]>(`${API_BASE}/players/duplicates/check?${params.toString()}`, {
        headers: authHeader()
    });
    return res.data.map(mapPlayer);
};

// Only keep the paginated versions:
export async function fetchPlayers(page = 1, limit = 200, tournamentId?: string): Promise<{ players: Player[]; total: number }> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
    });
    if (tournamentId) {
        params.set('tournamentId', tournamentId);
    }
    const res = await axios.get<PaginatedPlayersResponse>(`${API_BASE}/players?${params.toString()}`);
    return {
        players: (res.data.players ?? []).map(mapPlayer),
        total: res.data.total
    };
}

export async function fetchTeams(page = 1, limit = 20, tournamentId?: string): Promise<{ teams: Team[]; total: number }> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
    });
    if (tournamentId) {
        params.set('tournamentId', tournamentId);
    }
    const res = await axios.get<PaginatedTeamsResponse>(`${API_BASE}/teams?${params.toString()}`);
    return {
        teams: (res.data.teams ?? []).map(mapTeam),
        total: res.data.total
    };
}

export const deleteAllAuctions = async (): Promise<void> => {
    await axios.delete(`${API_BASE}/auctions/all`, { headers: authHeader() });
};