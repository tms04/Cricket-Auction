import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
export const fetchTournaments = async () => {
    const res = await axios.get(`${API_BASE}/tournaments`);
    // Map _id to id for React key props
    return res.data.map((tournament: any) => ({
        ...tournament,
        id: tournament._id || tournament.id,
    }));
};
export const createTournament = async (data: any) => {
    const res = await axios.post(`${API_BASE}/tournaments`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const tournament = res.data;
    return {
        ...tournament,
        id: tournament._id || tournament.id,
    };
};
export const updateTournament = async (id: string, data: any) => {
    const res = await axios.put(`${API_BASE}/tournaments/${id}`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const tournament = res.data;
    return {
        ...tournament,
        id: tournament._id || tournament.id,
    };
};
export const deleteTournament = async (id: string) => {
    const res = await axios.delete(`${API_BASE}/tournaments/${id}`, { headers: authHeader() });
    return res.data;
};

// Teams
export const fetchTeams = async () => {
    const res = await axios.get(`${API_BASE}/teams`);
    // Map _id to id for React key props
    return res.data.map((team: any) => ({
        ...team,
        id: team._id || team.id,
    }));
};
export const createTeam = async (data: any) => {
    const res = await axios.post(`${API_BASE}/teams`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const team = res.data;
    return {
        ...team,
        id: team._id || team.id,
    };
};
export const updateTeam = async (id: string, data: any) => {
    const res = await axios.put(`${API_BASE}/teams/${id}`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const team = res.data;
    return {
        ...team,
        id: team._id || team.id,
    };
};
export const deleteTeam = async (id: string) => {
    if (!id) throw new Error('Team ID is required');
    const res = await axios.delete(`${API_BASE}/teams/${id}`, { headers: authHeader() });
    return res.data;
};

// Players
export const fetchPlayers = async (tournamentId?: string) => {
    let url = `${API_BASE}/players`;
    if (tournamentId) {
        url += `?tournamentId=${tournamentId}`;
    }
    const res = await axios.get(url);
    // Map _id to id for React key props
    return res.data.map((player: any) => ({
        ...player,
        id: player._id || player.id,
    }));
};
export const createPlayer = async (data: any) => {
    const res = await axios.post(`${API_BASE}/players`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const player = res.data;
    return {
        ...player,
        id: player._id || player.id,
    };
};
export const updatePlayer = async (id: string, data: any) => {
    const res = await axios.put(`${API_BASE}/players/${id}`, data, { headers: authHeader() });
    // Map _id to id for consistency
    const player = res.data;
    return {
        ...player,
        id: player._id || player.id,
    };
};
export const deletePlayer = async (id: string) => {
    const res = await axios.delete(`${API_BASE}/players/${id}`, { headers: authHeader() });
    return res.data;
};

// Auctions
export const fetchAuctions = async () => {
    const res = await axios.get(`${API_BASE}/auctions`);
    return res.data;
};
export const createAuction = async (data: any) => {
    const res = await axios.post(`${API_BASE}/auctions`, data, { headers: authHeader() });
    return res.data;
};
export const placeBid = async (auctionId: string, teamId: string, amount: number) => {
    const res = await axios.post(`${API_BASE}/auctions/bid`, { auctionId, teamId, amount }, { headers: authHeader() });
    return res.data;
};
export const completeAuction = async (auctionId: string, winnerId?: string, finalAmount?: number) => {
    const res = await axios.post(`${API_BASE}/auctions/complete`, { auctionId, winnerId, finalAmount }, { headers: authHeader() });
    return res.data;
};
export const updateAuction = async (id: string, data: any) => {
    const res = await axios.put(`${API_BASE}/auctions/${id}`, data, { headers: authHeader() });
    return res.data;
};
export const deleteAuction = async (id: string) => {
    const res = await axios.delete(`${API_BASE}/auctions/${id}`, { headers: authHeader() });
    return res.data;
};

export const resetAuctions = async (tournamentId: string) => {
    const res = await axios.post(`${API_BASE}/auctions/reset/${tournamentId}`, {}, { headers: authHeader() });
    return res.data;
};

export const markPlayerUnsold = async (playerId: string) => {
    const res = await axios.post(`${API_BASE}/players/markUnsold`, { playerId }, { headers: authHeader() });
    return res.data;
};

export const fetchPlayerById = async (id: string) => {
    const res = await axios.get(`${API_BASE}/players/${id}`);
    return res.data;
}; 