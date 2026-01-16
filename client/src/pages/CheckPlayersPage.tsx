import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicPlayersByTournament } from '../api';
import { Player } from '../types';

const formatCurrency = (amount?: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
};

const CheckPlayersPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!tournamentId) {
        setError('Tournament not found.');
        setIsLoading(false);
        return;
      }
      try {
        const data = await fetchPublicPlayersByTournament(tournamentId);
        if (isMounted) {
          setPlayers(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load players.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const handleImageError = (playerId: string) => {
    setImageLoadErrors(prev => ({ ...prev, [playerId]: true }));
  };

  const categories = useMemo(() => {
    const unique = new Set<string>();
    players.forEach(player => {
      if (player.category) {
        unique.add(player.category);
      }
    });
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (selectedCategory === 'all') return players;
    return players.filter(player => player.category === selectedCategory);
  }, [players, selectedCategory]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [filteredPlayers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Tournament Squad
          </h1>
          <p className="text-gray-600 text-lg">Meet the players competing in this tournament</p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full">
            <span className="text-sm font-semibold text-gray-700">Tournament ID:</span>
            <span className="ml-2 text-sm font-bold text-orange-600">{tournamentId}</span>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <label htmlFor="categoryFilter" className="text-sm font-semibold text-gray-700">
              Filter by category
            </label>
            <div className="relative">
              <select
                id="categoryFilter"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="appearance-none rounded-full border border-gray-200 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                disabled={categories.length === 1}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="relative inline-block">
              <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-700">Loading the dream team...</p>
            <p className="text-gray-500">Please wait while we gather the players</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedPlayers.length === 0 && (
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-2xl p-12 text-center shadow-xl">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Players Found</h3>
              <p className="text-gray-600 mb-6">
                {selectedCategory === 'all'
                  ? 'The tournament roster is currently empty. Check back soon!'
                  : 'No players match this category.'}
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-gray-300 to-transparent mx-auto rounded-full"></div>
            </div>
          </div>
        )}

        {/* Players Grid */}
        {!isLoading && !error && sortedPlayers.length > 0 && (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 rounded-full shadow-lg">
                <span className="text-white font-bold text-lg">{sortedPlayers.length}</span>
                <span className="ml-3 text-gray-200 font-medium">
                  {selectedCategory === 'all' ? 'Players Registered' : 'Players in Category'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sortedPlayers.map((player) => {
                const initials = player.name
                  ? player.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  : 'P';

                const hasImage = player.photo && !imageLoadErrors[player.id];

                return (
                  <div
                    key={player.id}
                    className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50 to-transparent rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-50 to-transparent rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative p-6">
                      {/* Player Image/Initials - No animation */}
                      <div className="flex items-start gap-5 mb-5">
                        <div className="relative flex-shrink-0">
                          {hasImage ? (
                            <div className="relative flex items-center justify-center w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-gray-50">
                              <img
                                src={player.photo}
                                alt={player.name}
                                className="max-w-full max-h-full w-auto h-auto"
                                style={{
                                  objectFit: 'contain',
                                  objectPosition: 'center',
                                }}
                                loading="lazy"
                                onError={() => handleImageError(player.id)}
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {initials}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2
                            className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-200"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {player.name}
                          </h2>
                          {player.category && (
                            <div className="mt-2">
                              <span className="inline-block px-3 py-1 text-xs font-bold bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-full border border-orange-200 truncate max-w-full">
                                {player.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Player Details */}
                      <div className="space-y-3 pt-5 border-t border-gray-100">
                        {player.age && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Age</span>
                            <span className="text-sm font-bold text-gray-900 bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-1 rounded-lg">
                              {player.age} years
                            </span>
                          </div>
                        )}

                        {player.station && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Station</span>
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] text-right">
                              {player.station}
                            </span>
                          </div>
                        )}

                        {player.primaryRole && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Role</span>
                            <span className="text-sm font-semibold text-gray-900 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1 rounded-lg truncate max-w-[120px] text-right">
                              {player.primaryRole}
                            </span>
                          </div>
                        )}

                        {player.basePrice !== undefined && player.basePrice !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Base Price</span>
                            <span className="text-sm font-semibold text-gray-900 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1 rounded-lg">
                              {formatCurrency(player.basePrice)}
                            </span>
                          </div>
                        )}

                        {player.battingStyle && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Batting</span>
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] text-right">
                              {player.battingStyle}
                            </span>
                          </div>
                        )}

                        {player.bowlingStyle && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Bowling</span>
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] text-right">
                              {player.bowlingStyle}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {/* <div className="mt-6 pt-5 border-t border-gray-100">
                        <button className="w-full py-2.5 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg hover:from-gray-200 hover:to-gray-100 transition-all duration-200 group-hover:shadow-md">
                          View Full Profile
                          <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div> */}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Stats */}
            {/* <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">{sortedPlayers.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Players</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(sortedPlayers.map(p => p.category)).size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Categories</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(sortedPlayers.map(p => p.station)).size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Stations</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(sortedPlayers.map(p => p.primaryRole)).size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Roles</div>
                </div>
              </div>
            </div> */}
          </>
        )}
      </div>
    </div>
  );
};

export default CheckPlayersPage;