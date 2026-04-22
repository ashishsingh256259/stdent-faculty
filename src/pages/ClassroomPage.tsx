import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { db, storage } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, setDoc, getDoc, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
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
  BookOpen,
  FileText,
  Video,
  Trash2,
  ExternalLink,
  Upload,
  File,
  Loader2,
  Play,
  Globe,
  Image as ImageIcon,
  FileDigit,
  Search
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

interface Member {
  userId: string;
  displayName: string;
  role: 'teacher' | 'student';
  joinedAt: any;
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
  const [members, setMembers] = useState<Member[]>([]);
  const [pollResponses, setPollResponses] = useState<Record<string, any[]>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnon, setIsAnon] = useState(true);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState<'link' | 'document' | 'video' | 'other'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubChat = onSnapshot(qChat, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(messages.reverse());
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

    const qMembers = query(collection(db, `classrooms/${classId}/members`));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ ...doc.data() } as Member)));
    }, (error) => {
      console.warn("Members listener failed:", error);
    });

    return () => {
      unsubQA();
      unsubPolls();
      unsubChat();
      unsubResources();
      unsubMembers();
    };
  }, [classId, user]);

  // Handle individual poll response listeners
  useEffect(() => {
    if (!classId || polls.length === 0) return;

    const unsubs: (() => void)[] = [];

    polls.forEach(poll => {
      const q = query(collection(db, `classrooms/${classId}/polls/${poll.id}/responses`));
      const unsub = onSnapshot(q, (snapshot) => {
        setPollResponses(prev => ({
          ...prev,
          [poll.id]: snapshot.docs.map(doc => doc.data())
        }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [classId, polls]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

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
    if (!newChatMessage.trim() || !user || !classId || !profile) return;
    try {
      const chatCol = collection(db, `classrooms/${classId}/chat_messages`);
      const docRef = doc(chatCol);
      const messageData = {
        messageId: docRef.id,
        classId,
        authorId: user.uid,
        authorName: profile.displayName,
        content: newChatMessage.trim(),
        createdAt: serverTimestamp()
      };
      await setDoc(docRef, messageData);
      setNewChatMessage('');
    } catch (err) {
      console.error("Message send failed:", err);
    }
  };

  const handleAddResource = async () => {
    if (!resourceTitle || (!resourceUrl && !selectedFile) || !classId) return;
    
    setIsUploading(true);
    let finalUrl = resourceUrl;

    try {
      if (selectedFile) {
        const storageRef = ref(storage, `classrooms/${classId}/resources/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        finalUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                resolve(downloadURL);
              });
            }
          );
        });
      }

      const docRef = doc(collection(db, `classrooms/${classId}/resources`));
      await setDoc(docRef, {
        resourceId: docRef.id,
        classId,
        title: resourceTitle,
        description: resourceDescription,
        url: finalUrl,
        type: resourceType,
        createdAt: serverTimestamp()
      });

      // Notify others
      await notifyClassMembers(classId, user?.uid || '', {
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
      setSelectedFile(null);
      setUploadProgress(null);
      setShowResourceModal(false);
    } catch (err) {
      console.error("Failed to add resource:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!classId) return;
    if (!window.confirm("Are you sure you want to remove this resource?")) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, `classrooms/${classId}/resources`, resourceId));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const getResourceIcon = (resource: Resource) => {
    const title = resource.title.toLowerCase();
    if (resource.type === 'video') return <Play className="w-6 h-6" />;
    if (resource.type === 'link') return <Globe className="w-6 h-6" />;
    
    if (title.endsWith('.pdf')) return <FileText className="w-6 h-6" />;
    if (title.endsWith('.png') || title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.gif')) {
      return <ImageIcon className="w-6 h-6" />;
    }
    if (title.endsWith('.zip') || title.endsWith('.rar')) return <FileDigit className="w-6 h-6" />;
    
    if (resource.type === 'document') return <FileText className="w-6 h-6" />;
    return <BookOpen className="w-6 h-6" />;
  };

  const getResourceColor = (resource: Resource) => {
    const title = resource.title.toLowerCase();
    if (resource.type === 'video') return 'bg-red-50 text-red-600';
    if (resource.type === 'link') return 'bg-indigo-50 text-indigo-600';
    if (title.endsWith('.pdf')) return 'bg-rose-50 text-rose-600';
    if (title.endsWith('.png') || title.endsWith('.jpg') || title.endsWith('.jpeg')) return 'bg-emerald-50 text-emerald-600';
    if (resource.type === 'document') return 'bg-amber-50 text-amber-600';
    return 'bg-slate-50 text-slate-600';
  };

  const filteredChatMessages = chatMessages.filter(msg => 
    msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
    msg.authorName.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

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
                {/* Chat Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search messages or authors..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-sm text-slate-600"
                  />
                  {chatSearchQuery && (
                    <button 
                      onClick={() => setChatSearchQuery('')}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar"
                >
                  {filteredChatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        {chatSearchQuery ? <Search className="w-8 h-8" /> : <Hash className="w-8 h-8" />}
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold">
                          {chatSearchQuery ? `No results for "${chatSearchQuery}"` : 'No announcements yet'}
                        </p>
                        <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                          {chatSearchQuery ? 'Try a different search term' : 'Be the first to speak'}
                        </p>
                      </div>
                    </div>
                  )}
                  {filteredChatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.authorId === user?.uid ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className={`text-[10px] font-bold tracking-wider ${msg.authorId === user?.uid ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {msg.authorName}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          {msg.createdAt ? new Date(msg.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                      <div className={`px-5 py-3 rounded-3xl max-w-[85%] text-sm font-medium shadow-sm transition-all hover:shadow-md ${
                        msg.authorId === user?.uid 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 flex gap-2">
                  <input 
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Message the class board..."
                    className="flex-1 bg-transparent px-6 py-3 text-sm font-medium focus:outline-none"
                  />
                  <button 
                    onClick={handleSendChatMessage}
                    disabled={!newChatMessage.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-[20px] hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) :
 activeTab === 'resources' ? (
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
                    <div 
                      key={resource.id}
                      className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${getResourceColor(resource)}`}>
                          {getResourceIcon(resource)}
                        </div>
                        
                        <div className="flex gap-2">
                          {profile?.role === 'teacher' && (
                            <button 
                              onClick={() => handleDeleteResource(resource.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <a 
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-slate-900 font-bold group-hover:text-indigo-600 transition-colors truncate flex-1">{resource.title}</h4>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 min-h-[32px]">
                          {resource.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                          {resource.type}
                        </span>
                        <span className="text-[10px] font-medium text-slate-300">
                          {resource.createdAt ? new Date(resource.createdAt?.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
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
                {polls.map((poll) => {
                  const responses = pollResponses[poll.id] || [];
                  const hasVoted = responses.some(r => r.studentId === user?.uid);
                  const showResults = !poll.active || hasVoted;

                  const chartData = poll.options.map((opt, idx) => ({
                    name: opt,
                    votes: responses.filter(r => r.optionIndex === idx).length
                  }));

                  return (
                    <div key={poll.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6 transition-all hover:shadow-md">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-900 font-serif">{poll.question}</h3>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${poll.active ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                          {poll.active ? 'Live Now' : 'Concluded'}
                        </div>
                      </div>

                      {showResults ? (
                        <div className="space-y-6">
                          <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={120} 
                                  axisLine={false} 
                                  tickLine={false}
                                  tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }}
                                />
                                <Tooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const total = responses.length;
                                      const pct = total > 0 ? ((data.votes / total) * 100).toFixed(1) : '0';
                                      return (
                                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-50 animate-in fade-in zoom-in duration-200">
                                          <p className="text-xs font-bold text-slate-900 mb-1">{data.name}</p>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-indigo-600">{data.votes} votes</span>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{pct}%</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="votes" radius={[0, 12, 12, 0]} barSize={32}>
                                  {chartData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} 
                                      className="transition-all duration-300 hover:opacity-80"
                                    />
                                  ))}
                                  <LabelList 
                                    dataKey="votes" 
                                    position="right" 
                                    content={(props: any) => {
                                      const { x, y, width, value } = props;
                                      const total = responses.length;
                                      const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                                      return (
                                        <text x={x + width + 10} y={y + 20} fill="#64748b" fontSize={10} fontWeight={800} className="uppercase tracking-tighter">
                                          {value} ({pct}%)
                                        </text>
                                      );
                                    }}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-4">
                              <div className="flex -space-x-2">
                                {[...Array(Math.min(responses.length, 3))].map((_, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">
                                    {String.fromCharCode(65 + i)}
                                  </div>
                                ))}
                                {responses.length > 3 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                    +{responses.length - 3}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {responses.length} {responses.length === 1 ? 'Pulse' : 'Pulses'} Captured
                              </p>
                            </div>
                            {poll.active && hasVoted && (
                              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-indigo-100">
                                Participation Verified
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {poll.options.map((opt, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleVote(poll.id, idx)}
                              className="w-full text-left p-5 bg-slate-50 border border-transparent rounded-2xl font-bold text-slate-700 hover:border-indigo-600 hover:bg-white transition-all group flex justify-between items-center"
                            >
                              <span>{opt}</span>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Info/Stats Column */}
        <aside className="col-span-4 flex flex-col gap-8">
          {/* Members List */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col h-[400px] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-serif">Class Members</h3>
              <span className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 rounded-lg">{members.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${member.role === 'teacher' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{member.displayName}</p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{member.role}</p>
                    </div>
                  </div>
                  {member.userId === user?.uid && (
                    <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="You"></span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 space-y-6">
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

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Sharing Method</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl">
                        <button 
                          onClick={() => { setSelectedFile(null); setResourceUrl(''); }}
                          className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${!selectedFile ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                          Link
                        </button>
                        <button 
                          className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all relative overflow-hidden ${selectedFile ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFile(file);
                                setResourceUrl('');
                                // Suggest content type based on file
                                if (file.type.includes('video')) setResourceType('video');
                                else if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')) setResourceType('document');
                                else if (file.type.includes('image')) setResourceType('other');
                              }
                            }}
                          />
                          File
                        </button>
                      </div>
                    </div>
                  </div>

                  {!selectedFile ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">URL / Link</label>
                      <input 
                        value={resourceUrl}
                        onChange={(e) => setResourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                          <File className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{selectedFile.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    placeholder="Provide some context..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:outline-none transition-all font-semibold min-h-[80px]"
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

                {isUploading && uploadProgress !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Uploading File</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleAddResource}
                  disabled={!resourceTitle || (!resourceUrl && !selectedFile) || isUploading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {isUploading ? 'Uploading...' : 'Publish Resource'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
