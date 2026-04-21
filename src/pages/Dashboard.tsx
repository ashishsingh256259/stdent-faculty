import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { Plus, Search, School as ClassIcon, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Classroom {
  classId: string;
  name: string;
  description: string;
  teacherId: string;
  inviteCode: string;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  useEffect(() => {
    if (!user) return;

    if (profile?.role === 'teacher') {
      const q = query(collection(db, 'classrooms'), where('teacherId', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        setClassrooms(snapshot.docs.map(doc => ({ ...doc.data() } as Classroom)));
      });
    } else {
      const qMemberships = query(collection(db, 'classrooms'));
      return onSnapshot(qMemberships, (snapshot) => {
         setClassrooms(snapshot.docs.map(doc => ({ ...doc.data() } as Classroom)));
      });
    }
  }, [user, profile]);

  const handleCreateClass = async () => {
    if (!newClassName || !user) return;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docRef = doc(collection(db, 'classrooms'));
    const classData = {
      classId: docRef.id,
      name: newClassName,
      description: '',
      teacherId: user.uid,
      inviteCode,
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, classData);
    await setDoc(doc(db, 'classrooms', docRef.id, 'members', user.uid), { role: 'teacher' });
    setNewClassName('');
    setShowCreateModal(false);
  };

  const handleJoinClass = async () => {
    if (!inviteCodeInput || !user) return;
    const { getDocs } = await import('firebase/firestore');
    const q = query(collection(db, 'classrooms'), where('inviteCode', '==', inviteCodeInput.toUpperCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const cls = snap.docs[0];
      await setDoc(doc(db, 'classrooms', cls.id, 'members', user.uid), { role: 'student' });
      setInviteCodeInput('');
      setShowJoinModal(false);
    } else {
      alert('Invalid invite code');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 leading-tight">Class Board</h1>
          <p className="text-slate-500 font-medium tracking-tight">Welcome back, {profile?.displayName}.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => profile?.role === 'teacher' ? setShowCreateModal(true) : setShowJoinModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>{profile?.role === 'teacher' ? 'Create Class' : 'Join Class'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classrooms.map((cls, idx) => (
          <motion.div
            key={cls.classId || idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link 
              to={`/classroom/${cls.classId}`}
              className="block group bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-50">
                  <ClassIcon className="w-8 h-8" />
                </div>
                <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{cls.name}</h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-md">{cls.inviteCode}</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Active Board</span>
              </div>
            </Link>
          </motion.div>
        ))}

        {classrooms.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
               <ClassIcon className="w-10 h-10" />
             </div>
             <p className="text-slate-400 font-bold text-xl uppercase tracking-tighter">No classes found</p>
          </div>
        )}
      </div>

      {/* Modal Overlays */}
      <AnimatePresence>
        {(showCreateModal || showJoinModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => { setShowCreateModal(false); setShowJoinModal(false); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 space-y-8"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-3xl font-bold text-slate-900">{showCreateModal ? 'New Board' : 'Join Board'}</h2>
                <button onClick={() => { setShowCreateModal(false); setShowJoinModal(false); }} className="p-2 text-slate-300 hover:text-slate-900"><X /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{showCreateModal ? 'Board Name' : 'Invite Code'}</label>
                  <input 
                    value={showCreateModal ? newClassName : inviteCodeInput}
                    onChange={(e) => showCreateModal ? setNewClassName(e.target.value) : setInviteCodeInput(e.target.value)}
                    type="text" 
                    placeholder={showCreateModal ? "e.g. Neuroscience 101" : "Enter 6-digit code"}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold"
                  />
                </div>
                <button 
                  onClick={showCreateModal ? handleCreateClass : handleJoinClass}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl shadow-lg shadow-indigo-100 font-bold hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  {showCreateModal ? 'Initialize Board' : 'Enter Board'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
