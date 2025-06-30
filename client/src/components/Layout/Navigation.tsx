import React from 'react';
import { Settings, Gavel, Eye, Users, Trophy, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const masterTabs = [
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const auctioneerTabs = [
    { id: 'auction', label: 'Conduct Auction', icon: Gavel },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'players', label: 'Players', icon: UserPlus }
  ];

  const viewerTabs = [
    { id: 'auction', label: 'View Auction', icon: Eye },
    { id: 'players', label: 'Players', icon: UserPlus }
  ];

  const getTabs = () => {
    switch (user?.role) {
      case 'master': return masterTabs;
      case 'auctioneer': return auctioneerTabs;
      case 'viewer': return viewerTabs;
      default: return [];
    }
  };

  const tabs = getTabs();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;