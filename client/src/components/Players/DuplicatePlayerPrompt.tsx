import React from 'react';
import { Player } from '../../types';
import { getOptimizedImageUrl } from '../../utils/cloudinary';

export type DuplicateDecision = 'existing' | 'new' | 'cancel';

interface IncomingPlayerData extends Partial<Player> {
    name: string;
    photo?: string;
}

interface DuplicatePlayerPromptProps {
    existing: Player;
    incoming: IncomingPlayerData;
    source?: 'manual' | 'excel';
    onDecision: (decision: DuplicateDecision) => void;
}

const formatCurrency = (amount?: number) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

const PlayerSummaryCard: React.FC<{ title: string; data: IncomingPlayerData | Player }> = ({ title, data }) => {
    const cleanedName = data.name || 'Unknown';
    const photo = data.photo ? getOptimizedImageUrl(data.photo, { width: 200, height: 200 }) : '';

    const infoRows: { label: string; value: React.ReactNode }[] = [
        { label: 'Category', value: data.category || '—' },
        { label: 'Primary Role', value: data.primaryRole || data.role || '—' },
        { label: 'Batting Style', value: data.battingStyle || '—' },
        { label: 'Bowling Style', value: data.bowlingStyle || '—' },
        { label: 'Base Price', value: formatCurrency(data.basePrice) },
        { label: 'Current Price', value: formatCurrency(data.price) },
        { label: 'Status', value: data.status || '—' },
        { label: 'Previous Team', value: data.previousYearTeam || '—' },
        { label: 'Station', value: (data as Player).station || (data as IncomingPlayerData).station || '—' },
        { label: 'Age', value: data.age ?? '—' },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center space-x-3">
                {photo ? (
                    <img src={photo} alt={cleanedName} className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-100" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-semibold">
                        {cleanedName.slice(0, 2).toUpperCase()}
                    </div>
                )}
                <div>
                    <p className="text-sm uppercase tracking-wide text-gray-500">{title}</p>
                    <h4 className="text-lg font-semibold text-gray-900">{cleanedName}</h4>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
                {infoRows.map(({ label, value }) => (
                    <div key={label} className="flex flex-col bg-gray-50 rounded-lg p-3">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">{label}</span>
                        <span className="text-gray-900 font-medium">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DuplicatePlayerPrompt: React.FC<DuplicatePlayerPromptProps> = ({ existing, incoming, source = 'manual', onDecision }) => {
    const contextMessage =
        source === 'excel'
            ? 'This player from your Excel sheet looks similar to someone already in the system.'
            : 'This player looks similar to someone already in the system.';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                    <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Possible duplicate detected</p>
                    <h3 className="text-2xl font-semibold text-gray-900 mt-2">Are these the same player?</h3>
                    <p className="text-gray-600 mt-2">{contextMessage} Please compare the details below.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50">
                    <PlayerSummaryCard title="Existing record" data={existing} />
                    <PlayerSummaryCard title={source === 'excel' ? 'Excel entry' : 'New entry'} data={incoming} />
                </div>
                <div className="p-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                    <div className="text-sm text-gray-500">
                        Selecting <span className="font-semibold text-emerald-600">"Same player"</span> will reuse the existing profile and only add tournament-specific data.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => onDecision('existing')}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Same player
                        </button>
                        <button
                            onClick={() => onDecision('new')}
                            className="px-4 py-2 rounded-lg bg-white text-gray-900 font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Different player
                        </button>
                        <button
                            onClick={() => onDecision('cancel')}
                            className="px-4 py-2 rounded-lg text-gray-500 font-medium hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DuplicatePlayerPrompt;

