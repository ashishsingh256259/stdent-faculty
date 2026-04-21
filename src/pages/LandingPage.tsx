import { motion } from 'motion/react';
import { LogIn, GraduationCap, Users, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-12"
      >
        <div className="space-y-6">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <GraduationCap className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-slate-900 tracking-tight leading-none">
            Bridge <span className="text-indigo-600">Hub</span>
          </h1>
          <p className="max-w-xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
            Bridging the gap between students and educators with real-time, anonymous interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-start text-left space-y-4 group hover:border-indigo-200 transition-colors">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-2xl text-slate-900">For Students</h3>
            <p className="text-slate-500 font-medium">Safe, anonymous Q&A and real-time pulse checks during every lecture.</p>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-start text-left space-y-4 group hover:border-indigo-200 transition-colors">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-2xl text-slate-900">For Educators</h3>
            <p className="text-slate-500 font-medium">Measure understanding instantly and moderate discussions with ease.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={signInWithGoogle}
            className="flex items-center space-x-3 bg-indigo-600 text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign in with Google</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <p className="text-slate-400 text-sm font-medium">Free for students and educational institutions.</p>
        </div>
      </motion.div>
    </div>
  );
}
