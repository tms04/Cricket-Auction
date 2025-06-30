import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppContextType, Tournament, Team, Player, AuctionItem } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('cricket_auction_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        setTournaments(data.tournaments || []);
        setTeams(data.teams || []);
        setPlayers(data.players || []);
        setAuctions(data.auctions || []);
        
        // Restore active tournament
        if (data.activeTournament) {
          setActiveTournament(data.activeTournament);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    if (!isLoading) {
      try {
        const data = {
          tournaments,
          teams,
          players,
          auctions,
          activeTournament
        };
        localStorage.setItem('cricket_auction_data', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }
  }, [tournaments, teams, players, auctions, activeTournament, isLoading]);

  const addTournament = (tournament: Omit<Tournament, 'id' | 'createdAt'>) => {
    const newTournament: Tournament = {
      ...tournament,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setTournaments(prev => {
      const updated = [...prev, newTournament];
      return updated;
    });
    return newTournament;
  };

  const addTeam = (team: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...team,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setTeams(prev => {
      const updated = [...prev, newTeam];
      return updated;
    });
    return newTeam;
  };

  const addPlayer = (player: Omit<Player, 'id'>) => {
    const newPlayer: Player = {
      ...player,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setPlayers(prev => {
      const updated = [...prev, newPlayer];
      return updated;
    });
    return newPlayer;
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(prev => {
      const updated = prev.map(player => 
        player.id === id ? { ...player, ...updates } : player
      );
      return updated;
    });
  };

  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams(prev => {
      const updated = prev.map(team => 
        team.id === id ? { ...team, ...updates } : team
      );
      return updated;
    });
  };

  const updateTournament = (id: string, updates: Partial<Tournament>) => {
    setTournaments(prev => {
      const updated = prev.map(tournament => 
        tournament.id === id ? { ...tournament, ...updates } : tournament
      );
      return updated;
    });
  };

  const deleteTournament = (id: string) => {
    setTournaments(prev => prev.filter(t => t.id !== id));
    // Also remove associated teams and players
    setTeams(prev => prev.filter(t => t.tournamentId !== id));
    setPlayers(prev => prev.filter(p => p.tournamentId !== id));
    // Clear active tournament if it's being deleted
    if (activeTournament?.id === id) {
      setActiveTournament(null);
    }
  };

  const deleteTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const startAuction = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !activeTournament) return null;

    // End any existing active auctions
    setAuctions(prev => prev.map(auction => 
      auction.status === 'active' 
        ? { ...auction, status: 'unsold', endTime: new Date().toISOString() }
        : auction
    ));

    const newAuction: AuctionItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      playerId,
      tournamentId: activeTournament.id,
      currentBid: player.basePrice,
      status: 'active',
      bids: [],
      startTime: new Date().toISOString()
    };
    
    setAuctions(prev => {
      const updated = [...prev, newAuction];
      return updated;
    });
    
    return newAuction;
  };

  const placeBid = (auctionId: string, teamId: string, amount: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || team.remainingBudget < amount) {
      return false;
    }

    setAuctions(prev => {
      const updated = prev.map(auction => {
        if (auction.id === auctionId && auction.status === 'active') {
          const newBid = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            teamId,
            amount,
            timestamp: new Date().toISOString()
          };
          return {
            ...auction,
            currentBid: amount,
            currentBidder: teamId,
            bids: [...auction.bids, newBid]
          };
        }
        return auction;
      });
      return updated;
    });
    
    return true;
  };

  const completeAuction = (auctionId: string, winnerId?: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return false;

    setAuctions(prev => {
      const updated = prev.map(a => 
        a.id === auctionId 
          ? { ...a, status: winnerId ? 'sold' : 'unsold', endTime: new Date().toISOString() }
          : a
      );
      return updated;
    });

    if (winnerId && auction.currentBidder) {
      // Update player status
      updatePlayer(auction.playerId, {
        status: 'sold',
        soldTo: winnerId,
        soldPrice: auction.currentBid
      });

      // Update team budget and players
      const team = teams.find(t => t.id === winnerId);
      if (team) {
        updateTeam(winnerId, {
          remainingBudget: team.remainingBudget - auction.currentBid,
          players: [...team.players, auction.playerId]
        });
      }
    } else {
      updatePlayer(auction.playerId, { status: 'unsold' });
    }
    
    return true;
  };

  const resetPlayerStatuses = () => {
    if (!activeTournament) return;
    
    setPlayers(prev => prev.map(player => 
      player.tournamentId === activeTournament.id ? {
        ...player,
        status: 'available',
        soldTo: undefined,
        soldPrice: undefined
      } : player
    ));
    
    setTeams(prev => prev.map(team => 
      team.tournamentId === activeTournament.id ? {
        ...team,
        players: [],
        remainingBudget: team.budget
      } : team
    ));
    
    setAuctions(prev => prev.filter(a => a.tournamentId !== activeTournament.id));
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
      activeTournament,
      setActiveTournament,
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
      resetPlayerStatuses
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