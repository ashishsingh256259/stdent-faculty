import { LogOut, GraduationCap, Home, MessageSquare, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: '/dashboard', label: 'Home' },
    { icon: MessageSquare, path: '/qa', label: 'Q&A' },
    { icon: BookOpen, path: '/resources', label: 'Resources' },
    { icon: Clock, path: '/history', label: 'History' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 z-[100]">
      <Link to="/dashboard" className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 mb-4 transition-transform hover:scale-105 active:scale-95">
        E
      </Link>
      
      <nav className="flex flex-col gap-6">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`p-3 rounded-xl transition-all duration-200 ${
              location.pathname === item.path 
                ? 'text-indigo-600 bg-indigo-50 shadow-sm' 
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
            }`}
            title={item.label}
          >
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-6">
        <div className="group relative">
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden cursor-pointer">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                {profile?.displayName?.[0]}
              </div>
            )}
          </div>
          {/* Tooltip or small popover could go here */}
        </div>
        
        <button 
          onClick={() => auth.signOut()}
          className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
}
