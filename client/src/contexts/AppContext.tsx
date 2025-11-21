import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppContextType, Tournament, Team, Player, AuctionItem } from '../types';
import * as api from '../api';
import { useAuth } from './AuthContext';
import { fetchPlayers as fetchPlayersApi, fetchTeams as fetchTeamsApi } from '../api';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const { user, authLoading } = useAuth();

  // Add debug logs before the myTournament memo
  console.log('User:', user);
  console.log('Tournaments:', tournaments);

  // Find the auctioneer's tournament
  const myTournament = React.useMemo(() => {
    if (!user || user.role !== 'auctioneer') return null;
    const found = tournaments.find(
      (t) => t.auctioneerEmail && user.email && t.auctioneerEmail.toLowerCase() === user.email.toLowerCase()
    ) || null;
    console.log('myTournament:', found);
    return found;
  }, [user, tournaments]);

  // Fetch all data from backend on mount or when user id changes
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        // Always fetch tournaments for everyone
        const tournamentsData = await api.fetchTournaments();
        const normalizedTournaments = tournamentsData.map((t) => ({
          ...t,
          maxTeams: Number(t.maxTeams),
          budget: Number(t.budget),
          status: t.status || 'upcoming'
        }));
        setTournaments(normalizedTournaments);

        const resolvedTournamentId = (() => {
          if (!user || user.role !== 'auctioneer' || !user.email) return undefined;
          const foundTournament = normalizedTournaments.find(
            (t) => t.auctioneerEmail && t.auctioneerEmail.toLowerCase() === user.email?.toLowerCase()
          );
          return foundTournament?.id;
        })();

        // Only fetch teams, players, and auctions if user is present
        if (user && user.id && !cancelled) {
          if (user.role === 'auctioneer' && !resolvedTournamentId && !myTournament?.id) {
            setTeams([]);
            setPlayers([]);
            setAuctions([]);
            return;
          }
          const tournamentScopeId = user.role === 'auctioneer'
            ? (myTournament?.id || resolvedTournamentId)
            : undefined;
          const [teamsData, playersData, auctionsData] = await Promise.all([
            fetchTeamsApi(1, 20, tournamentScopeId),
            fetchPlayersApi(1, 50, tournamentScopeId),
            api.fetchAuctions()
          ]);
          setTeams(teamsData.teams);
          setPlayers(playersData.players);
          setAuctions(auctionsData.map((a) => ({
            ...a,
            currentBidder: typeof a.currentBidder === 'object' && a.currentBidder !== null
              ? (a.currentBidder as { _id?: string; id?: string })._id || (a.currentBidder as { id?: string }).id || undefined
              : (a.currentBidder === null ? undefined : a.currentBidder)
          })));
        } else if (!user && !cancelled) {
          setTeams([]);
          setPlayers([]);
          setAuctions([]);
        }
      } catch (err) {
        // Do not clear tournaments on error, just log
        console.error('Failed to fetch tournaments or related data', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [user, authLoading, myTournament?.id]);

  // Cleanup tournaments ONLY on logout
  useEffect(() => {
    if (!user && !authLoading) {
      setTournaments([]);
      setTeams([]);
      setPlayers([]);
      setAuctions([]);
    }
  }, [user, authLoading]);

  const refreshTeamsState = async () => {
    const tournamentScopeId = user?.role === 'auctioneer' ? myTournament?.id : undefined;
    if (user?.role === 'auctioneer' && !tournamentScopeId) {
      setTeams([]);
      return;
    }
    const teamsResponse = await fetchTeamsApi(1, 20, tournamentScopeId);
    setTeams(teamsResponse.teams);
  };

  const refreshPlayersState = async () => {
    const tournamentScopeId = user?.role === 'auctioneer' ? myTournament?.id : undefined;
    if (user?.role === 'auctioneer' && !tournamentScopeId) {
      setPlayers([]);
      return;
    }
    const playersResponse = await fetchPlayersApi(1, 50, tournamentScopeId);
    setPlayers(playersResponse.players);
  };

  const refreshAuctionsState = async () => {
    const auctionsData = await api.fetchAuctions();
    setAuctions(auctionsData.map((a) => ({
      ...a,
      currentBidder: typeof a.currentBidder === 'object' && a.currentBidder !== null
        ? (a.currentBidder as { _id?: string; id?: string })._id || (a.currentBidder as { id?: string }).id || undefined
        : (a.currentBidder === null ? undefined : a.currentBidder)
    })));
  };

  // Backend CRUD operations
  const addTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt'>) => {
    const newTournament = await api.createTournament(tournament);
    const tournamentsData = await api.fetchTournaments();
    setTournaments(
      tournamentsData.map((t) => ({
        ...t,
        maxTeams: Number(t.maxTeams),
        budget: Number(t.budget),
        status: t.status || 'upcoming'
      }))
    );
    return {
      ...newTournament,
      maxTeams: Number(newTournament.maxTeams),
      budget: Number(newTournament.budget),
      status: newTournament.status || 'upcoming'
    };
  };
  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    const updated = await api.updateTournament(id, updates);
    setTournaments(prev => prev.map(t => (
      t.id === id
        ? {
          ...updated,
          maxTeams: Number(updated.maxTeams),
          budget: Number(updated.budget),
          status: updated.status || 'upcoming'
        }
        : t
    )));
  };
  const deleteTournament = async (id: string) => {
    await api.deleteTournament(id);
    setTournaments(prev => prev.filter(t => t.id !== id));
    setTeams(prev => prev.filter(t => t.tournamentId !== id));
    setPlayers(prev => prev.filter(p => p.tournamentId !== id));
  };

  const addTeam = async (team: Omit<Team, 'id'>) => {
    const newTeam = await api.createTeam(team);
    await refreshTeamsState();
    return newTeam;
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    const updated = await api.updateTeam(id, updates);
    setTeams(prev => prev.map(t => t.id === id ? updated : t));
  };

  const deleteTeam = async (id: string) => {
    await api.deleteTeam(id);
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const addPlayer = async (player: Omit<Player, 'id'>) => {
    console.log('AppContext - Creating player with data:', player);
    console.log('AppContext - Photo URL being sent:', player.photo);
    const newPlayer = await api.createPlayer(player);
    console.log('AppContext - Player created, response:', newPlayer);
    console.log('AppContext - Photo URL in response:', newPlayer.photo);
    await refreshPlayersState();
    return newPlayer;
  };
  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    await api.updatePlayer(id, updates);
    await refreshPlayersState();
  };
  const deletePlayer = async (id: string, tournamentId?: string) => {
    await api.deletePlayer(id, tournamentId);
    await refreshPlayersState();
  };

  // Auctions
  const startAuction = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    let tournamentId = null;
    if (user && user.role === 'auctioneer' && myTournament) {
      tournamentId = myTournament.id;
    }
    if (!player || !tournamentId) {
      return null;
    }

    const auctionData = {
      player: player.playerId || playerId,
      team: null,
      bidAmount: player.basePrice || 1000000, // Use basePrice or default to 10L
      status: 'active' as const,
      tournamentId
    };

    try {
      const newAuction = await api.createAuction(auctionData);
      setAuctions(prev => [...prev, newAuction]);
      return newAuction;
    } catch {
      return null;
    }
  };

  const placeBid = async (auctionId: string, teamId: string, amount: number) => {
    try {
      const updatedAuction = await api.placeBid(auctionId, teamId, amount);
      setAuctions(prev =>
        prev.map(a => a.id === updatedAuction.id ? updatedAuction : a)
      );
      return true;
    } catch {
      return false;
    }
  };

  const completeAuction = async (auctionId: string, winnerId?: string, finalAmount?: number) => {
    try {
      await api.completeAuction(auctionId, winnerId, finalAmount);
      await Promise.all([refreshPlayersState(), refreshTeamsState()]);
      return true;
    } catch {
      return false;
    }
  };

  const resetPlayerStatuses = async () => {
    if (!myTournament?.id) return;
    try {
      await api.resetAuctions(myTournament.id);
      await Promise.all([
        refreshPlayersState(),
        refreshTeamsState(),
        refreshAuctionsState()
      ]);
    } catch {
      // Silently fail - error handling is done at API level
    }
  };

  // Fetch teams and players for manual refresh
  const fetchTeams = async () => {
    await refreshTeamsState();
  };
  const fetchPlayers = async () => {
    await refreshPlayersState();
  };

  // Fetch auctions for polling (public)
  const fetchAuctions = async () => {
    await refreshAuctionsState();
  };

  // Only show loading spinner for authenticated users
  if (user && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading auction system...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      tournaments,
      teams,
      players,
      auctions,
      myTournament,
      activeTournament,
      setActiveTournament,
      isLoading,
      addTournament,
      addTeam,
      addPlayer,
      updatePlayer,
      updateTeam,
      updateTournament,
      deleteTournament,
      deleteTeam,
      deletePlayer,
      startAuction,
      placeBid,
      completeAuction,
      resetPlayerStatuses,
      fetchTeams,
      fetchPlayers,
      fetchAuctions
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};