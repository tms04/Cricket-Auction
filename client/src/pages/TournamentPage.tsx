import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Gavel } from 'lucide-react';
import Confetti from 'react-confetti';

const TournamentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { tournaments, auctions, teams, players, socket, fetchTeams, fetchPlayers } = useApp();
    const [tab, setTab] = useState<'live' | 'sold' | 'available' | 'unsold' | 'teams'>('live');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showSoldAnimation, setShowSoldAnimation] = useState(false);
    const [showUnsoldAnimation, setShowUnsoldAnimation] = useState(false);
    const soldTimeoutRef = useRef<number | null>(null);
    const prevLiveAuctionRef = useRef<typeof liveAuction | null>(null);
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return <div className="p-6">Tournament not found.</div>;

    const tournamentAuctions = auctions.filter(a => a.tournamentId === id);
    const liveAuction = tournamentAuctions.find(a => a.status === 'active');
    const auctionHistory = tournamentAuctions.filter(a => a.status === 'sold' || a.status === 'unsold').sort((a, b) => new Date(b.endTime || '').getTime() - new Date(a.endTime || '').getTime());
    const tournamentTeams = teams.filter(t => t.tournamentId === id);
    const getPlayer = (playerId: string) => players.find(p => p.id === playerId);
    const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

    useEffect(() => {
        setLastUpdated(new Date());
    }, [liveAuction]);

    // Detect when liveAuction transitions from active to undefined (sold or unsold)
    useEffect(() => {
        const prev = prevLiveAuctionRef.current;
        if (prev && prev.status === 'active' && !liveAuction) {
            // New logic: check if there was a bid placed
            const hadBid = (prev.currentBid && prev.currentBid > 0) || prev.currentBidder;
            if (hadBid) {
                setShowSoldAnimation(true);
                if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
                soldTimeoutRef.current = window.setTimeout(() => setShowSoldAnimation(false), 2500);
            } else {
                setShowUnsoldAnimation(true);
                if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
                soldTimeoutRef.current = window.setTimeout(() => setShowUnsoldAnimation(false), 2500);
            }
        }
        if (liveAuction) {
            setShowSoldAnimation(false);
            setShowUnsoldAnimation(false);
        }
        prevLiveAuctionRef.current = liveAuction;
    }, [liveAuction]);

    useEffect(() => {
        return () => {
            if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('auctionUpdate', (data: any) => {
            // Auctions are managed by context, so no setAuctions here
        });
        return () => socket.off('auctionUpdate');
    }, [socket]);

    // Helper to get the player for the live auction (handles both playerId and player object)
    const getLiveAuctionPlayer = (auction: any) => {
        if (!auction) return null;
        if (auction.playerId) {
            return players.find(p => p.id === auction.playerId);
        } else if (auction.player && auction.player._id) {
            // Try to find in players, fallback to embedded object
            return players.find(p => p.id === auction.player._id) || auction.player;
        }
        return null;
    };
    // Helper to get the current bid (handles both currentBid and bidAmount)
    const getLiveAuctionBid = (auction: any) => auction?.currentBid ?? auction?.bidAmount ?? '';
    // Helper to get the current bidder (handles both currentBidder/team as string or object)
    const getLiveAuctionBidder = (auction: any) => {
        const bidder = auction?.currentBidder ?? auction?.team ?? '';
        if (typeof bidder === 'object' && bidder !== null) {
            return bidder._id || '';
        }
        return bidder;
    };

    // Helper to get card color classes based on primaryRole
    const getCardColor = (role: string) => {
        if (role === 'All-rounder') return 'from-yellow-300 via-yellow-100 to-yellow-400 border-yellow-400';
        if (role === 'Batsman') return 'from-gray-200 via-gray-100 to-gray-400 border-gray-400';
        if (role === 'Bowler') return 'from-amber-700 via-yellow-300 to-yellow-600 border-amber-700';
        return 'from-gray-100 via-gray-50 to-gray-200 border-gray-200';
    };

    // Fetch latest players and teams when switching to relevant tabs
    useEffect(() => {
        if (tab === 'sold' || tab === 'available' || tab === 'unsold' || tab === 'teams') {
            if (fetchPlayers) fetchPlayers();
            if (fetchTeams) fetchTeams();
        }
    }, [tab, fetchPlayers, fetchTeams]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-gradient-to-br from-[#0a1026] via-[#1a223f] to-[#232946]">
            {/* Floating decorative elements */}
            <div className="absolute left-[8%] top-[18%] animate-float-1 z-10">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 shadow-[0_0_40px_10px_rgba(255,215,0,0.15)] border-2 border-yellow-300/30"></div>
            </div>
            <div className="absolute right-[12%] top-[30%] animate-float-2 z-10">
                <div className="w-10 h-10 rounded-full bg-orange-400/20 shadow-[0_0_30px_8px_rgba(255,136,0,0.12)] border-2 border-orange-300/30"></div>
            </div>
            {/* Cricket Bat SVG */}
            <div className="absolute left-[3%] bottom-[12%] z-10 animate-bat-float opacity-80">
                <svg width="60" height="120" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="10" width="10" height="80" rx="5" fill="#eab308" stroke="#b45309" strokeWidth="3" />
                    <rect x="27" y="90" width="6" height="20" rx="3" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Ball SVG */}
            <div className="absolute right-[6%] bottom-[18%] z-10 animate-ball-bounce opacity-90">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="16" fill="#dc2626" stroke="#fff" strokeWidth="3" />
                    <path d="M10 15 Q20 25 30 15" stroke="#fff" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Stumps SVG */}
            <div className="absolute right-[14%] top-[10%] z-10 animate-stumps-float opacity-80">
                <svg width="48" height="70" viewBox="0 0 48 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="21" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="34" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="8" y="5" width="32" height="6" rx="3" fill="#a16207" />
                </svg>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-6xl mx-auto py-16 px-4 relative z-20">
                {/* Header */}
                <div className="flex items-center mb-10">
                    {tournament.logo ? (
                        <img src={tournament.logo} alt={tournament.name} className="w-20 h-20 object-cover rounded-full border-4 border-yellow-400/60 shadow-[0_0_40px_0_rgba(255,215,0,0.25)] mr-6" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-200 to-orange-200 flex items-center justify-center text-4xl font-extrabold text-yellow-700 border-4 border-yellow-400/60 mr-6">
                            {tournament.name[0]}
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-300 mb-2 drop-shadow-[0_2px_8px_rgba(255,215,0,0.25)]">{tournament.name}</h1>
                        <div className={`inline-block px-4 py-1 rounded-full text-base font-semibold mb-2 ${tournament.status === 'completed'
                            ? 'bg-gray-800/50 text-gray-200 border border-yellow-400/30'
                            : 'bg-gradient-to-r from-yellow-400/60 to-orange-400/60 text-yellow-900 border border-yellow-400/60 shadow'
                            }`}>
                            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-red-400/10 backdrop-blur-sm rounded-xl p-1 border-2 border-yellow-400/30 shadow">
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'live'
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)] animate-pulse-fast'
                                : 'text-yellow-200 hover:text-yellow-100'
                                }`}
                            onClick={() => setTab('live')}
                        >
                            Live Auction
                        </button>
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'sold'
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]'
                                : 'text-yellow-200 hover:text-yellow-100'
                                }`}
                            onClick={() => setTab('sold')}
                        >
                            Sold
                        </button>
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'available'
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]'
                                : 'text-yellow-200 hover:text-yellow-100'
                                }`}
                            onClick={() => setTab('available')}
                        >
                            Available
                        </button>
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'unsold'
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]'
                                : 'text-yellow-200 hover:text-yellow-100'
                                }`}
                            onClick={() => setTab('unsold')}
                        >
                            Unsold
                        </button>
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'teams'
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]'
                                : 'text-yellow-200 hover:text-yellow-100'
                                }`}
                            onClick={() => setTab('teams')}
                        >
                            Teams & Players
                        </button>
                    </div>
                </div>

                {/* Main Card Content with spotlight */}
                <div className="relative">
                    <div className="absolute -inset-8 z-0 pointer-events-none">
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-red-400/10 blur-2xl opacity-80"></div>
                    </div>
                    <div className="relative bg-gradient-to-br from-[#232946]/80 to-[#1a223f]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-10 border-4 border-yellow-400/60 ring-2 ring-yellow-300/30 ring-offset-2 z-10">
                        {tab === 'live' && (
                            <div className="relative">
                                <div className="text-xs text-gray-400 mb-2">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</div>
                                {liveAuction ? (
                                    <>
                                        <div className="flex justify-center">
                                            <div className={`relative bg-gradient-to-br rounded-[2.5rem] shadow-2xl border-4 w-full max-w-sm p-0 overflow-hidden ${getCardColor(getLiveAuctionPlayer(liveAuction)?.primaryRole)}`} style={{ minHeight: 480 }}>
                                                {/* Top Row: Role, Team Logo */}
                                                <div className="flex justify-between items-center px-6 pt-6">
                                                    <span className="bg-white/80 rounded-full px-3 py-1 text-xs font-bold text-yellow-800 shadow">{getLiveAuctionPlayer(liveAuction)?.primaryRole || '-'}</span>
                                                    <div className="flex items-center gap-2">
                                                        {getTeam(getLiveAuctionBidder(liveAuction))?.logo && (
                                                            <img src={getTeam(getLiveAuctionBidder(liveAuction))?.logo} alt="team" className="w-8 h-8 rounded-full border-2 border-white shadow" />
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Player Photo (no circle, no bg) */}
                                                <div className="flex justify-center mt-2">
                                                    {getLiveAuctionPlayer(liveAuction)?.photo ? (
                                                        <img
                                                            src={getLiveAuctionPlayer(liveAuction)?.photo}
                                                            alt={getLiveAuctionPlayer(liveAuction)?.name}
                                                            className="rounded-full object-cover w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 max-w-[40vw] max-h-[40vw] border-4 border-yellow-300 shadow-xl"
                                                            style={{ background: 'none', boxShadow: 'none' }}
                                                        />
                                                    ) : (
                                                        <div className="rounded-full flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 max-w-[40vw] max-h-[40vw] bg-yellow-400 text-6xl font-extrabold text-gray-400 border-4 border-yellow-300 shadow-xl">
                                                            {getLiveAuctionPlayer(liveAuction)?.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-center mt-4">
                                                    <h2 className="text-2xl font-extrabold text-gray-900">{getLiveAuctionPlayer(liveAuction)?.name || '-'}</h2>
                                                    <div className="text-lg font-bold text-yellow-900 mt-1">
                                                        <div><span className="font-bold ">Current Bid:</span> <span className="text-gray-900">₹{getLiveAuctionBid(liveAuction) ?? '-'}</span></div>
                                                        {/* <div>Base Price: ₹{getLiveAuctionPlayer(liveAuction)?.basePrice ?? '-'}</div> */}
                                                        <div><span className="font-bold ">Current Bidder:</span> <span className={`text-gray-900 font-bold ${getTeam(getLiveAuctionBidder(liveAuction)) ? 'border-2 border-yellow-400 rounded px-2 py-1 shadow animate-pulse-fast' : ''}`}>{getTeam(getLiveAuctionBidder(liveAuction))?.name || '-'}</span></div>
                                                    </div>
                                                </div>
                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-8 mt-4 text-sm">
                                                    {/* <div><span className="font-semibold text-gray-700">Current Bid:</span> <span className="text-gray-900">₹{getLiveAuctionBid(liveAuction) ?? '-'}</span></div> */}
                                                    <div>Base Price: ₹{getLiveAuctionPlayer(liveAuction)?.basePrice ?? '-'}</div>
                                                    {/* <div><span className="font-semibold text-gray-700">Current Bidder:</span> <span className={`text-gray-900 font-bold ${getTeam(getLiveAuctionBidder(liveAuction)) ? 'border-2 border-yellow-400 rounded px-2 py-1 shadow animate-pulse-fast' : ''}`}>{getTeam(getLiveAuctionBidder(liveAuction))?.name || '-'}</span></div> */}
                                                    <div><span className="font-semibold text-gray-700">Station:</span> <span className="text-gray-900">{getLiveAuctionPlayer(liveAuction)?.station || '-'}</span></div>
                                                    <div><span className="font-semibold text-gray-700">Previous Team:</span> <span className="text-gray-900">{getLiveAuctionPlayer(liveAuction)?.previousYearTeam || '-'}</span></div>
                                                    <div><span className="font-semibold text-gray-700">Age:</span> <span className="text-gray-900">{getLiveAuctionPlayer(liveAuction)?.age || '-'}</span></div>
                                                </div>
                                                {/* Stats Box */}
                                                <div className="absolute bottom-0 left-0 w-full bg-yellow-200/80 py-3 flex justify-around items-center border-t-2 border-yellow-400">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-yellow-900">{getLiveAuctionPlayer(liveAuction)?.battingStyle || '-'}</div>
                                                        <div className="text-xs text-yellow-800">BATTING STYLE</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-yellow-900">{getLiveAuctionPlayer(liveAuction)?.bowlingStyle || '-'}</div>
                                                        <div className="text-xs text-yellow-800">BOWLING STYLE</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Audience Reaction Row */}
                                        <div className="flex justify-center mt-6 gap-2 animate-fade-in-up">
                                            <span className="text-2xl animate-bounce">👏</span>
                                            <span className="text-2xl animate-pulse">😮</span>
                                            <span className="text-2xl animate-bounce">🎉</span>
                                            <span className="text-2xl animate-pulse">🔥</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-gray-500">No player on the auction table at the moment.</div>
                                )}
                                {/* SOLD Animation Overlay */}
                                {showSoldAnimation && (
                                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                        {/* Dimmed background */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500" style={{ opacity: showSoldAnimation ? 1 : 0 }}></div>
                                        {/* Animation overlay with fade-in/fade-out */}
                                        <div className={`relative transition-opacity duration-700 ${showSoldAnimation ? 'opacity-100 animate-fade-in-scale' : 'opacity-0'}`}
                                            style={{ pointerEvents: 'auto' }}>
                                            <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={250} recycle={false} />
                                            <div className="bg-white/90 rounded-[2.5rem] w-full max-w-sm h-[480px] flex flex-col items-center justify-center border-4 border-emerald-400 shadow-2xl relative">
                                                <Gavel className="w-16 h-16 text-yellow-500 mb-4 animate-gavel-slam" />
                                                <span className="text-6xl font-extrabold text-emerald-600 drop-shadow-lg animate-pulse">SOLD!</span>
                                                <span className="mt-4 text-2xl font-bold text-emerald-700 animate-fade-in">Player Sold</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* UNSOLD Animation Overlay */}
                                {showUnsoldAnimation && (
                                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                        {/* Dimmed background */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500" style={{ opacity: showUnsoldAnimation ? 1 : 0 }}></div>
                                        {/* Animation overlay with fade-in/fade-out */}
                                        <div className={`relative transition-opacity duration-700 ${showUnsoldAnimation ? 'opacity-100 animate-fade-in-scale' : 'opacity-0'}`}
                                            style={{ pointerEvents: 'auto' }}>
                                            <div className="bg-white/90 rounded-[2.5rem] w-full max-w-sm h-[480px] flex flex-col items-center justify-center border-4 border-red-400 shadow-2xl relative">
                                                <Gavel className="w-16 h-16 text-red-500 mb-4 animate-gavel-slam" />
                                                <span className="text-6xl font-extrabold text-red-600 drop-shadow-lg animate-pulse">UNSOLD!</span>
                                                <span className="mt-4 text-2xl font-bold text-red-700 animate-fade-in">Player Unsold</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'sold' && (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-yellow-400/40 shadow-lg p-8">
                                <h3 className="font-semibold text-2xl mb-4 text-yellow-200">Sold Players</h3>
                                <table className="w-full text-left rounded-xl overflow-hidden">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-yellow-400/80 to-orange-400/80 text-[#232946]">
                                            <th className="p-4 font-bold text-lg">Photo</th>
                                            <th className="p-4 font-bold text-lg">Player</th>
                                            <th className="p-4 font-bold text-lg">Price</th>
                                            <th className="p-4 font-bold text-lg">Team</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white/10 text-yellow-100">
                                        {players.filter(p => p.status === 'sold' && p.tournamentId === id).map(player => {
                                            const team = teams.find(t => t.id === player.team);
                                            return (
                                                <tr key={player.id || (player as any)._id} className="border-b border-yellow-400/20 hover:bg-yellow-400/10 transition">
                                                    <td className="p-4">
                                                        {player.photo ? (
                                                            <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <span className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-[#232946] font-bold text-lg">
                                                                {player.name[0]}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-medium">{player.name}</td>
                                                    <td className="p-4">₹{player.price ?? '-'}</td>
                                                    <td className="p-4">{team?.name || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {tab === 'available' && (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-yellow-400/40 shadow-lg p-8">
                                <h3 className="font-semibold text-2xl mb-4 text-yellow-200">Available Players</h3>
                                <table className="w-full text-left rounded-xl overflow-hidden">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-yellow-400/80 to-orange-400/80 text-[#232946]">
                                            <th className="p-4 font-bold text-lg">Photo</th>
                                            <th className="p-4 font-bold text-lg">Player</th>
                                            <th className="p-4 font-bold text-lg">Base Price</th>
                                            <th className="p-4 font-bold text-lg">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white/10 text-yellow-100">
                                        {players.filter(p => (p.status === 'available' || !p.status) && p.tournamentId === id).map(player => (
                                            <tr key={player.id || (player as any)._id} className="border-b border-yellow-400/20 hover:bg-yellow-400/10 transition">
                                                <td className="p-4">
                                                    {player.photo ? (
                                                        <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-[#232946] font-bold text-lg">
                                                            {player.name[0]}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-medium">{player.name}</td>
                                                <td className="p-4">₹{player.basePrice ?? '-'}</td>
                                                <td className="p-4">{player.category || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {tab === 'unsold' && (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-yellow-400/40 shadow-lg p-8">
                                <h3 className="font-semibold text-2xl mb-4 text-yellow-200">Unsold Players</h3>
                                <table className="w-full text-left rounded-xl overflow-hidden">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-yellow-400/80 to-orange-400/80 text-[#232946]">
                                            <th className="p-4 font-bold text-lg">Photo</th>
                                            <th className="p-4 font-bold text-lg">Player</th>
                                            <th className="p-4 font-bold text-lg">Base Price</th>
                                            <th className="p-4 font-bold text-lg">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white/10 text-yellow-100">
                                        {players.filter(p => p.status === 'unsold' && p.tournamentId === id).map(player => (
                                            <tr key={player.id || (player as any)._id} className="border-b border-yellow-400/20 hover:bg-yellow-400/10 transition">
                                                <td className="p-4">
                                                    {player.photo ? (
                                                        <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-[#232946] font-bold text-lg">
                                                            {player.name[0]}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-medium">{player.name}</td>
                                                <td className="p-4">₹{player.basePrice ?? '-'}</td>
                                                <td className="p-4">{player.category || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {tab === 'teams' && (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-yellow-400/40 shadow-lg p-8">
                                <h3 className="font-semibold text-2xl mb-4 text-yellow-200">Teams & Players</h3>
                                {tournamentTeams.length === 0 ? (
                                    <div className="text-gray-500">No teams found for this tournament.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {tournamentTeams.map(team => {
                                            const teamPlayers = players.filter(p => p.team === team.id);
                                            return (
                                                <div key={team.id} className="bg-[#232946]/80 rounded-2xl px-8 py-6 border-2 border-yellow-400/40 shadow-lg flex flex-col items-center">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-14 h-14 rounded bg-gray-200 flex items-center justify-center" style={{ backgroundColor: team.color }}>
                                                            {team.logo ? <img src={team.logo} alt="Logo" className="w-full h-full object-cover rounded" /> : <span className="text-white font-bold text-2xl">{team.name[0]}</span>}
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-2xl text-yellow-200">{team.name}</div>
                                                            <div className="text-sm text-gray-200 font-semibold">Owner: <span className="text-white font-bold">{team.owner}</span></div>
                                                            <div className="text-sm text-gray-300">Budget: <span className="text-yellow-100 font-semibold">₹{team.budget}</span></div>
                                                            <div className="text-sm text-gray-300">Remaining: <span className="text-yellow-100 font-semibold">₹{team.remainingBudget}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full">
                                                        <div className="font-bold text-base text-yellow-100 mb-2">Players:</div>
                                                        {teamPlayers.length === 0 ? (
                                                            <div className="text-sm text-gray-300">No players in this team.</div>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-4">
                                                                {teamPlayers.map(player => (
                                                                    <div key={player.id || (player as any)._id} className="flex flex-col items-center">
                                                                        {player.photo ? (
                                                                            <img src={player.photo} alt={player.name} className="w-12 h-12 rounded-full border-2 border-yellow-300 shadow object-cover mb-1" />
                                                                        ) : (
                                                                            <span className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-[#232946] font-bold text-lg border-2 border-yellow-300 shadow mb-1">{player.name[0]}</span>
                                                                        )}
                                                                        <span className="text-yellow-100 font-semibold text-sm text-center">{player.name}</span>
                                                                        {player.price && (
                                                                            <span className="text-emerald-400 font-bold text-xs">₹{player.price}</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-auto text-center opacity-80 text-white text-base z-10 pb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="relative">
                            <svg className="w-5 h-5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                            </svg>
                        </div>
                        <span>&copy; {new Date().getFullYear()} Cricket Auction Championship. All rights reserved.</span>
                    </div>
                    <p className="text-sm text-gray-300">Experience the ultimate cricket auction platform</p>
                </footer>

                {/* Animations */}
                <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(40px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes float-1 {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(30px) scale(1.1); }
                }
                @keyframes float-2 {
                    0% { transform: translateY(0) scale(1); }
                    100% { transform: translateY(-25px) scale(1.15); }
                }
                .animate-float-1 { animation: float-1 7s ease-in-out infinite alternate; }
                .animate-float-2 { animation: float-2 9s ease-in-out infinite alternate; }
                .animate-pulse-fast { animation: pulse 1.2s cubic-bezier(0.4,0,0.6,1) infinite; }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(255,215,0,0.15); }
                }
                .animate-gavel-slam {
                    animation: gavel-slam 0.5s cubic-bezier(0.7,0.1,0.3,1.5);
                }
                @keyframes gavel-slam {
                    0% { transform: rotate(-45deg) scale(0.7) translateY(-40px); opacity: 0; }
                    60% { transform: rotate(0deg) scale(1.2) translateY(10px); opacity: 1; }
                    100% { transform: rotate(0deg) scale(1) translateY(0); opacity: 1; }
                }
                .animate-bat-float { animation: float-bat 8s ease-in-out infinite alternate; }
                @keyframes float-bat {
                    0% { transform: rotate(-10deg) translateY(0); }
                    100% { transform: rotate(10deg) translateY(18px); }
                }
                .animate-ball-bounce { animation: bounce-ball 3s cubic-bezier(0.4,0,0.6,1) infinite alternate; }
                @keyframes bounce-ball {
                    0% { transform: translateY(0) scale(1); }
                    60% { transform: translateY(-18px) scale(1.1); }
                    100% { transform: translateY(0) scale(1); }
                }
                .animate-stumps-float { animation: float-stumps 10s ease-in-out infinite alternate; }
                @keyframes float-stumps {
                    0% { transform: translateY(0) scale(1); }
                    100% { transform: translateY(22px) scale(1.05); }
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.7s cubic-bezier(0.4,0,0.2,1);
                }
                @keyframes fade-in-scale {
                    0% { opacity: 0; transform: scale(0.85); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
            </div>
        </div>
    );
};

const CricketFieldTeams: React.FC<{ teams: any[]; players: any[] }> = ({ teams, players }) => {
    const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
    const team = teams[selectedTeamIdx];
    const teamPlayers = players.filter(p => p.team === team.id);
    // Arrange players in a circle
    const fieldRadius = 120;
    const centerX = 180;
    const centerY = 140;
    const avatarRadius = 28;
    return (
        <div className="flex flex-col items-center">
            {/* Team Switcher */}
            {teams.length > 1 && (
                <div className="mb-4 flex gap-2">
                    {teams.map((t, idx) => (
                        <button key={t.id} onClick={() => setSelectedTeamIdx(idx)}
                            className={`px-4 py-2 rounded-full font-bold text-sm ${idx === selectedTeamIdx ? 'bg-yellow-400 text-[#232946]' : 'bg-gray-700 text-yellow-100'}`}>{t.name}</button>
                    ))}
                </div>
            )}
            {/* Cricket Field SVG */}
            <div className="relative" style={{ width: 360, height: 280 }}>
                <svg width={360} height={280} viewBox="0 0 360 280">
                    {/* Field oval */}
                    <ellipse cx={centerX} cy={centerY} rx={fieldRadius + 30} ry={fieldRadius} fill="#14532d" fillOpacity="0.85" stroke="#facc15" strokeWidth="4" />
                    {/* Pitch */}
                    <rect x={centerX - 18} y={centerY - 60} width={36} height={120} rx={10} fill="#fef08a" fillOpacity="0.95" stroke="#b45309" strokeWidth="2" />
                </svg>
                {/* Player Avatars in a circle */}
                {teamPlayers.length > 0 && teamPlayers.map((player, idx) => {
                    const angle = (2 * Math.PI * idx) / teamPlayers.length - Math.PI / 2;
                    const x = centerX + (fieldRadius - 20) * Math.cos(angle) - avatarRadius / 2;
                    const y = centerY + (fieldRadius - 20) * Math.sin(angle) - avatarRadius / 2;
                    return (
                        <div key={player.id || (player as any)._id} style={{ position: 'absolute', left: x, top: y, width: avatarRadius, height: avatarRadius }}>
                            {player.photo ? (
                                <img src={player.photo} alt={player.name} className="w-full h-full rounded-full border-2 border-yellow-300 shadow-lg object-cover" />
                            ) : (
                                <span className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center text-[#232946] font-bold text-lg border-2 border-yellow-300 shadow-lg">{player.name[0]}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Team Card (Dugout) */}
            <div className="mt-6 bg-[#232946]/80 rounded-xl px-8 py-4 border-2 border-yellow-400/40 shadow-lg flex flex-col items-center max-w-md">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center" style={{ backgroundColor: team.color }}>
                        {team.logo ? <img src={team.logo} alt="Logo" className="w-full h-full object-cover rounded" /> : <span className="text-white font-bold text-2xl">{team.name[0]}</span>}
                    </div>
                    <div className="font-extrabold text-xl text-yellow-200">{team.name}</div>
                </div>
                <div className="text-sm text-gray-200 font-semibold">Owner: <span className="text-white font-bold">{team.owner}</span></div>
                <div className="text-sm text-gray-300">Budget: <span className="text-yellow-100 font-semibold">₹{team.budget}</span></div>
                <div className="text-sm text-gray-300">Remaining: <span className="text-yellow-100 font-semibold">₹{team.remainingBudget}</span></div>
            </div>
        </div>
    );
};

export default TournamentPage; 