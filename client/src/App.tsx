import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import TournamentManager from './components/Master/TournamentManager';
import TeamManager from './components/Master/TeamManager';
import PlayerManager from './components/Players/PlayerManager';
import AuctionInterface from './components/Auction/AuctionInterface';
import LandingPage from './pages/LandingPage';
import ViewerPage from './pages/ViewerPage';
import TournamentPage from './pages/TournamentPage';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState(() => {
    switch (user?.role) {
      case 'master': return 'tournaments';
      case 'auctioneer': return 'auction';
      default: return 'tournaments';
    }
  });

  // Only allow tabs relevant to the user's role
  const getAllowedTabs = () => {
    switch (user?.role) {
      case 'master':
        return ['tournaments', 'teams', 'players', 'settings'];
      case 'auctioneer':
        return ['auction', 'teams', 'players'];
      default:
        return [];
    }
  };
  const allowedTabs = getAllowedTabs();

  // If the current tab is not allowed, switch to the first allowed tab
  React.useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
    // eslint-disable-next-line
  }, [user]);

  const renderContent = () => {
    if (user?.role === 'master') {
      switch (activeTab) {
        case 'tournaments':
          return <TournamentManager />;
        case 'teams':
          return <TeamManager />;
        case 'players':
          return <PlayerManager />;
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
    } else if (user?.role === 'auctioneer') {
      switch (activeTab) {
        case 'auction':
          return <AuctionInterface />;
        case 'teams':
          return <TeamManager />;
        case 'players':
          return <PlayerManager />;
        default:
          return <AuctionInterface />;
      }
    } else {
      // Not allowed
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have access to this dashboard.</p>
        </div>
      );
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/viewer" element={<ViewerPage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tournament/:id" element={<TournamentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;