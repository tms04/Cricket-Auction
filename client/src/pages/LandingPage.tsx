import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Clock, Target, Zap, Circle, Star } from 'lucide-react';
import { Tournament } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LandingPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/tournaments`)
            .then(res => res.json())
            .then(data => setTournaments(data))
            .finally(() => setLoading(false));
    }, []);

    const grouped = {
        current: tournaments.filter(t => t.status === 'active'),
        upcoming: tournaments.filter(t => t.status === 'upcoming'),
        past: tournaments.filter(t => t.status === 'completed'),
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 z-0">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <pattern id="pattern-circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="1" fill="white" />
                    </pattern>
                    <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
                </svg>
            </div>

            {/* Floating accent elements */}
            <div className="absolute left-10 top-1/4 w-32 h-32 rounded-full bg-yellow-500 opacity-10 blur-3xl -z-1"></div>
            <div className="absolute right-20 top-1/2 w-40 h-40 rounded-full bg-green-500 opacity-10 blur-3xl -z-1"></div>
            <div className="absolute left-1/3 bottom-20 w-48 h-48 rounded-full bg-red-500 opacity-10 blur-3xl -z-1"></div>

            {/* Navigation placeholder */}
            <nav className="w-full max-w-7xl mx-auto py-6 px-4 flex justify-between items-center z-20">
                <div className="flex items-center space-x-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="#E53E3E" stroke="#FFD700" strokeWidth="2" />
                        <path d="M10 16 Q16 20 22 16" stroke="#fff" strokeWidth="2" fill="none" />
                    </svg>
                    <span className="text-xl font-bold text-white">CricketAuction</span>
                </div>
                <div className="hidden md:flex space-x-6">
                    <a href="/" className="text-white hover:text-yellow-400 transition-colors">Home</a>
                    <a href="/about" className="text-white hover:text-yellow-400 transition-colors">About</a>
                    <a href="/tournaments" className="text-white hover:text-yellow-400 transition-colors">Tournaments</a>
                    <a href="/contact" className="text-white hover:text-yellow-400 transition-colors">Contact</a>
                </div>
                <div className="flex space-x-4">
                    <a href="/login" className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors">Login</a>
                    <a href="/register" className="px-4 py-2 text-sm font-medium text-white border border-yellow-500 rounded-lg hover:bg-yellow-500/10 transition-colors">Register</a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center pt-24 pb-16 px-4 relative z-20">
                <div className="relative mb-8">
                    <div className="absolute -inset-4 bg-yellow-500/20 rounded-full blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full">
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="30" r="24" fill="#E53E3E" stroke="#FFD700" strokeWidth="3" />
                            <path d="M18 30 Q30 38 42 30" stroke="#fff" strokeWidth="3" fill="none" />
                            <circle cx="30" cy="30" r="24" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold text-center text-white mb-6 leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
                        Professional Cricket Auctions
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-300 text-center max-w-3xl mb-10 leading-relaxed">
                    Build your dream cricket team through competitive auctions. Join professional tournaments and compete with the best.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-md">
                    <a
                        href="/login"
                        className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                        <Zap className="w-5 h-5" />
                        Join Auction
                    </a>
                    <a
                        href="/viewer"
                        className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                        <Users className="w-5 h-5" />
                        Watch Live
                    </a>
                </div>
            </section>

            {/* Stats Section */}
            <section className="w-full max-w-7xl mx-auto my-16 px-4 z-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">50+</div>
                        <div className="text-gray-300">Tournaments</div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">1K+</div>
                        <div className="text-gray-300">Players</div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">10K+</div>
                        <div className="text-gray-300">Bids</div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">24/7</div>
                        <div className="text-gray-300">Support</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full max-w-7xl mx-auto my-16 px-4 z-20">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
                    <span className="relative">
                        <span className="relative z-10">Platform Features</span>
                        <span className="absolute bottom-0 left-0 w-full h-2 bg-yellow-500/30 -z-1" style={{ bottom: '5px' }}></span>
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all duration-300 group">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Tournament Management</h3>
                        <p className="text-gray-300">Create and manage cricket tournaments with custom rules, budgets, and team configurations.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all duration-300 group">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Live Auctions</h3>
                        <p className="text-gray-300">Real-time bidding with professional auctioneers and instant updates for all participants.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all duration-300 group">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Team Building</h3>
                        <p className="text-gray-300">Strategic team composition with player categories, budgets, and performance tracking.</p>
                    </div>
                </div>
            </section>

            {/* Tournament Schedule Section */}
            <section className="w-full max-w-7xl mx-auto my-16 px-4 z-20">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
                    <span className="relative">
                        <span className="relative z-10">Tournament Schedule</span>
                        <span className="absolute bottom-0 left-0 w-full h-2 bg-yellow-500/30 -z-1" style={{ bottom: '5px' }}></span>
                    </span>
                </h2>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
                        <p className="text-gray-400">Loading tournaments...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Link
                            to="/viewer?tab=current"
                            className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl p-6 border border-green-700/50 hover:border-green-500 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center border border-green-500/30 group-hover:bg-green-600/30 transition-colors">
                                    <Clock className="w-5 h-5 text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Live Matches</h3>
                            </div>

                            {grouped.current.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No active tournaments</p>
                            ) : (
                                <div className="space-y-4">
                                    {grouped.current.map(t => (
                                        <div key={t.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-green-500/50 transition-colors">
                                            <div className="font-bold text-white">{t.name}</div>
                                            <div className="text-sm text-gray-400 mt-1">{t.startDate} - {t.endDate}</div>
                                            <div className="text-xs text-green-400 mt-2">Budget: ₹{t.budget.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Link>

                        <Link
                            to="/viewer?tab=upcoming"
                            className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 rounded-xl p-6 border border-yellow-700/50 hover:border-yellow-500 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center border border-yellow-500/30 group-hover:bg-yellow-600/30 transition-colors">
                                    <Calendar className="w-5 h-5 text-yellow-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Upcoming</h3>
                            </div>

                            {grouped.upcoming.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No upcoming tournaments</p>
                            ) : (
                                <div className="space-y-4">
                                    {grouped.upcoming.map(t => (
                                        <div key={t.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-yellow-500/50 transition-colors">
                                            <div className="font-bold text-white">{t.name}</div>
                                            <div className="text-sm text-gray-400 mt-1">{t.startDate} - {t.endDate}</div>
                                            <div className="text-xs text-yellow-400 mt-2">Budget: ₹{t.budget.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Link>

                        <Link
                            to="/viewer?tab=past"
                            className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-500 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gray-600/20 rounded-lg flex items-center justify-center border border-gray-500/30 group-hover:bg-gray-600/30 transition-colors">
                                    <Trophy className="w-5 h-5 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Completed</h3>
                            </div>

                            {grouped.past.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No completed tournaments</p>
                            ) : (
                                <div className="space-y-4">
                                    {grouped.past.map(t => (
                                        <div key={t.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-500/50 transition-colors">
                                            <div className="font-bold text-white">{t.name}</div>
                                            <div className="text-sm text-gray-400 mt-1">{t.startDate} - {t.endDate}</div>
                                            <div className="text-xs text-gray-400 mt-2">Budget: ₹{t.budget.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Link>
                    </div>
                )}
            </section>

            {/* Testimonials Section */}
            <section className="w-full max-w-7xl mx-auto my-16 px-4 z-20">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
                    <span className="relative">
                        <span className="relative z-10">What Our Users Say</span>
                        <span className="absolute bottom-0 left-0 w-full h-2 bg-yellow-500/30 -z-1" style={{ bottom: '5px' }}></span>
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
                        <div className="flex items-center mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                            ))}
                        </div>
                        <p className="text-gray-300 mb-6">"The most professional cricket auction platform I've used. The live bidding experience is unmatched."</p>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                            <div>
                                <div className="font-bold text-white">Rahul Sharma</div>
                                <div className="text-sm text-gray-400">Team Owner</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
                        <div className="flex items-center mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                            ))}
                        </div>
                        <p className="text-gray-300 mb-6">"Incredible features for team management. The analytics help us make better bidding decisions."</p>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                            <div>
                                <div className="font-bold text-white">Priya Patel</div>
                                <div className="text-sm text-gray-400">Team Manager</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
                        <div className="flex items-center mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                            ))}
                        </div>
                        <p className="text-gray-300 mb-6">"As a professional auctioneer, this platform gives me all the tools I need to run smooth auctions."</p>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                            <div>
                                <div className="font-bold text-white">Vikram Singh</div>
                                <div className="text-sm text-gray-400">Auctioneer</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="w-full max-w-5xl mx-auto my-24 px-4 z-20">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-12 text-center border border-gray-700 relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-yellow-500/10 blur-3xl -z-1"></div>
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-green-500/10 blur-3xl -z-1"></div>

                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Join the Action?</h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Register now and start building your championship-winning cricket team today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/register"
                            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Create Account
                        </a>
                        <a
                            href="/tournaments"
                            className="px-8 py-4 bg-transparent hover:bg-gray-700/50 border border-gray-600 text-white font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Browse Tournaments
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full bg-gray-900/50 backdrop-blur-md border-t border-gray-800 mt-24 py-12 z-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" fill="#E53E3E" stroke="#FFD700" strokeWidth="1.5" />
                                    <path d="M8 12 Q12 15 16 12" stroke="#fff" strokeWidth="1.5" fill="none" />
                                </svg>
                                <span className="text-lg font-bold text-white">CricketAuction</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                The premier platform for professional cricket player auctions and team management.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">Quick Links</h4>
                            <ul className="space-y-2">
                                <li><a href="/" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Home</a></li>
                                <li><a href="/about" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">About</a></li>
                                <li><a href="/tournaments" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Tournaments</a></li>
                                <li><a href="/contact" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">Legal</h4>
                            <ul className="space-y-2">
                                <li><a href="/privacy" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Privacy Policy</a></li>
                                <li><a href="/terms" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Terms of Service</a></li>
                                <li><a href="/refund" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">Refund Policy</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">Contact</h4>
                            <ul className="space-y-2">
                                <li className="text-gray-400 text-sm">info@cricketauction.com</li>
                                <li className="text-gray-400 text-sm">+1 (555) 123-4567</li>
                                <li className="text-gray-400 text-sm">Mumbai, India</li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-500 text-sm mb-4 md:mb-0">
                            &copy; {new Date().getFullYear()} Cricket Auction Platform. All rights reserved.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-500 hover:text-yellow-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                </svg>
                            </a>
                            <a href="#" className="text-gray-500 hover:text-yellow-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </a>
                            <a href="#" className="text-gray-500 hover:text-yellow-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Animations */}
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default LandingPage;