import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppContextType, Tournament, Team, Player, AuctionItem } from '../types';
import * as api from '../api';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const { user } = useAuth();

  // Find the auctioneer's tournament
  const myTournament = React.useMemo(() => {
    if (!user || user.role !== 'auctioneer') return null;
    return tournaments.find(
      (t) => t.auctioneerEmail && user.email && t.auctioneerEmail.toLowerCase() === user.email.toLowerCase()
    ) || null;
  }, [user, tournaments]);

  // Fetch all data from backend on mount
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        // Always fetch tournaments for everyone
        const tournamentsData = await api.fetchTournaments();
        if (!Array.isArray(tournamentsData)) {
          setTournaments([]);
        } else {
          const mappedTournaments = tournamentsData.map((t: any) => ({
            ...t,
            id: t._id,
            maxTeams: Number(t.maxTeams),
            budget: Number(t.budget),
            status: t.status || 'upcoming'
          }));
          setTournaments(mappedTournaments);
        }

        // Only fetch teams, players, and auctions if user is present
        if (user) {
          const [teamsData, playersData, auctionsData] = await Promise.all([
            api.fetchTeams(),
            api.fetchPlayers(),
            api.fetchAuctions()
          ]);
          setTeams(teamsData.map((t: any) => ({
            ...t,
            id: t._id || t.id
          })));
          setPlayers(playersData.map((p: any) => ({
            ...p,
            id: p._id || p.id
          })));
          setAuctions(auctionsData.map((a: any) => ({
            ...a,
            id: a._id || a.id,
            currentBidder: typeof a.currentBidder === 'object' && a.currentBidder !== null
              ? a.currentBidder._id || a.currentBidder.id
              : a.currentBidder
          })));
        } else {
          setTeams([]);
          setPlayers([]);
          setAuctions([]);
        }
      } catch (err) {
        setTournaments([]);
        setTeams([]);
        setPlayers([]);
        setAuctions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);
    s.on('auctionUpdate', (data) => setAuctions(data.map((a: any) => ({
      ...a,
      id: a._id || a.id,
      currentBidder: typeof a.currentBidder === 'object' && a.currentBidder !== null
        ? a.currentBidder._id || a.currentBidder.id
        : a.currentBidder
    }))));
    s.on('playerUpdate', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setPlayers(data.map((p: any) => ({
          ...p,
          id: p._id || p.id
        })));
      } else {
        setPlayers([]);
      }
    });
    s.on('teamUpdate', (data) => setTeams(data.map((t: any) => ({
      ...t,
      id: t._id || t.id
    }))));
    s.on('tournamentUpdate', (data) => setTournaments(data.map((t: any) => ({
      ...t,
      id: t._id,
      maxTeams: Number(t.maxTeams),
      budget: Number(t.budget),
      status: t.status || 'upcoming'
    }))));
    return () => { s.disconnect(); };
  }, []);

  // Backend CRUD operations
  const addTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt'>) => {
    const newTournament = await api.createTournament(tournament);
    const tournamentsData = await api.fetchTournaments();
    setTournaments(tournamentsData.map((t: any) => ({
      ...t,
      id: t._id,
      maxTeams: Number(t.maxTeams),
      budget: Number(t.budget),
      status: t.status || 'upcoming'
    })));
    return {
      ...newTournament,
      id: newTournament._id,
      maxTeams: Number(newTournament.maxTeams),
      budget: Number(newTournament.budget),
      status: newTournament.status || 'upcoming'
    };
  };
  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    const updated = await api.updateTournament(id, updates);
    setTournaments(prev => prev.map(t => t.id === id ? {
      ...updated,
      id: updated._id,
      maxTeams: Number(updated.maxTeams),
      budget: Number(updated.budget),
      status: updated.status || 'upcoming'
    } : t));
  };
  const deleteTournament = async (id: string) => {
    await api.deleteTournament(id);
    setTournaments(prev => prev.filter(t => t.id !== id));
    setTeams(prev => prev.filter(t => t.tournamentId !== id));
    setPlayers(prev => prev.filter(p => p.tournamentId !== id));
  };

  const addTeam = async (team: Omit<Team, 'id'>) => {
    const newTeam = await api.createTeam(team);
    const teamsData = await api.fetchTeams();
    setTeams(teamsData.map((t: any) => ({
      ...t,
      id: t._id || t.id
    })));
    const mappedTeam = { ...newTeam, id: newTeam._id || newTeam.id };
    return mappedTeam;
  };
  const updateTeam = async (id: string, updates: Partial<Team>) => {
    const updated = await api.updateTeam(id, updates);
    const mappedTeam = { ...updated, id: updated._id || updated.id };
    setTeams(prev => prev.map(t => t.id === id ? mappedTeam : t));
  };
  const deleteTeam = async (id: string) => {
    await api.deleteTeam(id);
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const addPlayer = async (player: Omit<Player, 'id'>) => {
    const newPlayer = await api.createPlayer(player);
    // Refetch the full list to ensure state is in sync with backend
    const playersData = await api.fetchPlayers();
    setPlayers(playersData.map((p: any) => ({
      ...p,
      id: p._id || p.id
    })));
    const mappedPlayer = { ...newPlayer, id: newPlayer._id || newPlayer.id };
    return mappedPlayer;
  };
  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    await api.updatePlayer(id, updates);
    // Refetch the full list to ensure state is in sync with backend
    const playersData = await api.fetchPlayers();
    setPlayers(playersData.map((p: any) => ({
      ...p,
      id: p._id || p.id
    })));
  };
  const deletePlayer = async (id: string) => {
    await api.deletePlayer(id);
    // Refetch the full list to ensure state is in sync with backend
    const playersData = await api.fetchPlayers();
    setPlayers(playersData.map((p: any) => ({
      ...p,
      id: p._id || p.id
    })));
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

    // Map the data properly for MongoDB - use original _id values
    const auctionData = {
      player: (player as any)._id || playerId, // Use original MongoDB _id
      team: null,
      bidAmount: player.basePrice || 1000000, // Use basePrice or default to 10L
      status: 'active',
      tournamentId: (myTournament as any)._id || tournamentId // Use original MongoDB _id
    };

    try {
      const newAuction = await api.createAuction(auctionData);
      const normalizedAuction = {
        ...newAuction,
        id: newAuction._id || newAuction.id,
        playerId: newAuction.playerId || newAuction.player || (newAuction.player && newAuction.player._id) || undefined,
      };
      setAuctions(prev => [...prev, normalizedAuction]);
      return normalizedAuction;
    } catch (error) {
      return null;
    }
  };
  const updateAuction = async (id: string, updates: Partial<AuctionItem>) => {
    const updated = await api.updateAuction(id, updates);
    setAuctions(prev => prev.map(a => a.id === id ? { ...updated, id: updated._id || updated.id } : a));
  };
  const deleteAuction = async (id: string) => {
    await api.deleteAuction(id);
    setAuctions(prev => prev.filter(a => a.id !== id));
  };

  const placeBid = async (auctionId: string, teamId: string, amount: number) => {
    try {
      const updatedAuction = await api.placeBid(auctionId, teamId, amount);
      // Normalize the updated auction
      const normalizedAuction = {
        ...updatedAuction,
        id: updatedAuction._id || updatedAuction.id,
        playerId: updatedAuction.playerId || updatedAuction.player || (updatedAuction.player && updatedAuction.player._id) || undefined,
      };
      setAuctions(prev =>
        prev.map(a => a.id === normalizedAuction.id ? normalizedAuction : a)
      );
      return true;
    } catch (error) {
      return false;
    }
  };

  const completeAuction = async (auctionId: string, winnerId?: string, finalAmount?: number) => {
    try {
      const completedAuction = await api.completeAuction(auctionId, winnerId, finalAmount);
      // Always refetch players and teams after auction completion to ensure up-to-date state
      const [playersData, teamsData] = await Promise.all([
        api.fetchPlayers(),
        api.fetchTeams()
      ]);
      setPlayers(playersData.map((p: any) => ({ ...p, id: p._id || p.id })));
      setTeams(teamsData.map((t: any) => ({ ...t, id: t._id || t.id })));
      return true;
    } catch (error) {
      return false;
    }
  };

  const resetPlayerStatuses = async () => {
    if (!myTournament?.id) return;
    try {
      await api.resetAuctions(myTournament.id);
      // Refetch all data to update state
      const [playersData, teamsData, auctionsData] = await Promise.all([
        api.fetchPlayers(),
        api.fetchTeams(),
        api.fetchAuctions()
      ]);
      setPlayers(playersData.map((p: any) => ({ ...p, id: p._id || p.id })));
      setTeams(teamsData.map((t: any) => ({ ...t, id: t._id || t.id })));
      setAuctions(auctionsData.map((a: any) => ({
        ...a,
        id: a._id || a.id,
        currentBidder: typeof a.currentBidder === 'object' && a.currentBidder !== null
          ? a.currentBidder._id || a.currentBidder.id
          : a.currentBidder
      })));
    } catch (error) {
    }
  };

  // Fetch teams and players for manual refresh
  const fetchTeams = async () => {
    const teamsData = await api.fetchTeams();
    setTeams(teamsData.map((t: any) => ({ ...t, id: t._id || t.id })));
  };
  const fetchPlayers = async () => {
    const playersData = await api.fetchPlayers();
    setPlayers(playersData.map((p: any) => ({ ...p, id: p._id || p.id })));
  };

  if (isLoading) {
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
      fetchPlayers
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