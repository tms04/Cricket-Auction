import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Gavel, Menu, X, IndianRupee, Users, Target, Calendar, Award, Home, User } from 'lucide-react';
import Confetti from 'react-confetti';
import * as api from '../api';
import { io, Socket } from 'socket.io-client';
import { getOptimizedImageUrl } from '../utils/cloudinary';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevLiveAuctionRef = useRef<any | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liveAuction, setLiveAuction] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [prevAuction, setPrevAuction] = useState<any>(null);
    const [hadBid, setHadBid] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liveAuctionPlayer, setLiveAuctionPlayer] = useState<any>(null);
    const [currentBidderTeam, setCurrentBidderTeam] = useState<string | null>(null);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [, setSocket] = useState<Socket | null>(null);

    // --- State for player tabs ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tabPlayers, setTabPlayers] = useState<any[]>([]);
    const [tabPlayersLoading, setTabPlayersLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teams, setTeams] = useState<any[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teamPlayers, setTeamPlayers] = useState<{ [teamId: string]: any[] }>({});
    const [teamPlayersLoading, setTeamPlayersLoading] = useState<{ [teamId: string]: boolean }>({});
    const tabRef = useRef<'live' | 'sold' | 'available' | 'unsold' | 'teams'>('live');

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
            .catch(() => {
                setTournament(null);
            })
            .finally(() => setLoading(false));
    }, [id, API_BASE]);

    useEffect(() => {
        tabRef.current = tab;
    }, [tab]);

    useEffect(() => {
        if (!id || tab !== 'live') return;
        // Connect to the socket server
        const newSocket = io(API_BASE, { transports: ['websocket'] });
        setSocket(newSocket);
        // Listen for auction updates for this tournament
        const updateEventName = `auction_update_${id}`;
        const resultEventName = `auction_result_${id}`;

        const fetchFreshAuction = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/auctions/current?tournamentId=${id}&_=${Date.now()}`, {
                    cache: 'no-store'
                });
                const data = await res.json();
                setLiveAuction(data);
                setPrevAuction(data);
            } catch {
                setLiveAuction(null);
                setPrevAuction(null);
            }
        };

        const clearCaches = async () => {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        };

        newSocket.on(updateEventName, (auctionData) => {
            // Animation logic for SOLD/UNSOLD driven by state change
            if (
                prevAuction &&
                prevAuction.status === 'active' &&
                auctionData.status !== 'active'
            ) {
                if (hadBid) setShowSoldAnimation(true);
                else setShowUnsoldAnimation(true);
                setTimeout(() => {
                    setShowSoldAnimation(false);
                    setShowUnsoldAnimation(false);
                }, 2500);
                setHadBid(false);
            }
            // Track if there was at least one bid
            if (
                auctionData &&
                auctionData.status === 'active' &&
                (auctionData.currentBid > 0 || auctionData.bidAmount > 0 || auctionData.currentBidder)
            ) {
                setHadBid(true);
            }
            setPrevAuction(auctionData);
            setLiveAuction(auctionData);
        });

        newSocket.on(resultEventName, async (resultData) => {
            try {
                await clearCaches();
            } catch {
                // ignore cache clear failures
            }

            if (resultData?.status === 'sold') {
                setShowSoldAnimation(true);
                if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
                soldTimeoutRef.current = window.setTimeout(() => setShowSoldAnimation(false), 2500);
            } else if (resultData?.status === 'unsold') {
                setShowUnsoldAnimation(true);
                if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
                soldTimeoutRef.current = window.setTimeout(() => setShowUnsoldAnimation(false), 2500);
            }
            setHadBid(false);
            await fetchFreshAuction();
            setLastUpdated(new Date());
            // Force refresh of tab lists when on sold/unsold/available to avoid stale player rows
            const currentTab = tabRef.current;
            if (currentTab === 'available' || currentTab === 'sold' || currentTab === 'unsold') {
                setTabPlayersLoading(true);
                const status = currentTab;
                fetch(`${API_BASE}/api/players?status=${status}&tournamentId=${tournament?.id}&_=${Date.now()}`, { cache: 'no-store' })
                    .then(res => res.json())
                    .then(playersObj => setTabPlayers(Array.isArray(playersObj.players) ? playersObj.players : []))
                    .catch(() => setTabPlayers([]))
                    .finally(() => setTabPlayersLoading(false));
            }
        });

        // Fetch current auction once on mount (in case no event yet)
        fetchFreshAuction();

        return () => {
            newSocket.off(updateEventName);
            newSocket.off(resultEventName);
            newSocket.disconnect();
        };
    }, [id, API_BASE, tab, prevAuction, hadBid, tournament?.id]);

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
            api.fetchPlayerById(playerId, id).then(player => {
                console.log('Fetched player data:', player);
                console.log('Player photo URL:', player?.photo);
                setLiveAuctionPlayer(player);
            }).catch(err => {
                console.error('Error fetching player:', err);
                setLiveAuctionPlayer(null);
            });
        } else {
            setLiveAuctionPlayer(null);
        }
    }, [liveAuction, id]);

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

    // Update currentBidderTeam directly from socket data
    useEffect(() => {
        if (liveAuction?.currentBidderName) {
            setCurrentBidderTeam(liveAuction.currentBidderName);
        } else {
            setCurrentBidderTeam(null);
        }
    }, [liveAuction?.currentBidderName]);

    useEffect(() => {
        return () => {
            if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
        };
    }, []);

    // --- Fetch players for Available/Sold/Unsold tabs ---
    useEffect(() => {
        if (tab === 'available' || tab === 'sold' || tab === 'unsold') {
            setTabPlayersLoading(true);
            const status = tab;
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

    // Helper to get the current bid (handles both currentBid and bidAmount)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getLiveAuctionBid = (auction: any) => auction?.currentBid ?? auction?.bidAmount ?? '';

    // Helper to get card color classes based on primaryRole
    const getRoleColor = (role: string) => {
        if (role === 'All-rounder') return 'bg-gradient-to-r from-yellow-400 to-orange-400';
        if (role === 'Batsman') return 'bg-gradient-to-r from-blue-400 to-cyan-400';
        if (role === 'Bowler') return 'bg-gradient-to-r from-red-400 to-pink-400';
        if (role === 'Wicket-keeper') return 'bg-gradient-to-r from-green-400 to-emerald-400';
        return 'bg-gradient-to-r from-gray-400 to-gray-300';
    };

    // Helper to get role icon
    const getRoleIcon = (role: string) => {
        if (role === 'All-rounder') return '⚡';
        if (role === 'Batsman') return '🏏';
        if (role === 'Bowler') return '🎯';
        if (role === 'Wicket-keeper') return '🧤';
        return '👤';
    };

    // Close mobile nav when tab changes
    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [tab]);

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

            {/* Floating decorative elements */}
            <div className="hidden sm:block absolute left-[8%] top-[18%] animate-float-1 z-10">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 shadow-[0_0_40px_10px_rgba(255,215,0,0.15)] border-2 border-yellow-300/30"></div>
            </div>
            <div className="hidden sm:block absolute right-[12%] top-[30%] animate-float-2 z-10">
                <div className="w-10 h-10 rounded-full bg-orange-400/20 shadow-[0_0_30px_8px_rgba(255,136,0,0.12)] border-2 border-orange-300/30"></div>
            </div>
            {/* Cricket Bat SVG */}
            <div className="hidden sm:block absolute left-[3%] bottom-[12%] z-10 animate-bat-float opacity-80">
                <svg width="60" height="120" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="10" width="10" height="80" rx="5" fill="#eab308" stroke="#b45309" strokeWidth="3" />
                    <rect x="27" y="90" width="6" height="20" rx="3" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Ball SVG */}
            <div className="hidden sm:block absolute right-[6%] bottom-[18%] z-10 animate-ball-bounce opacity-90">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="16" fill="#dc2626" stroke="#fff" strokeWidth="3" />
                    <path d="M10 15 Q20 25 30 15" stroke="#fff" strokeWidth="2" />
                </svg>
            </div>
            {/* Cricket Stumps SVG */}
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
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-yellow-300 mb-2 drop-shadow-[0_2px_8px_rgba(255,215,0,0.25)] break-words px-2 sm:px-0">{tournament.name}</h1>
                        <div className={`inline-block px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm md:text-base font-semibold mb-2 ${tournament.status === 'completed'
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

                {/* Mobile Tab Navigation */}
                <div className="flex md:hidden justify-center mb-6">
                    <div className="inline-flex bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-red-400/10 backdrop-blur-sm rounded-lg p-0.5 border-2 border-yellow-400/30 shadow overflow-x-auto max-w-full">
                        <div className="flex">
                            {[
                                { value: 'live', label: 'Live' },
                                { value: 'sold', label: 'Sold' },
                                { value: 'available', label: 'Avail' },
                                { value: 'unsold', label: 'Unsold' },
                                { value: 'teams', label: 'Teams' }
                            ].map((tabOption) => (
                                <button
                                    key={tabOption.value}
                                    className={`flex items-center px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${tab === tabOption.value
                                        ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-[#232946] shadow-[0_0_10px_1px_rgba(255,215,0,0.25)]' +
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
                </div>

                {/* Main Card Content with spotlight */}
                <div className="relative">
                    <div className="absolute -inset-4 sm:-inset-8 z-0 pointer-events-none">
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-red-400/10 blur-2xl opacity-80"></div>
                    </div>
                    <div className="relative bg-gradient-to-br from-[#232946]/80 to-[#1a223f]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-10 mb-8 sm:mb-10 border-4 border-yellow-400/60 ring-1 sm:ring-2 ring-yellow-300/30 ring-offset-1 sm:ring-offset-2 z-10">
                        {tab === 'live' && (
                            <div className="relative">
                                <div className="text-xs text-gray-400 mb-3 sm:mb-4 text-center md:text-left">
                                    Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
                                </div>
                                {liveAuction ? (
                                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
                                        {/* Left Column - Player Photo with Name Info */}
                                        <div className="lg:w-2/5">
                                            <div className="relative bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-red-400/10 rounded-2xl p-3 sm:p-4 md:p-6 border-2 border-yellow-400/30 shadow-2xl">
                                                {/* Role Badge */}
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                                                    <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm ${getRoleColor(liveAuctionPlayer?.primaryRole || '')} text-white shadow-lg flex items-center gap-1 sm:gap-2 whitespace-nowrap max-w-[90vw] overflow-hidden`}>
                                                        <span className="text-sm sm:text-lg">{getRoleIcon(liveAuctionPlayer?.primaryRole || '')}</span>
                                                        <span className="truncate">{liveAuctionPlayer?.primaryRole || 'Player'}</span>
                                                    </div>
                                                </div>

                                                {/* Player Photo - UPDATED FOR ASPECT RATIO */}
                                                <div className="mt-6 sm:mt-8 flex justify-center">
                                                    {liveAuctionPlayer?.photo ? (
                                                        <div className="relative group w-full max-w-xs sm:max-w-md">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                                                            <div className="relative w-full max-w-xs sm:max-w-md h-[200px] sm:h-[240px] md:h-[280px] flex items-center justify-center rounded-xl border-4 border-yellow-300/80 shadow-2xl overflow-hidden bg-gradient-to-br from-yellow-100/20 to-orange-100/20">
                                                                <img
                                                                    src={liveAuctionPlayer.photo}
                                                                    alt={liveAuctionPlayer.name}
                                                                    className="max-h-full max-w-full object-contain p-2 transform group-hover:scale-[1.02] transition-transform duration-300"
                                                                    style={{ background: 'transparent' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full max-w-xs sm:max-w-md h-[200px] sm:h-[240px] md:h-[280px] bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl border-4 border-yellow-300 shadow-2xl">
                                                            <div className="text-center">
                                                                <div className="text-6xl sm:text-7xl md:text-8xl font-extrabold text-yellow-700 mb-2">
                                                                    {liveAuctionPlayer?.name?.[0] || '?'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Name and Former Team Info (Desktop only) */}
                                                <div className="hidden lg:block mt-6">
                                                    <div className="text-center">
                                                        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 drop-shadow-lg break-words">
                                                            {liveAuctionPlayer ? liveAuctionPlayer.name : '-'}
                                                        </h2>
                                                        {liveAuctionPlayer?.previousYearTeam && (
                                                            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-400/30">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <Home className="w-5 h-5 text-blue-300" />
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm text-blue-300 truncate">Former Team</div>
                                                                        <div className="text-lg font-bold text-white truncate">{liveAuctionPlayer.previousYearTeam}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mobile View - Name and Former Team */}
                                                <div className="lg:hidden mt-4 sm:mt-6 text-center">
                                                    <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 break-words px-2">
                                                        {liveAuctionPlayer ? liveAuctionPlayer.name : '-'}
                                                    </h2>
                                                    {liveAuctionPlayer?.previousYearTeam && (
                                                        <div className="text-sm sm:text-base font-bold text-yellow-300 truncate px-2">
                                                            Formerly: {liveAuctionPlayer.previousYearTeam}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column - Player Info */}
                                        <div className="lg:w-3/5">
                                            <div className="bg-gradient-to-br from-[#2d3566]/90 to-[#1a223f]/90 rounded-2xl p-4 sm:p-6 border-2 border-yellow-400/30 shadow-2xl h-full">
                                                {/* Current Bid Section */}
                                                <div className="mb-4 sm:mb-6">
                                                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 sm:p-6 border-2 border-yellow-400/40">
                                                        <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
                                                            <div className="text-center md:text-left w-full md:w-auto">
                                                                <div className="text-xs sm:text-sm text-yellow-300 font-semibold mb-1">CURRENT BID</div>
                                                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center justify-center md:justify-start gap-1 sm:gap-2">
                                                                    <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-yellow-400" />
                                                                    <span className="truncate">{liveAuctionPlayer ? getLiveAuctionBid(liveAuction) : '-'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-center md:text-right w-full md:w-auto">
                                                                <div className="text-xs sm:text-sm text-yellow-300 font-semibold mb-1">LEADING BIDDER</div>
                                                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center justify-center md:justify-end gap-1 sm:gap-2">
                                                                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                                                    <span className="truncate max-w-[200px]">{currentBidderTeam || "No Bids Yet"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stats Grid - Compact Layout */}
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-2 sm:p-3 border border-blue-400/30">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <div className="bg-blue-500/20 p-1.5 sm:p-2 rounded-lg">
                                                                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-blue-300 truncate">Base Price</div>
                                                                <div className="text-base sm:text-lg font-bold text-white truncate">₹{liveAuctionPlayer?.basePrice ?? '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-2 sm:p-3 border border-green-400/30">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <div className="bg-green-500/20 p-1.5 sm:p-2 rounded-lg">
                                                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-green-300 truncate">Age</div>
                                                                <div className="text-base sm:text-lg font-bold text-white truncate">{liveAuctionPlayer?.age || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-2 sm:p-3 border border-purple-400/30">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <div className="bg-purple-500/20 p-1.5 sm:p-2 rounded-lg">
                                                                <Award className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-purple-300 truncate">Station</div>
                                                                <div className="text-base sm:text-lg font-bold text-white truncate">{liveAuctionPlayer?.station || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-xl p-2 sm:p-3 border border-red-400/30">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <div className="bg-red-500/20 p-1.5 sm:p-2 rounded-lg">
                                                                <span className="text-xs sm:text-sm">🏏</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-red-300 truncate">Batting</div>
                                                                <div className="text-base sm:text-lg font-bold text-white truncate">{liveAuctionPlayer?.battingStyle || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Style Info */}
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                                    <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl p-2 sm:p-3 border border-yellow-400/30">
                                                        <div className="text-center">
                                                            <div className="text-xs text-yellow-300 mb-1 truncate">BOWLING STYLE</div>
                                                            <div className="text-sm sm:text-md font-bold text-white truncate px-1">{liveAuctionPlayer?.bowlingStyle || '-'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-gray-500/10 to-gray-400/10 rounded-xl p-2 sm:p-3 border border-gray-400/30">
                                                        <div className="text-center">
                                                            <div className="text-xs text-gray-300 mb-1 truncate">PLAYING ROLE</div>
                                                            <div className="text-sm sm:text-md font-bold text-white truncate px-1">{liveAuctionPlayer?.primaryRole || '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bid Status Bar */}
                                                <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl border border-yellow-400/30">
                                                    <div className="text-center">
                                                        <div className="text-xs sm:text-sm text-yellow-300 mb-1">AUCTION STATUS</div>
                                                        <div className="text-base sm:text-lg font-bold text-white truncate px-2">
                                                            {currentBidderTeam ? 'ACTIVE BIDDING' : 'WAITING FOR FIRST BID'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 sm:py-12">
                                        <div className="text-4xl sm:text-6xl mb-4">⏳</div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-300 mb-2">Waiting for next player</h3>
                                        <p className="text-gray-400 text-sm sm:text-base">No player on the auction table at the moment.</p>
                                    </div>
                                )}

                                {/* Audience Reaction Row */}
                                <div className="flex justify-center mt-4 gap-2 animate-fade-in-up">
                                    <span className="text-xl sm:text-2xl animate-bounce">👏</span>
                                    <span className="text-xl sm:text-2xl animate-pulse delay-100">😮</span>
                                    <span className="text-xl sm:text-2xl animate-bounce delay-200">🎉</span>
                                    <span className="text-xl sm:text-2xl animate-pulse delay-300">🔥</span>
                                </div>

                                {/* SOLD Animation Overlay */}
                                {showSoldAnimation && (
                                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500" style={{ opacity: showSoldAnimation ? 1 : 0 }}></div>
                                        <div className={`relative transition-opacity duration-700 ${showSoldAnimation ? 'opacity-100 animate-fade-in-scale' : 'opacity-0'}`}
                                            style={{ pointerEvents: 'auto' }}>
                                            <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={300} recycle={false} />
                                            <div className="bg-gradient-to-br from-emerald-500/90 to-green-400/90 rounded-3xl w-[90vw] max-w-2xl h-[300px] sm:h-[350px] md:h-[400px] flex flex-col items-center justify-center border-4 border-emerald-400 shadow-2xl relative mx-4">
                                                <div className="absolute -top-6 sm:-top-8">
                                                    <Gavel className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-300 mb-4 animate-gavel-slam drop-shadow-2xl" />
                                                </div>
                                                <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-2xl animate-pulse text-center px-4">SOLD!</span>
                                                <span className="mt-4 text-lg sm:text-xl md:text-2xl font-bold text-white animate-fade-in text-center px-4">Player Sold Successfully</span>
                                                <div className="mt-4 sm:mt-6 text-base sm:text-lg text-emerald-100 text-center px-4 truncate max-w-full">
                                                    {currentBidderTeam && `To: ${currentBidderTeam}`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* UNSOLD Animation Overlay */}
                                {showUnsoldAnimation && (
                                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500" style={{ opacity: showUnsoldAnimation ? 1 : 0 }}></div>
                                        <div className={`relative transition-opacity duration-700 ${showUnsoldAnimation ? 'opacity-100 animate-fade-in-scale' : 'opacity-0'}`}
                                            style={{ pointerEvents: 'auto' }}>
                                            <div className="bg-gradient-to-br from-red-500/90 to-orange-400/90 rounded-3xl w-[90vw] max-w-2xl h-[300px] sm:h-[350px] md:h-[400px] flex flex-col items-center justify-center border-4 border-red-400 shadow-2xl relative mx-4">
                                                <div className="absolute -top-6 sm:-top-8">
                                                    <Gavel className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-4 animate-gavel-slam drop-shadow-2xl" />
                                                </div>
                                                <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-2xl animate-pulse text-center px-4">UNSOLD!</span>
                                                <span className="mt-4 text-lg sm:text-xl md:text-2xl font-bold text-white animate-fade-in text-center px-4">Player Remains Unsold</span>
                                                <div className="mt-4 sm:mt-6 text-base sm:text-lg text-red-100 text-center px-4">
                                                    No bids received
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Other tabs remain the same */}
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
                                                    <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full ${player.status === 'unsold1' ? 'bg-gray-600' : 'bg-gray-600'
                                                        }`}>
                                                        {player.status === 'unsold1' ? 'UNSOLD' : 'UNSOLD'}
                                                    </div>
                                                    {/* Player Photo */}
                                                    <div className="flex justify-center mb-3">
                                                        {player.photo ? (
                                                            <img
                                                                src={getOptimizedImageUrl(player.photo, { width: 120, height: 120, quality: 80 })}
                                                                alt={player.name}
                                                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-md"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-4 border-gray-200 shadow-md">
                                                                <User className="w-10 h-10 text-gray-500" />
                                                            </div>
                                                        )}
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
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
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
                                        {teams.map(team => {
                                            // Max Bid is now calculated in the backend and included in team.maxBid
                                            const maxBid = team.maxBid !== undefined ? team.maxBid : null;

                                            return (
                                                <div key={team._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 flex items-center gap-4">
                                                        {team.logo && (
                                                            <div className="flex-shrink-0">
                                                                <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-lg text-gray-800 truncate">{team.name}</h3>
                                                            <div className="flex flex-col mt-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium text-gray-600">Budget Left:</span>
                                                                    <span className="text-sm font-bold text-blue-700">₹{team.remainingBudget}</span>
                                                                </div>
                                                                {maxBid !== null && (
                                                                    <div className="flex items-center justify-between mt-1">
                                                                        <span className="text-xs font-medium text-gray-600">Max Bid:</span>
                                                                        <span className="text-sm font-bold text-emerald-700">₹{maxBid.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <button
                                                            onClick={() => handleExpandTeam(team._id)}
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