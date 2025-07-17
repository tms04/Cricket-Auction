import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Trophy, ArrowRight, Zap } from 'lucide-react';

interface TournamentMinimal {
    id: string;
    name: string;
    status: string;
    logo?: string;
}

const ViewerPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<TournamentMinimal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [auctionTab, setAuctionTab] = useState<'ongoing' | 'completed'>('ongoing');
    const navigate = useNavigate();
    const BASE_URL = import.meta.env.VITE_API_URL || 'https://bidkaroo.techgg.org';
    const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
    useEffect(() => {
        fetch(`${API_BASE}/tournaments`)
            .then(res => res.json())
            .then((data) => {
                // Only keep minimal fields
                const minimal = Array.isArray(data)
                    ? data.map((t: any) => ({
                        id: t._id || t.id,
                        name: t.name,
                        status: t.status,
                        logo: t.logo || t.photo || undefined,
                    }))
                    : [];
                setTournaments(minimal);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const ongoingTournaments = tournaments.filter(t => t.status !== 'completed');
    const completedTournaments = tournaments.filter(t => t.status === 'completed');

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
            {/* Floating decorative elements */}
            <div className="absolute left-[8%] top-[18%] animate-float-1 z-10">
                <div className="w-16 h-16 rounded-full bg-gray-400/20 backdrop-blur-sm border-2 border-gray-300/30"></div>
            </div>
            <div className="absolute right-[12%] top-[30%] animate-float-2 z-10">
                <div className="w-10 h-10 rounded-full bg-gray-400/20 backdrop-blur-sm border-2 border-gray-300/30"></div>
            </div>
            <div className="w-full max-w-6xl mx-auto py-16 px-4 relative z-20">
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                        Professional Auctions
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
                        Build your dream team through competitive auctions
                    </p>
                </div>
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
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-10 border border-white/20">
                    <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-orange-400" />
                        {auctionTab === 'ongoing' ? 'Live Tournaments' : 'Completed Tournaments'}
                    </h2>
                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                            <p className="text-gray-400">Loading tournaments...</p>
                        </div>
                    ) : (
                        (auctionTab === 'ongoing' ? ongoingTournaments : completedTournaments).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {(auctionTab === 'ongoing' ? ongoingTournaments : completedTournaments).map(tournament => (
                                    <div
                                        key={tournament.id}
                                        className="bg-gradient-to-br from-white/10 to-gray-400/20 rounded-2xl p-6 shadow-lg border-2 border-gray-300/30 hover:border-orange-300/50 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                                    >
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
                                        <div className="text-center">
                                            <h3 className="text-2xl font-bold text-white mb-2">{tournament.name}</h3>
                                            <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${tournament.status === 'completed'
                                                ? 'bg-gray-800/30 text-gray-200'
                                                : 'bg-orange-500/30 text-orange-100'
                                                }`}>
                                                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
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
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewerPage;