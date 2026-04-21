import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { 
  MessageSquare, 
  BarChart3, 
  ArrowLeft, 
  Send, 
  ThumbsUp, 
  CheckCircle2, 
  User, 
  UserCheck,
  ChevronRight,
  MoreVertical,
  X,
  Hash,
  Link as LinkIcon,
  Plus,
  BookOpen
} from 'lucide-react';

interface Question {
  id: string;
  content: string;
  authorId: string;
  isAnonymous: boolean;
  upvotes: number;
  answered: boolean;
  createdAt: any;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  results?: Record<number, number>;
}

interface ChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'link' | 'document' | 'video' | 'other';
  createdAt: any;
}

export default function ClassroomPage() {
  const { classId } = useParams();
  const { profile, user } = useAuth();
  const { notifyClassMembers } = useNotifications();
  const [classroom, setClassroom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'qa' | 'polls' | 'chat' | 'resources'>('chat');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnon, setIsAnon] = useState(true);
  const [newChatMessage, setNewChatMessage] = useState('');

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState<'link' | 'document' | 'video' | 'other'>('link');

  useEffect(() => {
    if (!classId || !user) return;

    const fetchClass = async () => {
      const snap = await getDoc(doc(db, 'classrooms', classId));
      if (snap.exists()) setClassroom(snap.data());
    };
    fetchClass();

    // Only set up listeners if we have a user
    const qQuestions = query(
      collection(db, `classrooms/${classId}/questions`),
      orderBy('createdAt', 'desc')
    );
    const unsubQA = onSnapshot(qQuestions, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
    }, (error) => {
      console.warn("Questions listener failed:", error);
    });

    const qPolls = query(
      collection(db, `classrooms/${classId}/polls`),
      orderBy('createdAt', 'desc')
    );
    const unsubPolls = onSnapshot(qPolls, (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    }, (error) => {
      console.warn("Polls listener failed:", error);
    });

    const qChat = query(
      collection(db, `classrooms/${classId}/chat_messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubChat = onSnapshot(qChat, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      console.warn("Chat listener failed:", error);
    });

    const qResources = query(
      collection(db, `classrooms/${classId}/resources`),
      orderBy('createdAt', 'desc')
    );
    const unsubResources = onSnapshot(qResources, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => {
      console.warn("Resources listener failed:", error);
    });

    return () => {
      unsubQA();
      unsubPolls();
      unsubChat();
      unsubResources();
    };
  }, [classId, user]);

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim() || !user || !classId) return;
    const docRef = doc(collection(db, `classrooms/${classId}/questions`));
    await setDoc(docRef, {
      questionId: docRef.id,
      classId,
      authorId: user.uid,
      content: newQuestion,
      isAnonymous: isAnon,
      upvotes: 0,
      answered: false,
      createdAt: serverTimestamp()
    });

    // Notify others
    await notifyClassMembers(classId, user.uid, {
      type: 'new_question',
      title: 'New Question',
      message: `${isAnon ? 'An anonymous student' : profile?.displayName} asked: "${newQuestion.substring(0, 50)}${newQuestion.length > 50 ? '...' : ''}"`,
      classId,
      link: `/classroom/${classId}`
    });

    setNewQuestion('');
  };

  const handleUpvote = async (qId: string, current: number) => {
    if (!classId) return;
    await updateDoc(doc(db, `classrooms/${classId}/questions`, qId), {
      upvotes: current + 1
    });
  };

  const handleMarkAnswered = async (qId: string) => {
    if (!classId) return;
    await updateDoc(doc(db, `classrooms/${classId}/questions`, qId), {
      answered: true
    });
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion || pollOptions.some(o => !o) || !classId) return;
    const docRef = doc(collection(db, `classrooms/${classId}/polls`));
    await setDoc(docRef, {
      pollId: docRef.id,
      classId,
      question: pollQuestion,
      options: pollOptions,
      active: true,
      createdAt: serverTimestamp()
    });

    // Notify others
    await notifyClassMembers(classId, user.uid, {
      type: 'poll_update',
      title: 'New Pulse Check',
      message: `Poll created: "${pollQuestion}"`,
      classId,
      link: `/classroom/${classId}`
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollModal(false);
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user || !classId) return;
    await setDoc(doc(db, `classrooms/${classId}/polls/${pollId}/responses`, user.uid), {
      pollId,
      studentId: user.uid,
      optionIndex,
      createdAt: serverTimestamp()
    });
  };

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || !user || !classId) return;
    const docRef = doc(collection(db, `classrooms/${classId}/chat_messages`));
    await setDoc(docRef, {
      messageId: docRef.id,
      classId,
      authorId: user.uid,
      authorName: profile?.displayName || 'Anonymous',
      content: newChatMessage,
      createdAt: serverTimestamp()
    });
    setNewChatMessage('');
  };

  const handleAddResource = async () => {
    if (!resourceTitle || !resourceUrl || !classId) return;
    const docRef = doc(collection(db, `classrooms/${classId}/resources`));
    await setDoc(docRef, {
      resourceId: docRef.id,
      classId,
      title: resourceTitle,
      description: resourceDescription,
      url: resourceUrl,
      type: resourceType,
      createdAt: serverTimestamp()
    });

    // Notify others
    await notifyClassMembers(classId, user.uid, {
      type: 'resource_shared',
      title: 'New Resource Shared',
      message: `A new resource was added: "${resourceTitle}"`,
      classId,
      link: `/classroom/${classId}`
    });

    setResourceTitle('');
    setResourceDescription('');
    setResourceUrl('');
    setResourceType('link');
    setShowResourceModal(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 flex flex-col h-full overflow-hidden">
      <header className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">{classroom?.name || 'Bridge Hub'}</h1>
            <p className="text-slate-500 font-medium italic">Invite Code: {classroom?.inviteCode}</p>
          </div>
        </div>
        <div className="flex gap-4">
           {activeTab === 'qa' && (
             <button 
               onClick={handleSubmitQuestion}
               disabled={!newQuestion.trim()}
               className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
             >
               Post Fast
             </button>
           )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Main Content */}
        <section className="col-span-8 flex flex-col gap-8 overflow-hidden">
          <div className="flex gap-8 border-b border-slate-200 pb-2">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`font-bold transition-all relative ${activeTab === 'chat' ? 'active-tab-sleek' : 'text-slate-400 hover:text-slate-600'}`}
            >
              General Chat
            </button>
            <button 
              onClick={() => setActiveTab('qa')}
              className={`font-bold transition-all relative ${activeTab === 'qa' ? 'active-tab-sleek' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Open Questions
            </button>
            <button 
              onClick={() => setActiveTab('polls')}
              className={`font-bold transition-all relative ${activeTab === 'polls' ? 'active-tab-sleek' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Live Polls
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              className={`font-bold transition-all relative ${activeTab === 'resources' ? 'active-tab-sleek' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Resources
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6 h-[500px]"
              >
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <Hash className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Start the conversation</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.authorId === user?.uid ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{msg.authorName}</span>
                        <span className="text-[10px] text-slate-300">
                          {msg.createdAt ? new Date(msg.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm font-medium ${
                        msg.authorId === user?.uid 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-3">
                  <input 
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                  <button 
                    onClick={handleSendChatMessage}
                    disabled={!newChatMessage.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'resources' ? (
              <motion.div 
                key="resources"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900 font-serif">Class Library</h3>
                  {profile?.role === 'teacher' && (
                    <button 
                      onClick={() => setShowResourceModal(true)}
                      className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Resource
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.length === 0 && (
                    <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold">No resources shared yet</p>
                        <p className="text-slate-400 text-sm">Teachers can upload learning materials here</p>
                      </div>
                    </div>
                  )}
                  {resources.map((resource) => (
                    <a 
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {resource.type === 'link' ? <LinkIcon className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                          {resource.type}
                        </span>
                      </div>
                      <h4 className="text-slate-900 font-bold mb-1 group-hover:text-indigo-600 transition-colors">{resource.title}</h4>
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{resource.description}</p>
                    </a>
                  ))}
                </div>
              </motion.div>
            ) : activeTab === 'qa' ? (
              <motion.div 
                key="qa"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar"
              >
                {/* Ask Interface */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                  <textarea 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Type your question here to bridge the gap..."
                    className="w-full bg-slate-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 focus:outline-none min-h-[100px] text-slate-700 font-medium"
                  />
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setIsAnon(!isAnon)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isAnon ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {isAnon ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      <span>{isAnon ? 'Identity Hidden' : 'Public Post'}</span>
                    </button>
                    <button 
                      onClick={handleSubmitQuestion}
                      disabled={!newQuestion.trim()}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-50 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Release Question</span>
                    </button>
                  </div>
                </div>

                {/* Questions */}
                {questions.map((q) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${q.isAnonymous ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {q.isAnonymous ? '?' : 'i'}
                        </div>
                        <h3 className="font-bold text-slate-800">{q.isAnonymous ? 'Anonymous Query' : 'Public Question'}</h3>
                      </div>
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${q.answered ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {q.answered ? 'Resolved' : 'Active Discussion'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      {q.content}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                       <button 
                         onClick={() => handleUpvote(q.id, q.upvotes)}
                         className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                       >
                         <ThumbsUp className={`w-4 h-4 ${q.upvotes > 0 ? 'fill-indigo-600' : ''}`} />
                         <span>{q.upvotes}</span>
                       </button>

                       {profile?.role === 'teacher' && !q.answered && (
                         <button 
                           onClick={() => handleMarkAnswered(q.id)}
                           className="ml-auto flex items-center gap-1.5 text-emerald-600 font-bold text-sm hover:underline"
                         >
                           <CheckCircle2 className="w-4 h-4" />
                           <span>Resolve</span>
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="polls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6 overflow-y-auto pr-2"
              >
                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-900">{poll.question}</h3>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${poll.active ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                        {poll.active ? 'Live Now' : 'Concluded'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {poll.options.map((opt, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleVote(poll.id, idx)}
                          disabled={!poll.active}
                          className="w-full text-left p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-slate-700 hover:border-indigo-600 hover:bg-white transition-all group flex justify-between items-center disabled:opacity-50"
                        >
                          <span>{opt}</span>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Info/Stats Column */}
        <aside className="col-span-4 flex flex-col gap-6">
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 space-y-6">
             <div className="space-y-1">
               <h3 className="font-bold text-xl uppercase tracking-tight">Active Pulse</h3>
               <p className="text-indigo-100 text-sm font-medium">Real-time engagement metrics.</p>
             </div>
             
             {profile?.role === 'teacher' ? (
                <button 
                  onClick={() => setShowPollModal(true)}
                  className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                   New Pulse Check
                </button>
             ) : (
                <div className="bg-indigo-500/30 p-4 rounded-2xl border border-indigo-400/20 text-center font-bold">
                   You are an Active Participant.
                </div>
             )}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
             <h3 className="font-bold text-slate-800 text-lg">Participation Stats</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsiveness</span>
                    <span className="text-xs font-bold text-emerald-500">92%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anonymity Rate</span>
                    <span className="text-xs font-bold text-indigo-500">68%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[68%]"></div>
                  </div>
                </div>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-tighter">
                  Bridging the gap one query at a time.
                </p>
             </div>
          </div>
        </aside>
      </div>

      {/* Poll Creation Modal */}
      <AnimatePresence>
        {showPollModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setShowPollModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 space-y-8"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-3xl font-bold text-slate-900">New Pulse Check</h2>
                <button onClick={() => setShowPollModal(false)} className="p-2 text-slate-300 hover:text-slate-900"><X /></button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Pulse Question</label>
                  <input 
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Is the synaptic cleft concept clear?"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Responses</label>
                  {pollOptions.map((opt, idx) => (
                    <input 
                      key={idx}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="w-full px-6 py-3 rounded-xl bg-slate-50 border border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold"
                    />
                  ))}
                  <button 
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs text-indigo-600 font-bold hover:underline ml-1"
                  >
                    + Add Selection
                  </button>
                </div>

                <button 
                  onClick={handleCreatePoll}
                  className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Deploy Pulse Check
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResourceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 relative"
            >
              <button 
                onClick={() => setShowResourceModal(false)}
                className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-serif font-bold text-brand leading-tight">Share Resource</h2>
                <p className="text-slate-400 font-medium">Equip your students for success.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                  <input 
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    placeholder="e.g. Week 1 Lecture Slides"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">URL / Link</label>
                  <input 
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    placeholder="Provide some context..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(['link', 'document', 'video', 'other'] as const).map((t) => (
                    <button 
                      key={t}
                      onClick={() => setResourceType(t)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        resourceType === t 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleAddResource}
                  disabled={!resourceTitle || !resourceUrl}
                  className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Publish Resource
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
