import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, BookOpen } from 'lucide-react';

export default function RoleSelection() {
  const { setRole } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-light">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-semibold text-brand">Choose your role</h2>
          <p className="text-gray-500">How will you be using EduBridge?</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setRole('teacher')}
            className="w-full flex items-center p-6 bg-brand-light rounded-3xl border-2 border-transparent hover:border-brand transition-all group"
          >
            <div className="w-14 h-14 bg-brand text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="ml-5 text-left">
              <h4 className="font-serif text-xl font-medium text-brand">I am a Teacher</h4>
              <p className="text-sm text-gray-500">Create classes and manage communication.</p>
            </div>
          </button>

          <button
            onClick={() => setRole('student')}
            className="w-full flex items-center p-6 bg-gray-50 rounded-3xl border-2 border-transparent hover:border-brand transition-all group"
          >
            <div className="w-14 h-14 bg-gray-200 text-gray-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="ml-5 text-left">
              <h4 className="font-serif text-xl font-medium text-gray-800">I am a Student</h4>
              <p className="text-sm text-gray-500">Join classes and participate in discussions.</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
