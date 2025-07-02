import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Trophy, ArrowRight, Zap } from 'lucide-react';

const ViewerPage: React.FC = () => {
    const { tournaments, auctions, teams, players, isLoading } = useApp();
    const [auctionTab, setAuctionTab] = useState<'ongoing' | 'completed'>('ongoing');
    const navigate = useNavigate();
    const prevPlayerId = useRef<string | null>(null);

    // Filter tournaments by status
    const ongoingTournaments = tournaments.filter(t => t.status !== 'completed');
    const completedTournaments = tournaments.filter(t => t.status === 'completed');

    const getLiveAuctionBidder = (auction: any) => {
        const bidder = auction?.currentBidder ?? auction?.team ?? '';
        if (typeof bidder === 'object' && bidder !== null) {
            return bidder._id || '';
        }
        return bidder;
    };

    const formatBudget = (amount: number) => {
        return amount >= 10000000
            ? `₹${(amount / 10000000).toFixed(2)}Cr`
            : amount >= 100000
                ? `₹${(amount / 100000).toFixed(2)}L`
                : `₹${amount.toLocaleString()}`;
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
            {/* Floating decorative elements */}
            <div className="absolute left-[8%] top-[18%] animate-float-1 z-10">
                <div className="w-16 h-16 rounded-full bg-gray-400/20 backdrop-blur-sm border-2 border-gray-300/30"></div>
            </div>
            <div className="absolute right-[12%] top-[30%] animate-float-2 z-10">
                <div className="w-10 h-10 rounded-full bg-gray-400/20 backdrop-blur-sm border-2 border-gray-300/30"></div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-6xl mx-auto py-16 px-4 relative z-20">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                        Professional Auctions
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
                        Build your dream team through competitive auctions
                    </p>

                    {/* Stats Section */}
                    {/* <div className="flex justify-center gap-8 mt-12">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">50+</div>
                            <div className="text-gray-300">Tournaments</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">1K+</div>
                            <div className="text-gray-300">Players</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">10K+</div>
                            <div className="text-gray-300">Bids</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">24/7</div>
                            <div className="text-gray-300">Action</div>
                        </div>
                    </div> */}
                </div>

                {/* Action Buttons */}
                {/* <div className="flex justify-center gap-6 mb-16">
                    <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-full shadow-xl text-lg transition-all duration-200 transform hover:-translate-y-1 flex items-center gap-2">
                        Join Auction
                    </button>
                    <button className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-full shadow-xl text-lg transition-all duration-200 transform hover:-translate-y-1 flex items-center gap-2">
                        Watch Live
                    </button>
                </div> */}

                {/* Tab Navigation */}
                <div className="flex justify-center mb-16">
                    <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${auctionTab === 'ongoing'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                                : 'text-gray-200 hover:text-white'
                                }`}
                            onClick={() => setAuctionTab('ongoing')}
                        >
                            <Zap className="w-6 h-6 mr-2" />
                            Ongoing Auctions
                        </button>
                        <button
                            className={`flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all ${auctionTab === 'completed'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                                : 'text-gray-200 hover:text-white'
                                }`}
                            onClick={() => setAuctionTab('completed')}
                        >
                            <CheckCircle className="w-6 h-6 mr-2" />
                            Completed Auctions
                        </button>
                    </div>
                </div>

                {/* Tournament Cards */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-10 border border-white/20">
                    <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-orange-400" />
                        {auctionTab === 'ongoing' ? 'Live Tournaments' : 'Completed Tournaments'}
                    </h2>

                    {(auctionTab === 'ongoing' ? ongoingTournaments : completedTournaments).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(auctionTab === 'ongoing' ? ongoingTournaments : completedTournaments).map(tournament => (
                                <div
                                    key={tournament.id}
                                    className="bg-gradient-to-br from-white/10 to-gray-400/20 rounded-2xl p-6 shadow-lg border-2 border-gray-300/30 hover:border-orange-300/50 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                                >
                                    {/* Tournament Logo */}
                                    <div className="flex justify-center mb-6">
                                        {tournament.logo ? (
                                            <img
                                                src={tournament.logo}
                                                alt={tournament.name}
                                                className="w-32 h-32 object-contain rounded-full border-4 border-orange-300/30 shadow-xl"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-5xl font-extrabold text-gray-600 border-4 border-orange-300/30">
                                                {tournament.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tournament Info */}
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white mb-2">{tournament.name}</h3>
                                        <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${tournament.status === 'completed'
                                            ? 'bg-gray-800/30 text-gray-200'
                                            : 'bg-orange-500/30 text-orange-100'
                                            }`}>
                                            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                                        </div>

                                        {/* <div className="grid grid-cols-3 gap-4 mt-6">
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-xs text-orange-300 mb-1">TEAMS</div>
                                                <div className="text-xl font-bold text-white">
                                                    {teams.filter(t => t.tournamentId === tournament.id).length}
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-xs text-orange-300 mb-1">PLAYERS</div>
                                                <div className="text-xl font-bold text-white">
                                                    {players.filter(p => p.tournamentId === tournament.id && p.team).length}
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-xs text-orange-300 mb-1">BUDGET</div>
                                                <div className="text-xl font-bold text-white">
                                                    {formatBudget(tournament.budget)}
                                                </div>
                                            </div>
                                        </div> */}

                                        <div className="mt-6">
                                            <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                                                View Details
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
                            <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/20">
                                <Trophy className="w-10 h-10 text-orange-300" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">
                                No {auctionTab === 'ongoing' ? 'ongoing' : 'completed'} tournaments
                            </h3>
                            <p className="text-gray-200">
                                {auctionTab === 'ongoing'
                                    ? "Check back later for upcoming tournaments"
                                    : "Completed tournaments will appear here"}
                            </p>
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
                    <span>&copy; BidKaroo Auction Championship. All rights reserved.</span>
                </div>
                <p className="text-sm text-gray-300">Experience the ultimate auction platform</p>
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
            `}</style>
        </div>
    );
};

export default ViewerPage;