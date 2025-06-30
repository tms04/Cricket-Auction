import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import TournamentManager from './components/Master/TournamentManager';
import TeamManager from './components/Master/TeamManager';
import PlayerManager from './components/Players/PlayerManager';
import AuctionInterface from './components/Auction/AuctionInterface';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    switch (user?.role) {
      case 'master': return 'tournaments';
      case 'auctioneer': return 'auction';
      case 'viewer': return 'auction';
      default: return 'tournaments';
    }
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'tournaments':
        return <TournamentManager />;
      case 'teams':
        return <TeamManager />;
      case 'players':
        return <PlayerManager />;
      case 'auction':
        return <AuctionInterface />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <TournamentManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? <Dashboard /> : <LoginForm />;
};

export default App;