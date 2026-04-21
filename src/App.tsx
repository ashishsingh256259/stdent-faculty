import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ClassroomPage from './pages/ClassroomPage';
import RoleSelection from './pages/RoleSelection';
import Sidebar from './components/Sidebar';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {user && profile && <Sidebar />}
      <main className={`flex-1 transition-all duration-300 ${user && profile ? 'pl-20' : ''}`}>
        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/role-selection" element={user && !profile ? <RoleSelection /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? (profile ? <Dashboard /> : <Navigate to="/role-selection" />) : <Navigate to="/" />} />
          <Route path="/classroom/:classId" element={user && profile ? <ClassroomPage /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
