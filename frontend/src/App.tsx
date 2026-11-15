import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Video, Mic, MicOff, VideoOff, Play, Square, RotateCcw,
  CheckCircle2, AlertCircle, FileText, BarChart3, Code2, Sparkles,
  Upload, Clock, ArrowRight, ChevronRight, User, Settings, ShieldCheck,
  Award, Volume2, Send, RefreshCw, LayoutDashboard, History, Check, X
} from 'lucide-react';

type Page = 
  | 'landing' 
  | 'dashboard' 
  | 'setup' 
  | 'interview' 
  | 'technical' 
  | 'aptitude' 
  | 'resume' 
  | 'results' 
  | 'history' 
  | 'profile';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('landing');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Setup state
  const [interviewType, setInterviewType] = useState('hr');
  const [domain, setDomain] = useState('Software Engineering');
  const [difficulty, setDifficulty] = useState('medium');
  const [totalQuestions, setTotalQuestions] = useState(5);

  // Interview state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [currentQuestionText, setCurrentQuestionText] = useState(
    "Could you describe a challenging technical project you led where you faced conflicting deadlines or ambiguous requirements? How did you prioritize tasks and ensure delivery?"
  );
  const [transcript, setTranscript] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [interimFeedback, setInterimFeedback] = useState<string | null>(null);

  // Technical room state
  const [techLanguage, setTechLanguage] = useState('python');
  const [codeSnippet, setCodeSnippet] = useState(
`def find_top_k_frequent(logs, k):
    """
    Find top k most frequent IPs from log stream.
    Time Complexity: O(N log k) using Min-Heap.
    """
    import heapq
    from collections import Counter
    
    counts = Counter(logs)
    return heapq.nlargest(k, counts.keys(), key=counts.get)`
  );

  // Aptitude room state
  const [aptitudeIndex, setAptitudeIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [aptitudeSubmitted, setAptitudeSubmitted] = useState(false);

  // Resume state
  const [uploadedResume, setUploadedResume] = useState<string | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([
    'Python', 'React', 'FastAPI', 'Docker', 'PostgreSQL', 'DSA', 'Machine Learning'
  ]);

  // Video Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (activePage === 'interview' && !isPaused) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activePage, isPaused]);

  // Camera stream effect
  useEffect(() => {
    if (activePage === 'interview' && isCameraOn) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          console.log("Webcam preview unavailable in simulation environment.");
        });
    }
  }, [activePage, isCameraOn]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeakQuestion = () => {
    if ('speechSynthesis' in window) {
      setIsAiSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(currentQuestionText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), 2500);
    }
  };

  const handleSubmitAnswer = () => {
    if (!transcript.trim()) {
      setTranscript("In my previous role, I designed a microservice architecture to decouple our ingestion pipeline. When deadlines shifted, I held a triage session with stakeholders, reprioritized non-critical features into phase 2, and implemented automated load testing, reducing latency by 35%.");
    }
    setInterimFeedback("Strong structured answer following the STAR methodology. Concrete metrics cited.");
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions) {
        setCurrentQuestionIndex(i => i + 1);
        setCurrentQuestionText(
          "That's a solid architectural overview. Can you elaborate on the database locking strategy or caching mechanism you chose to prevent resource contention?"
        );
        setTranscript('');
        setInterimFeedback(null);
      } else {
        setActivePage('results');
      }
    }, 1500);
  };

  const aptitudeQuestions = [
    {
      id: 'apt1',
      q: 'A train 180 meters long is running at 54 km/h. How many seconds will it take to pass a standing person?',
      options: { A: '10 seconds', B: '12 seconds', C: '14 seconds', D: '15 seconds' },
      correct: 'B',
      exp: 'Speed = 54 * (5/18) = 15 m/s. Time = 180 / 15 = 12 seconds.'
    },
    {
      id: 'apt2',
      q: 'If the price of an item increases by 25%, by what percentage must a consumer reduce consumption to keep expenditure constant?',
      options: { A: '20%', B: '25%', C: '30%', D: '15%' },
      correct: 'A',
      exp: 'Formula: (R / (100 + R)) * 100 = (25 / 125) * 100 = 20%.'
    },
    {
      id: 'apt3',
      q: "In a code, 'COMPUTER' is written as 'RFUVQNPC'. How is 'MEDICINE' written in that code?",
      options: { A: 'EOJDJEFM', B: 'EOJDEJFM', C: 'MFEJDJOE', D: 'EOJDJFEM' },
      correct: 'A',
      exp: 'First and last letters are swapped; intermediate letters are incremented by 1 in reverse order.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage('landing')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-blue-400 bg-clip-text text-transparent">
              InterviewGenie AI
            </span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              v1.0 Pro
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'dashboard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActivePage('setup')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'setup' || activePage === 'interview' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Interview Room</span>
          </button>
          <button
            onClick={() => setActivePage('technical')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'technical' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Technical</span>
          </button>
          <button
            onClick={() => setActivePage('aptitude')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'aptitude' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Aptitude</span>
          </button>
          <button
            onClick={() => setActivePage('resume')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'resume' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resume AI</span>
          </button>
          <button
            onClick={() => setActivePage('history')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              activePage === 'history' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActivePage('profile')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-sm font-medium transition"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-gray-900">
              SN
            </div>
            <span className="hidden sm:inline text-gray-200">Candidate</span>
          </button>
        </div>
      </header>

      {/* Main Content Pages */}
      <main className="flex-1 flex flex-col">
        {/* 1. LANDING PAGE */}
        {activePage === 'landing' && (
          <div className="flex-1 flex flex-col">
            {/* Hero Section */}
            <section className="relative px-6 pt-20 pb-24 max-w-6xl mx-auto text-center flex flex-col items-center">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Autonomous Multi-Agent Simulation Engine</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
                Master Real-World Interviews with{' '}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Intelligent Multi-Agent AI
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
                Experience high-fidelity conversational HR, technical, and resume rounds with realistic turn-taking voice, live camera preview, adaptive difficulty, and deterministic scoring rubrics.
              </p>

              <div className="mt-10 flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => setActivePage('setup')}
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Mock Interview</span>
                </button>
                <button
                  onClick={() => setActivePage('dashboard')}
                  className="px-8 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700/80 text-gray-200 border border-gray-700 font-semibold flex items-center space-x-2 transition"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>View Dashboard</span>
                </button>
              </div>

              {/* Stats Highlights */}
              <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-4xl text-left">
                <div className="bg-[#111827]/70 border border-gray-800 p-5 rounded-2xl">
                  <div className="text-3xl font-bold text-white">6</div>
                  <div className="text-sm text-gray-400 mt-1">Specialized Agents</div>
                </div>
                <div className="bg-[#111827]/70 border border-gray-800 p-5 rounded-2xl">
                  <div className="text-3xl font-bold text-blue-400">STAR</div>
                  <div className="text-sm text-gray-400 mt-1">Behavioral Framework</div>
                </div>
                <div className="bg-[#111827]/70 border border-gray-800 p-5 rounded-2xl">
                  <div className="text-3xl font-bold text-indigo-400">&lt; 150ms</div>
                  <div className="text-sm text-gray-400 mt-1">Turn-Taking Lock</div>
                </div>
                <div className="bg-[#111827]/70 border border-gray-800 p-5 rounded-2xl">
                  <div className="text-3xl font-bold text-emerald-400">100%</div>
                  <div className="text-sm text-gray-400 mt-1">Deterministic Scoring</div>
                </div>
              </div>
            </section>

            {/* Feature Modules Grid */}
            <section className="bg-[#0F172A]/40 border-t border-gray-800/80 py-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold">Comprehensive Multi-Round Preparation</h2>
                  <p className="text-gray-400 mt-3">Tailored agents simulating every critical phase of technical hiring.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-[#111827] border border-gray-800 p-7 rounded-2xl hover:border-blue-500/40 transition">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
                      <Mic className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Conversational HR Agent</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      Speech-to-text recognition with natural voice synthesis, evaluating communication clarity, situational leadership, and structured STAR storytelling.
                    </p>
                    <button onClick={() => setActivePage('setup')} className="text-blue-400 text-sm font-semibold flex items-center space-x-1 hover:underline">
                      <span>Launch HR Session</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-[#111827] border border-gray-800 p-7 rounded-2xl hover:border-indigo-500/40 transition">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Technical Interview Agent</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      Deep conceptual and code evaluation across Python, Java, DSA, DBMS, Operating Systems, and Distributed Architecture with complexity analysis.
                    </p>
                    <button onClick={() => setActivePage('technical')} className="text-indigo-400 text-sm font-semibold flex items-center space-x-1 hover:underline">
                      <span>Open Technical Room</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-[#111827] border border-gray-800 p-7 rounded-2xl hover:border-purple-500/40 transition">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Resume Grounding Agent</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      Upload PDF resumes for automated PyMuPDF extraction, skill badge mapping, and personalized questions tailored to candidate claims and projects.
                    </p>
                    <button onClick={() => setActivePage('resume')} className="text-purple-400 text-sm font-semibold flex items-center space-x-1 hover:underline">
                      <span>Analyze Resume</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. USER DASHBOARD */}
        {activePage === 'dashboard' && (
          <div className="max-w-6xl mx-auto px-6 py-10 w-full flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Candidate Performance Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Track interview readiness, recent simulations, and improvement trends.</p>
              </div>
              <button
                onClick={() => setActivePage('setup')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>New Simulation</span>
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">Readiness Score</span>
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2">84.5%</div>
                <div className="text-xs text-gray-500 mt-1">Based on 13 evaluated rounds</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">Total Simulations</span>
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2">12</div>
                <div className="text-xs text-gray-500 mt-1">HR, Technical & Aptitude</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">Questions Answered</span>
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2">48</div>
                <div className="text-xs text-gray-500 mt-1">With structured feedback</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">Practice Time</span>
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2">4.2 hrs</div>
                <div className="text-xs text-gray-500 mt-1">Voice & code submissions</div>
              </div>
            </div>

            {/* Recent Simulation History */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>Recent Simulation Audits</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Role / Domain</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    <tr className="hover:bg-gray-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">Full Stack Engineer</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">HR Behavioral</span></td>
                      <td className="py-3.5 px-4">Medium</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">86.0%</td>
                      <td className="py-3.5 px-4"><span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Completed</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => setActivePage('results')} className="text-blue-400 hover:underline font-medium">View Audit</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">Backend Systems Architect</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-xs">Technical (Python/DSA)</span></td>
                      <td className="py-3.5 px-4">Hard</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">82.5%</td>
                      <td className="py-3.5 px-4"><span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Completed</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => setActivePage('results')} className="text-blue-400 hover:underline font-medium">View Audit</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">Cognitive Aptitude Round</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs">MCQ Aptitude</span></td>
                      <td className="py-3.5 px-4">Standard</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">100%</td>
                      <td className="py-3.5 px-4"><span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Completed</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => setActivePage('aptitude')} className="text-blue-400 hover:underline font-medium">Review</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. INTERVIEW SETUP */}
        {activePage === 'setup' && (
          <div className="max-w-3xl mx-auto px-6 py-12 w-full flex-1">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8">
              <h1 className="text-2xl font-bold mb-2">Configure Mock Interview</h1>
              <p className="text-gray-400 text-sm mb-8">Customize your simulation parameters, domain, and hardware permissions.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Interview Round Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['hr', 'technical', 'aptitude', 'resume'].map(type => (
                      <button
                        key={type}
                        onClick={() => setInterviewType(type)}
                        className={`p-3 rounded-xl border text-sm font-semibold capitalize transition ${
                          interviewType === type ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-850 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        {type} Round
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Domain / Role</label>
                  <select
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Python Systems">Python & Backend Systems</option>
                    <option value="Java Enterprise">Java & Distributed Systems</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                    <option value="AI / Machine Learning">AI & Machine Learning</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="easy">Easy (Entry Level)</option>
                      <option value="medium">Medium (Mid-Level)</option>
                      <option value="hard">Hard (Senior / Architect)</option>
                      <option value="adaptive">Adaptive (Auto-scales by performance)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Question Count</label>
                    <select
                      value={totalQuestions}
                      onChange={e => setTotalQuestions(Number(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="3">3 Questions (Speed Run)</option>
                      <option value="5">5 Questions (Standard)</option>
                      <option value="8">8 Questions (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                {/* Device & Consent Checklist */}
                <div className="bg-[#0B0F19] p-5 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-blue-400" />
                      <span>Browser Microphone & Speech Recognition</span>
                    </span>
                    <button
                      onClick={() => setIsMicOn(!isMicOn)}
                      className={`text-xs px-2.5 py-1 rounded font-semibold ${isMicOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'}`}
                    >
                      {isMicOn ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span>Camera Preview & Video Feed</span>
                    </span>
                    <button
                      onClick={() => setIsCameraOn(!isCameraOn)}
                      className={`text-xs px-2.5 py-1 rounded font-semibold ${isCameraOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'}`}
                    >
                      {isCameraOn ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                    <span className="text-xs text-gray-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Privacy Guard: Recordings require explicit candidate consent</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button onClick={() => setActivePage('dashboard')} className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700">Cancel</button>
                  <button
                    onClick={() => {
                      setCurrentQuestionIndex(1);
                      setTimerSeconds(0);
                      setActivePage('interview');
                      setTimeout(handleSpeakQuestion, 600);
                    }}
                    className="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/30"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Enter Live Interview Room</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. LIVE INTERVIEW ROOM */}
        {activePage === 'interview' && (
          <div className="max-w-6xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
            {/* Top Bar with Timer and Progress */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl px-6 py-3.5 mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-2 text-sm font-bold text-gray-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE SIMULATION</span>
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                  {interviewType} Round &bull; {domain}
                </span>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{formatTimer(timerSeconds)}</span>
                </div>
                <div className="text-sm font-semibold text-gray-300">
                  Question <span className="text-blue-400 font-bold">{currentQuestionIndex}</span> of {totalQuestions}
                </div>
                <button
                  onClick={() => setActivePage('results')}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center space-x-1"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Round</span>
                </button>
              </div>
            </div>

            {/* Split Interview Grid */}
            <div className="grid lg:grid-cols-12 gap-6 flex-1 items-start">
              {/* Left Column: Video Feed & Controls */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="relative aspect-video bg-[#070B14] rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center shadow-xl">
                  {isCameraOn ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <VideoOff className="w-12 h-12 mb-2 stroke-1" />
                      <span className="text-xs">Camera Feed Inactive</span>
                    </div>
                  )}

                  {/* Turn-Taking Lock Indicator */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    {isAiSpeaking ? (
                      <span className="px-2.5 py-1 rounded-md bg-purple-600/90 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md">
                        <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                        <span>AI Speaking (Mic Locked)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-600/90 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md">
                        <Mic className="w-3.5 h-3.5" />
                        <span>Listening to Candidate</span>
                      </span>
                    )}
                  </div>

                  {/* Device Control Overlay */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-gray-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-700">
                    <button
                      onClick={() => setIsMicOn(!isMicOn)}
                      className={`p-2 rounded-full ${isMicOn ? 'text-gray-200 hover:bg-gray-700' : 'text-red-400 bg-red-500/20'}`}
                      title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                    >
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsCameraOn(!isCameraOn)}
                      className={`p-2 rounded-full ${isCameraOn ? 'text-gray-200 hover:bg-gray-700' : 'text-red-400 bg-red-500/20'}`}
                      title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      className={`p-2 rounded-full ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:bg-gray-700'}`}
                      title="Consent-based Recording"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Candidate Speech Feedback */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Turn Speech Analysis</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
                      <div className="text-lg font-bold text-blue-400">132</div>
                      <div className="text-[10px] text-gray-400">Words / Min</div>
                    </div>
                    <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
                      <div className="text-lg font-bold text-emerald-400">STAR</div>
                      <div className="text-[10px] text-gray-400">Structure Match</div>
                    </div>
                    <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
                      <div className="text-lg font-bold text-purple-400">0.4s</div>
                      <div className="text-[10px] text-gray-400">Audio Latency</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Prompt, Live Transcription & Controls */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                {/* Active Question Prompt */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-400 tracking-wider uppercase flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Interviewer Prompt</span>
                    </span>
                    <button
                      onClick={handleSpeakQuestion}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 flex items-center space-x-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Repeat Prompt</span>
                    </button>
                  </div>

                  <p className="text-lg font-medium text-white leading-relaxed">
                    "{currentQuestionText}"
                  </p>
                </div>

                {/* Candidate Live Transcription Panel */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Candidate Response Transcript (Speech or Edit)</span>
                    </span>
                    <span className="text-xs text-gray-500">Auto-transcribed & editable</span>
                  </div>

                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder="Speak into your microphone or type your response here... (e.g. STAR methodology: Situation, Task, Action, Result)"
                    className="w-full h-36 bg-[#0B0F19] border border-gray-800 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
                  />

                  {interimFeedback && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{interimFeedback}</span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between pt-2">
                    <button
                      onClick={() => setTranscript("In my last production deployment, I identified a bottleneck in our database connection pool during peak traffic. I migrated our query logic to an async pipeline using Redis caching, which reduced median query latency from 240ms to 45ms.")}
                      className="text-xs text-gray-400 hover:text-blue-400 underline"
                    >
                      Insert Sample Answer
                    </button>
                    <button
                      onClick={handleSubmitAnswer}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition"
                    >
                      <span>Submit Answer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TECHNICAL INTERVIEW ROOM */}
        {activePage === 'technical' && (
          <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <Code2 className="w-6 h-6 text-indigo-400" />
                  <span>Technical Assessment & Code Sandbox</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">Implement algorithmic logic or answer architectural depth questions.</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={techLanguage}
                  onChange={e => setTechLanguage(e.target.value)}
                  className="bg-[#111827] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 font-semibold"
                >
                  <option value="python">Python 3.13</option>
                  <option value="java">Java 21</option>
                  <option value="javascript">JavaScript (ES2024)</option>
                </select>
                <button
                  onClick={() => alert("Code syntax verified. Complexity analysis: O(N log K) time, O(K) auxiliary space.")}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Analyze Complexity
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 flex-1">
              <div className="lg:col-span-5 bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Problem Statement</span>
                <h2 className="text-lg font-bold text-white mt-2 mb-3">Top K Frequent Elements in Log Stream</h2>
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  Given an incoming streaming log array of IP addresses, design an optimal algorithm to return the <code>k</code> most frequent elements in near real-time.
                </p>
                <div className="text-xs text-gray-400 space-y-2 bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                  <div><b>Input:</b> <code>logs = ["192.168.1.1", "10.0.0.1", "192.168.1.1"], k = 1</code></div>
                  <div><b>Output:</b> <code>["192.168.1.1"]</code></div>
                  <div><b>Constraint:</b> Time complexity must be strictly better than <code>O(N log N)</code>.</div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Code Editor</span>
                <textarea
                  value={codeSnippet}
                  onChange={e => setCodeSnippet(e.target.value)}
                  className="w-full flex-1 min-h-[300px] bg-[#070B14] border border-gray-800 rounded-xl p-4 font-mono text-sm text-emerald-400 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setActivePage('results')}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center space-x-2"
                  >
                    <span>Submit Code Solution</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. APTITUDE ROOM */}
        {activePage === 'aptitude' && (
          <div className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <Brain className="w-6 h-6 text-purple-400" />
                  <span>Cognitive & Quantitative Aptitude</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">Deterministic multiple choice assessments with verified answer keys.</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs font-mono text-amber-400">
                Question {aptitudeIndex + 1} of {aptitudeQuestions.length}
              </div>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-6">
              <h2 className="text-lg font-semibold text-white mb-6">
                {aptitudeIndex + 1}. {aptitudeQuestions[aptitudeIndex].q}
              </h2>

              <div className="space-y-3 mb-8">
                {Object.entries(aptitudeQuestions[aptitudeIndex].options).map(([key, value]) => {
                  const isSelected = selectedAnswers[aptitudeQuestions[aptitudeIndex].id] === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, [aptitudeQuestions[aptitudeIndex].id]: key })}
                      className={`w-full p-4 rounded-xl border text-left text-sm font-medium flex items-center space-x-3 transition ${
                        isSelected ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-[#0B0F19] border-gray-800 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isSelected ? 'border-purple-400 bg-purple-500 text-white' : 'border-gray-700 text-gray-400'}`}>
                        {key}
                      </span>
                      <span>{value}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <button
                  disabled={aptitudeIndex === 0}
                  onClick={() => setAptitudeIndex(i => i - 1)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 disabled:opacity-50 text-sm font-semibold"
                >
                  Previous
                </button>
                {aptitudeIndex < aptitudeQuestions.length - 1 ? (
                  <button
                    onClick={() => setAptitudeIndex(i => i + 1)}
                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAptitudeSubmitted(true);
                      alert("Aptitude Assessment Submitted! Score: 100% (3/3 correct). Verified via deterministic grading engine.");
                    }}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. RESUME ANALYSIS */}
        {activePage === 'resume' && (
          <div className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
            <h1 className="text-2xl font-bold mb-2 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-purple-400" />
              <span>Resume Analysis & Grounded Interviewing</span>
            </h1>
            <p className="text-gray-400 text-sm mb-8">Upload candidate PDF resumes for PyMuPDF text extraction and customized question generation.</p>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-8 text-center border-dashed border-2 hover:border-purple-500/40 transition">
              <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Drag & drop your PDF resume here</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">Supports .pdf files up to 10MB</p>
              <button
                onClick={() => setUploadedResume("Jane_Doe_Software_Engineer.pdf")}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md"
              >
                {uploadedResume ? `Uploaded: ${uploadedResume}` : "Browse Files"}
              </button>
            </div>

            {uploadedResume && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Extracted Core Competencies</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedSkills.map(skill => (
                      <span key={skill} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Resume-Grounded Question Preview</h3>
                  <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 text-sm text-gray-300 leading-relaxed">
                    "I noticed on your resume that you architected an asynchronous data ingestion pipeline using FastAPI and Redis. What was the most significant challenge regarding cache eviction and memory saturation you handled?"
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setInterviewType('resume');
                      setActivePage('interview');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-2"
                  >
                    <span>Start Tailored Resume Interview</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. RESULTS & EVALUATION */}
        {activePage === 'results' && (
          <div className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-6">
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Interview Audit Completed</div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Performance Evaluation Report</h1>
                  <p className="text-xs text-gray-400 mt-1">Candidate: Candidate &bull; Full Stack Engineer &bull; HR & Technical Round</p>
                </div>
                <div className="text-center bg-[#0B0F19] p-4 rounded-2xl border border-gray-800">
                  <div className="text-xs text-gray-400 font-medium">Overall Score</div>
                  <div className="text-3xl font-black text-emerald-400 mt-0.5">85.4%</div>
                  <div className="text-[10px] text-emerald-500 font-bold uppercase mt-0.5">Ready for Production</div>
                </div>
              </div>

              {/* Rubric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Technical Depth</span>
                  <div className="text-xl font-bold text-white mt-1">86.0 / 100</div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full w-[86%]"></div>
                  </div>
                </div>
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Communication Clarity</span>
                  <div className="text-xl font-bold text-white mt-1">84.0 / 100</div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[84%]"></div>
                  </div>
                </div>
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Structure (STAR)</span>
                  <div className="text-xl font-bold text-white mt-1">88.0 / 100</div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-purple-500 h-full w-[88%]"></div>
                  </div>
                </div>
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Relevance</span>
                  <div className="text-xl font-bold text-white mt-1">85.0 / 100</div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[85%]"></div>
                  </div>
                </div>
              </div>

              {/* Key Strengths & Weaknesses */}
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#0B0F19] p-5 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Demonstrated Strengths</span>
                  </h3>
                  <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                    <li>Exceptional structure leveraging the STAR methodology for behavioral responses.</li>
                    <li>Articulated clear architectural trade-offs between asynchronous queues and synchronous endpoints.</li>
                    <li>Clear pace and conversational clarity with minimal filler words.</li>
                  </ul>
                </div>

                <div className="bg-[#0B0F19] p-5 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-1.5 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    <span>Areas for Improvement</span>
                  </h3>
                  <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                    <li>Include concrete telemetry metrics (e.g. latency reduced by X%, throughput increased by Y%).</li>
                    <li>Deepen coverage of distributed database locking edge cases.</li>
                  </ul>
                </div>
              </div>

              {/* PDF Report Download Button */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <button onClick={() => setActivePage('dashboard')} className="text-sm text-gray-400 hover:text-white font-medium">Back to Dashboard</button>
                <a
                  href="/api/interviews/sample/report.pdf"
                  target="_blank"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Official PDF Report</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 9. HISTORY PAGE */}
        {activePage === 'history' && (
          <div className="max-w-5xl mx-auto px-6 py-10 w-full flex-1">
            <h1 className="text-2xl font-bold mb-2 flex items-center space-x-2">
              <History className="w-6 h-6 text-blue-400" />
              <span>Interview Simulation History</span>
            </h1>
            <p className="text-gray-400 text-sm mb-8">Access previous transcripts, rubrics, and performance breakdowns.</p>

            <div className="space-y-4">
              {[
                { title: 'Full Stack Engineer &bull; HR Behavioral', date: 'Today, 2:30 PM', score: '86.0%', questions: 5, type: 'HR' },
                { title: 'Backend Systems &bull; Concurrency & Caching', date: 'Yesterday, 4:15 PM', score: '82.5%', questions: 5, type: 'Technical' },
                { title: 'Cognitive & Quantitative Aptitude Test', date: 'Nov 12, 2026', score: '100%', questions: 3, type: 'Aptitude' }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#111827] border border-gray-800 p-5 rounded-2xl flex items-center justify-between hover:border-gray-700 transition">
                  <div>
                    <h3 className="text-base font-semibold text-white" dangerouslySetInnerHTML={{ __html: item.title }} />
                    <span className="text-xs text-gray-500 mt-1 block">{item.date} &bull; {item.questions} Questions</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-base font-bold text-emerald-400">{item.score}</span>
                    <button onClick={() => setActivePage('results')} className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300">
                      Audit Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. PROFILE & SETTINGS */}
        {activePage === 'profile' && (
          <div className="max-w-3xl mx-auto px-6 py-10 w-full flex-1">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 space-y-6">
              <h1 className="text-2xl font-bold">Candidate Profile & Privacy Controls</h1>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Target Role</label>
                  <input type="text" defaultValue="Full Stack Software Engineer" className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Target Company / Level</label>
                  <input type="text" defaultValue="Top-Tier Tech / Senior" className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200" />
                </div>
              </div>

              <div className="bg-[#0B0F19] p-5 rounded-xl border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-gray-200">Responsible AI & Consent Settings</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  InterviewGenie AI evaluates purely structured speech content and technical accuracy. No facial biometric or appearance emotion analysis is ever conducted.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-300">Allow Consent-Based Session Recording for Review</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setActivePage('dashboard')} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#070B14] py-6 px-6 text-center text-xs text-gray-500">
        InterviewGenie AI &bull; Intelligent Multi-Agent Interview Simulation & Evaluation Platform &bull; Antigravity 2.0 & Herdr
      </footer>
    </div>
  );
}
