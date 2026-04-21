import { LogOut, GraduationCap, Home, MessageSquare, BookOpen, Clock, Bell, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { auth } from '../lib/firebase';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar() {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

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

        {/* Notifications Trigger */}
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className={`p-3 rounded-xl transition-all duration-200 relative ${
            showNotifications
              ? 'text-indigo-600 bg-indigo-50 shadow-sm' 
              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
          }`}
          title="Notifications"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[8px] text-white flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-24 top-6 bottom-6 w-80 bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-[200]"
          >
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Alerts</h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Bell className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">All caught up</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.link) window.location.href = n.link; // Simplified navigation
                    }}
                    className="p-5 bg-white border border-slate-50 rounded-3xl hover:bg-slate-50 transition-all cursor-pointer group relative"
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold text-slate-900 pr-4">{n.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-slate-300 font-bold uppercase mt-2">
                        {n.createdAt ? new Date(n.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <div className="absolute top-5 right-5 w-2 h-2 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
