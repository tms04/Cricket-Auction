import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Gavel, Menu, X } from 'lucide-react'; // Added Menu and X icons for mobile nav
import Confetti from 'react-confetti';
import * as api from '../api';

interface TournamentMinimal {
    id: string;
    name: string;
    status: string;
    logo?: string;
}

const TournamentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<TournamentMinimal | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'live' | 'sold' | 'available' | 'unsold' | 'teams'>('live');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showSoldAnimation, setShowSoldAnimation] = useState(false);
    const [showUnsoldAnimation, setShowUnsoldAnimation] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const soldTimeoutRef = useRef<number | null>(null);
    const prevLiveAuctionRef = useRef<any | null>(null);
    const [liveAuction, setLiveAuction] = useState<any>(null);
    const [prevAuction, setPrevAuction] = useState<any>(null);
    const [hadBid, setHadBid] = useState(false);
    const [liveAuctionPlayer, setLiveAuctionPlayer] = useState<any>(null);
    const [currentBidderTeam, setCurrentBidderTeam] = useState<string | null>(null);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // --- State for player tabs ---
    const [tabPlayers, setTabPlayers] = useState<any[]>([]);
    const [tabPlayersLoading, setTabPlayersLoading] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [teamPlayers, setTeamPlayers] = useState<{ [teamId: string]: any[] }>({});
    const [teamPlayersLoading, setTeamPlayersLoading] = useState<{ [teamId: string]: boolean }>({});

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`${API_BASE}/api/tournaments/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setTournament({
                        id: data._id || data.id,
                        name: data.name,
                        status: data.status,
                        logo: data.logo || data.photo || undefined,
                    });
                } else {
                    setTournament(null);
                }
            })
            .catch(() => setTournament(null))
            .finally(() => setLoading(false));
    }, [id, API_BASE]);

    useEffect(() => {
        console.log('[Polling Effect] Running. tab:', tab);
        let interval: any;
        const fetchCurrentAuction = async () => {
            console.log('[Polling] fetchCurrentAuction called');
            try {
                const res = await fetch(`${API_BASE}/api/auctions/current?tournamentId=${id}`);
                const data = await res.json();
                console.log('[Polling] Fetched live auction:', data); // Log every 2 seconds
                // Detect status change for animation
                if (prevAuction && prevAuction.status === 'active' && (!data || data.status !== 'active')) {
                    if (hadBid) setShowSoldAnimation(true);
                    else setShowUnsoldAnimation(true);
                    setTimeout(() => {
                        setShowSoldAnimation(false);
                        setShowUnsoldAnimation(false);
                    }, 2500);
                    setHadBid(false);
                }
                // Track if there was at least one bid
                if (data && data.status === 'active' && (data.currentBid > 0 || data.bidAmount > 0 || data.currentBidder)) {
                    setHadBid(true);
                }
                setPrevAuction(data);
                setLiveAuction(data);
            } catch (err) {
                console.error('[Polling] Error fetching live auction:', err);
                setLiveAuction(null);
            }
        };
        if (tab === 'live') {
            fetchCurrentAuction(); // Fetch immediately on tab switch
            interval = setInterval(fetchCurrentAuction, 2000); // Continue polling every 2 seconds
        } else {
            setLiveAuction(null);
        }
        return () => interval && clearInterval(interval);
    }, [tab, id, prevAuction, hadBid, API_BASE]);

    useEffect(() => {
        setLastUpdated(new Date());
    }, [liveAuction]);

    useEffect(() => {
        let playerId = liveAuction?.playerId || liveAuction?.player;
        console.log('Raw playerId:', playerId, typeof playerId, playerId && typeof playerId === 'object' ? Object.keys(playerId) : '');
        if (playerId && typeof playerId === 'object') {
            console.log('playerId object keys/values:', playerId, Object.entries(playerId));
            playerId = playerId._id || playerId.id || Object.values(playerId).find(v => typeof v === 'string') || '';
        }
        console.log('Extracted playerId:', playerId);
        if (typeof playerId === 'string' && playerId && playerId !== '[object Object]') {
            api.fetchPlayerById(playerId).then(player => {
                setLiveAuctionPlayer(player);
            }).catch(err => {
                setLiveAuctionPlayer(null);
            });
        } else {
            setLiveAuctionPlayer(null);
        }
    }, [liveAuction]);

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
        if (liveAuction?.currentBidder) {
            fetch(`${API_BASE}/api/teams/${liveAuction.currentBidder}`)
                .then(res => res.json())
                .then(team => setCurrentBidderTeam(team.name))
                .catch(() => setCurrentBidderTeam(null));
        } else {
            setCurrentBidderTeam(null);
        }
    }, [liveAuction?.currentBidder, API_BASE]);

    useEffect(() => {
        return () => {
            if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
        };
    }, []);

    // --- Fetch players for Available/Sold/Unsold tabs ---
    useEffect(() => {
        if (tab === 'available' || tab === 'sold' || tab === 'unsold') {
            setTabPlayersLoading(true);
            let status = tab;
            // API expects 'available', 'sold', 'unsold'
            fetch(`${API_BASE}/api/players?status=${status}&tournamentId=${tournament?.id}`)
                .then(res => res.json())
                .then(playersObj => setTabPlayers(Array.isArray(playersObj.players) ? playersObj.players : []))
                .catch(() => setTabPlayers([]))
                .finally(() => setTabPlayersLoading(false));
        }
    }, [tab, tournament?.id, API_BASE]);

    // --- Fetch teams for Teams & Players tab ---
    useEffect(() => {
        if (tab === 'teams') {
            setTeamsLoading(true);
            fetch(`${API_BASE}/api/teams?tournamentId=${tournament?.id}`)
                .then(res => res.json())
                .then(data => setTeams(data.teams || []))
                .catch(() => setTeams([]))
                .finally(() => setTeamsLoading(false));
        }
    }, [tab, tournament?.id, API_BASE]);

    // --- Fetch players for a team when a team card is expanded ---
    const handleExpandTeam = (teamId: string) => {
        console.log('handleExpandTeam called for teamId:', teamId, 'expandedTeamId:', expandedTeamId, 'teamPlayers:', teamPlayers[teamId]);
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
        if (!teamPlayers[teamId]) {
            setTeamPlayersLoading(prev => ({ ...prev, [teamId]: true }));
            console.log('About to fetch players for teamId:', teamId);
            console.log('Fetching players for teamId:', teamId);
            fetch(`${API_BASE}/api/players?team=${teamId}`)
                .then(res => res.json())
                .then(playersObj => {
                    console.log('API response for team', teamId, ':', playersObj);
                    setTeamPlayers(prev => ({
                        ...prev,
                        [teamId]: Array.isArray(playersObj.players) ? playersObj.players : []
                    }));
                })
                .catch(() => setTeamPlayers(prev => ({ ...prev, [teamId]: [] })))
                .finally(() => setTeamPlayersLoading(prev => ({ ...prev, [teamId]: false })));
        }
    };

    // Helper to get the player for the live auction (handles both playerId and player object)
    const getLiveAuctionPlayer = (auction: any) => {
        if (!auction) return null;
        if (auction.playerId) {
            return null; // No players state, so cannot find player by ID directly
        } else if (auction.player && auction.player._id) {
            // Try to find in players, fallback to embedded object
            return null; // No players state, so cannot find player by ID directly
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

    // Remove useEffect that references fetchPlayers and fetchTeams
    // useEffect(() => {
    //     if (tab === 'sold') {
    //         if (fetchPlayers) fetchPlayers();
    //         if (fetchTeams) fetchTeams();
    //     }
    // }, [tab, fetchPlayers, fetchTeams]);

    // Close mobile nav when tab changes
    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [tab]);

    // Debug: Log players before rendering Sold Players
    // console.log('Sold Players:', players.filter(p => p.status === 'sold'));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading tournament...</p>
                </div>
            </div>
        );
    }
    if (!tournament) return <div className="p-6">Tournament not found.</div>;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-gradient-to-br from-[#0a1026] via-[#1a223f] to-[#232946]">
            {/* Mobile Nav Toggle Button */}
            <button
                className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-full bg-yellow-400/90 text-[#232946] shadow-lg"
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            >
                {isMobileNavOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Navigation */}
            <div className={`fixed inset-0 z-40 bg-[#232946]/95 backdrop-blur-md transition-all duration-300 md:hidden flex flex-col items-center justify-center ${isMobileNavOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                <div className="flex flex-col items-center gap-6 w-full px-4">
                    {[
                        { value: 'live', label: 'Live Auction' },
                        { value: 'sold', label: 'Sold' },
                        { value: 'available', label: 'Available' },
                        { value: 'unsold', label: 'Unsold' },
                        { value: 'teams', label: 'Teams & Players' }
                    ].map((tabOption) => (
                        <button
                            key={tabOption.value}
                            className={`w-full max-w-xs text-center py-4 rounded-xl font-bold text-xl transition-all ${tab === tabOption.value
                                ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]'
                                : 'text-yellow-200 hover:text-yellow-100 bg-white/10'
                                }`}
                            onClick={() => setTab(tabOption.value as typeof tab)}
                        >
                            {tabOption.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Floating decorative elements - adjusted for mobile */}
            <div className="hidden sm:block absolute left-[8%] top-[18%] animate-float-1 z-10">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 shadow-[0_0_40px_10px_rgba(255,215,0,0.15)] border-2 border-yellow-300/30"></div>
            </div>
            <div className="hidden sm:block absolute right-[12%] top-[30%] animate-float-2 z-10">
                <div className="w-10 h-10 rounded-full bg-orange-400/20 shadow-[0_0_30px_8px_rgba(255,136,0,0.12)] border-2 border-orange-300/30"></div>
            </div>
            {/* Cricket Bat SVG - adjusted for mobile */}
            <div className="hidden sm:block absolute left-[3%] bottom-[12%] z-10 animate-bat-float opacity-80">
                <svg width="60" height="120" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="10" width="10" height="80" rx="5" fill="#eab308" stroke="#b45309" strokeWidth="3" />
                    <rect x="27" y="90" width="6" height="20" rx="3" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Ball SVG - adjusted for mobile */}
            <div className="hidden sm:block absolute right-[6%] bottom-[18%] z-10 animate-ball-bounce opacity-90">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="16" fill="#dc2626" stroke="#fff" strokeWidth="3" />
                    <path d="M10 15 Q20 25 30 15" stroke="#fff" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Stumps SVG - adjusted for mobile */}
            <div className="hidden sm:block absolute right-[14%] top-[10%] z-10 animate-stumps-float opacity-80">
                <svg width="48" height="70" viewBox="0 0 48 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="21" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="34" y="10" width="6" height="50" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
                    <rect x="8" y="5" width="32" height="6" rx="3" fill="#a16207" />
                </svg>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-6xl mx-auto py-8 sm:py-16 px-4 relative z-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-10">
                    {tournament.logo ? (
                        <img
                            src={tournament.logo}
                            alt={tournament.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full border-4 border-yellow-400/60 shadow-[0_0_40px_0_rgba(255,215,0,0.25)] mb-4 sm:mb-0 sm:mr-6"
                        />
                    ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-200 to-orange-200 flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-yellow-700 border-4 border-yellow-400/60 mb-4 sm:mb-0 sm:mr-6">
                            {tournament.name[0]}
                        </div>
                    )}
                    <div className="text-center sm:text-left">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-yellow-300 mb-2 drop-shadow-[0_2px_8px_rgba(255,215,0,0.25)]">{tournament.name}</h1>
                        <div className={`inline-block px-3 sm:px-4 py-1 rounded-full text-sm sm:text-base font-semibold mb-2 ${tournament.status === 'completed'
                            ? 'bg-gray-800/50 text-gray-200 border border-yellow-400/30'
                            : 'bg-gradient-to-r from-yellow-400/60 to-orange-400/60 text-yellow-900 border border-yellow-400/60 shadow'
                            }`}>
                            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation - Desktop */}
                <div className="hidden md:flex justify-center mb-8 sm:mb-12">
                    <div className="inline-flex bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-red-400/10 backdrop-blur-sm rounded-xl p-1 border-2 border-yellow-400/30 shadow">
                        {[
                            { value: 'live', label: 'Live Auction' },
                            { value: 'sold', label: 'Sold' },
                            { value: 'available', label: 'Available' },
                            { value: 'unsold', label: 'Unsold' },
                            { value: 'teams', label: 'Teams & Players' }
                        ].map((tabOption) => (
                            <button
                                key={tabOption.value}
                                className={`flex items-center px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all ${tab === tabOption.value
                                    ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_20px_2px_rgba(255,215,0,0.25)]' +
                                    (tabOption.value === 'live' ? ' animate-pulse-fast' : '')
                                    : 'text-yellow-200 hover:text-yellow-100'
                                    }`}
                                onClick={() => setTab(tabOption.value as typeof tab)}
                            >
                                {tabOption.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Card Content with spotlight */}
                <div className="relative">
                    <div className="absolute -inset-4 sm:-inset-8 z-0 pointer-events-none">
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-red-400/10 blur-2xl opacity-80"></div>
                    </div>
                    <div className="relative bg-gradient-to-br from-[#232946]/80 to-[#1a223f]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-10 mb-8 sm:mb-10 border-4 border-yellow-400/60 ring-1 sm:ring-2 ring-yellow-300/30 ring-offset-1 sm:ring-offset-2 z-10">
                        {tab === 'live' && (
                            <div className="relative">
                                <div className="text-xs text-gray-400 mb-2">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</div>
                                {liveAuction ? (
                                    <>
                                        <div className="flex justify-center">
                                            <div className={`relative bg-gradient-to-br rounded-2xl sm:rounded-[2.5rem] shadow-2xl border-4 w-full max-w-sm p-0 overflow-hidden ${getCardColor(liveAuctionPlayer?.primaryRole)}`} style={{ minHeight: '300px' }}>
                                                {/* Top Row: Role, Team Logo */}
                                                <div className="flex justify-between items-center px-4 sm:px-6 pt-4 sm:pt-6">
                                                    <span className="bg-white/80 rounded-full px-2 sm:px-3 py-1 text-xs font-bold text-yellow-800 shadow">{liveAuctionPlayer?.primaryRole || '-'}</span>
                                                    <div className="flex items-center gap-2">
                                                    </div>
                                                </div>
                                                {/* Player Photo */}
                                                <div className="flex justify-center mt-2">
                                                    {liveAuctionPlayer?.photo ? (
                                                        <img
                                                            src={liveAuctionPlayer.photo}
                                                            alt={liveAuctionPlayer.name}
                                                            className="rounded-full object-cover w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 max-w-[40vw] max-h-[40vw] border-4 border-yellow-300 shadow-xl"
                                                            style={{ background: 'none', boxShadow: 'none' }}
                                                        />
                                                    ) : (
                                                        <div className="rounded-full flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 max-w-[40vw] max-h-[40vw] bg-yellow-400 text-4xl sm:text-5xl font-extrabold text-gray-400 border-4 border-yellow-300 shadow-xl">
                                                            {liveAuctionPlayer?.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-center mt-2 sm:mt-4">
                                                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">{liveAuctionPlayer ? liveAuctionPlayer.name : '-'}</h2>
                                                    <div className="text-base sm:text-lg font-bold text-yellow-900 mt-1">
                                                        <div><span className="font-bold">Current Bid:</span> <span className="text-gray-900">₹{liveAuctionPlayer ? getLiveAuctionBid(liveAuction) : '-'}</span></div>
                                                        <div><span className="font-bold">Current Bidder:</span> <span className="text-gray-900 font-bold">{currentBidderTeam ? currentBidderTeam : "-"}</span></div>
                                                    </div>
                                                </div>
                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 px-4 sm:px-6 md:px-8 mt-2 sm:mt-4 text-xs sm:text-sm">
                                                    <div>Base Price: ₹{liveAuctionPlayer?.basePrice ?? '-'}</div>
                                                    <div><span className="font-semibold text-gray-700">Station:</span> <span className="text-gray-900">{liveAuctionPlayer?.station || '-'}</span></div>
                                                    <div><span className="font-semibold text-gray-700">Previous Team:</span> <span className="text-gray-900">{liveAuctionPlayer?.previousYearTeam || '-'}</span></div>
                                                    <div><span className="font-semibold text-gray-700">Age:</span> <span className="text-gray-900">{liveAuctionPlayer?.age || '-'}</span></div>
                                                </div>
                                                {/* Stats Box */}
                                                <div className="bottom-0 left-0 w-full bg-yellow-200/80 py-2 sm:py-3 flex justify-around items-center border-t-2 border-yellow-400">
                                                    <div className="text-center">
                                                        <div className="text-sm sm:text-base md:text-lg font-bold text-yellow-900">{liveAuctionPlayer?.battingStyle || '-'}</div>
                                                        <div className="text-xs text-yellow-800">BATTING STYLE</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-sm sm:text-base md:text-lg font-bold text-yellow-900">{liveAuctionPlayer?.bowlingStyle || '-'}</div>
                                                        <div className="text-xs text-yellow-800">BOWLING STYLE</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Audience Reaction Row */}
                                        <div className="flex justify-center mt-4 sm:mt-6 gap-2 animate-fade-in-up">
                                            <span className="text-xl sm:text-2xl animate-bounce">👏</span>
                                            <span className="text-xl sm:text-2xl animate-pulse">😮</span>
                                            <span className="text-xl sm:text-2xl animate-bounce">🎉</span>
                                            <span className="text-xl sm:text-2xl animate-pulse">🔥</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-gray-500 text-center py-8">No player on the auction table at the moment.</div>
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
                                            <div className="bg-white/90 rounded-2xl sm:rounded-[2.5rem] w-full max-w-sm h-[360px] sm:h-[480px] flex flex-col items-center justify-center border-4 border-emerald-400 shadow-2xl relative">
                                                <Gavel className="w-12 sm:w-16 h-12 sm:h-16 text-yellow-500 mb-4 animate-gavel-slam" />
                                                <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-emerald-600 drop-shadow-lg animate-pulse">SOLD!</span>
                                                <span className="mt-2 sm:mt-4 text-xl sm:text-2xl font-bold text-emerald-700 animate-fade-in">Player Sold</span>
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
                                            <div className="bg-white/90 rounded-2xl sm:rounded-[2.5rem] w-full max-w-sm h-[360px] sm:h-[480px] flex flex-col items-center justify-center border-4 border-red-400 shadow-2xl relative">
                                                <Gavel className="w-12 sm:w-16 h-12 sm:h-16 text-red-500 mb-4 animate-gavel-slam" />
                                                <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-red-600 drop-shadow-lg animate-pulse">UNSOLD!</span>
                                                <span className="mt-2 sm:mt-4 text-xl sm:text-2xl font-bold text-red-700 animate-fade-in">Player Unsold</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'available' && (
                            <div className="relative">
                                <div className="text-xs text-gray-500 mb-4 flex justify-between items-center">
                                    <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                        {tabPlayers.length} players available
                                    </span>
                                </div>

                                {tabPlayersLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-500">Loading available players...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {tabPlayers.map(player => (
                                            <div
                                                key={player._id}
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                                            >
                                                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-5 text-center">
                                                    <h3 className="font-bold text-xl text-gray-800 mb-1 group-hover:text-yellow-600 transition-colors">
                                                        {player.name}
                                                    </h3>
                                                    <div className="w-16 h-1 bg-yellow-300 mx-auto mb-3 rounded-full"></div>

                                                    <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-inner">
                                                        <div className="text-left">
                                                            <p className="text-xs text-gray-500 font-medium">Base Price</p>
                                                            <p className="text-lg font-bold text-gray-800">₹{player.basePrice ?? '-'}</p>
                                                        </div>

                                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${player.status === 'sold'
                                                            ? 'bg-red-100 text-red-800'
                                                            : player.status === 'unsold'
                                                                ? 'bg-gray-100 text-gray-800'
                                                                : 'bg-green-100 text-green-800'
                                                            }`}>
                                                            {player.status}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'sold' && (
                            <div className="relative">
                                <div className="text-xs text-gray-500 mb-4 flex justify-between items-center">
                                    <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span>
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                        {tabPlayers.length} players sold
                                    </span>
                                </div>

                                {tabPlayersLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-500">Loading sold players...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {tabPlayers.map(player => (
                                            <div
                                                key={player._id}
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                                            >
                                                <div className="bg-gradient-to-r from-red-50 to-red-100 p-5 text-center relative">
                                                    {/* Sold badge */}
                                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                        SOLD
                                                    </div>

                                                    <h3 className="font-bold text-xl text-gray-800 m-2 group-hover:text-red-600 transition-colors">
                                                        {player.name}
                                                    </h3>
                                                    <div className="w-16 h-1 bg-red-300 mx-auto mb-3 rounded-full"></div>

                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-inner">
                                                            <div className="text-left">
                                                                <p className="text-xs text-gray-500 font-medium">Base Price</p>
                                                                <p className="text-sm font-semibold text-gray-700">₹{player.basePrice ?? '-'}</p>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-xs text-gray-500 font-medium">Sold For</p>
                                                                <p className="text-lg font-bold text-red-600">₹{player.price ?? '-'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white rounded-lg p-3 shadow-inner">
                                                            <p className="text-xs text-gray-500 font-medium">Team</p>
                                                            <p className="text-sm font-semibold text-gray-800 truncate">{player.teamName ?? '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>


                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'unsold' && (
                            <div className="relative">
                                <div className="text-xs text-gray-500 mb-4 flex justify-between items-center">
                                    <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span>
                                    <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                                        {tabPlayers.length} players unsold
                                    </span>
                                </div>

                                {tabPlayersLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-500">Loading unsold players...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {tabPlayers.map(player => (
                                            <div
                                                key={player._id}
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                                            >
                                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 text-center relative">
                                                    {/* Unsold badge */}
                                                    <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                        UNSOLD
                                                    </div>

                                                    <h3 className="font-bold text-xl text-gray-700 m-2 group-hover:text-gray-800 transition-colors">
                                                        {player.name}
                                                    </h3>
                                                    <div className="w-16 h-1 bg-gray-300 mx-auto mb-3 rounded-full"></div>

                                                    <div className="bg-white rounded-lg p-4 shadow-inner">
                                                        <div className="flex flex-col items-center">
                                                            <p className="text-xs text-gray-500 font-medium mb-1">Base Price</p>
                                                            <p className="text-lg font-bold text-gray-800">₹{player.basePrice ?? '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'teams' && (
                            <div className="relative">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-xs text-gray-400 mb-2">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</div>
                                    <button
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                        onClick={() => {
                                            setTeamsLoading(true);
                                            setTeamPlayers({});
                                            setTeamPlayersLoading({});
                                            fetch(`${API_BASE}/api/teams?tournamentId=${tournament?.id}`)
                                                .then(res => res.json())
                                                .then(data => setTeams(data.teams || []))
                                                .catch(() => setTeams([]))
                                                .finally(() => setTeamsLoading(false));
                                        }}
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 mb-4 flex justify-between items-center">
                                    <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        {teams.length} teams participating
                                    </span>
                                </div>

                                {teamsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-500">Loading teams...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {teams.map(team => (
                                            <div key={team._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                {/* Team Header */}
                                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 flex items-center gap-4">
                                                    {team.logo && (
                                                        <div className="flex-shrink-0">
                                                            <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-lg text-gray-800 truncate">{team.name}</h3>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-xs font-medium text-gray-600">Budget Left:</span>
                                                            <span className="text-sm font-bold text-blue-700">₹{team.remainingBudget}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Team Content */}
                                                <div className="p-4">
                                                    <button
                                                        onClick={() => {
                                                            console.log('Button clicked for teamId:', team._id);
                                                            handleExpandTeam(team._id);
                                                        }}
                                                        className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {expandedTeamId === team._id ? 'Hide squad' : 'View squad'}
                                                        </span>
                                                        <svg
                                                            className={`w-4 h-4 text-gray-500 transition-transform ${expandedTeamId === team._id ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {expandedTeamId === team._id && (
                                                        <div className="mt-4 space-y-3">
                                                            {teamPlayersLoading[team._id] ? (
                                                                <div className="flex justify-center py-4">
                                                                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                                                </div>
                                                            ) : (
                                                                teamPlayers[team._id]?.length > 0 ? (
                                                                    teamPlayers[team._id]?.map(player => (
                                                                        <div key={player._id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-xs hover:bg-gray-50 transition-colors">
                                                                            {player.photo && (
                                                                                <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className="font-medium text-gray-800 truncate">{player.name}</h4>
                                                                                <p className="text-xs text-gray-500">Base: ₹{player.basePrice ?? '-'}</p>
                                                                            </div>
                                                                            <span className="font-bold text-green-600 whitespace-nowrap">₹{player.price ?? '-'}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-center py-4 text-gray-500 text-sm">
                                                                        No players in this team yet
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Team Footer */}

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-auto text-center opacity-80 text-white text-sm sm:text-base z-10 pb-4 sm:pb-8">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <div className="relative">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                            </svg>
                        </div>
                        <span>&copy; BidKaroo Auction Championship. All rights reserved.</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300">Experience the ultimate auction platform</p>
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

export default TournamentPage;