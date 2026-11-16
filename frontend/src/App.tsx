// src/App.tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { Sparkles } from 'lucide-react';
import './App.css';

// Code-split pages for high performance and fast initial load
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const InterviewSetupPage = lazy(() => import('./pages/InterviewSetupPage').then((m) => ({ default: m.InterviewSetupPage })));
const LiveInterviewRoomPage = lazy(() => import('./pages/LiveInterviewRoomPage').then((m) => ({ default: m.LiveInterviewRoomPage })));
const TechnicalRoomPage = lazy(() => import('./pages/TechnicalRoomPage').then((m) => ({ default: m.TechnicalRoomPage })));
const AptitudeRoomPage = lazy(() => import('./pages/AptitudeRoomPage').then((m) => ({ default: m.AptitudeRoomPage })));
const ResumeAnalysisPage = lazy(() => import('./pages/ResumeAnalysisPage').then((m) => ({ default: m.ResumeAnalysisPage })));
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageLoader = () => (
  <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-[#0B0F19]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center animate-spin">
        <Sparkles className="w-5 h-5" />
      </div>
      <p className="text-xs text-gray-400 font-medium tracking-wide">Loading module...</p>
    </div>
  </div>
);

export function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
            {/* Global Sticky Navigation */}
            <Navbar />

            {/* Main Application Routes with Code-Splitting */}
            <main className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/setup" element={<InterviewSetupPage />} />
                  <Route path="/interview/live" element={<LiveInterviewRoomPage />} />
                  <Route path="/interview/technical" element={<TechnicalRoomPage />} />
                  <Route path="/interview/aptitude" element={<AptitudeRoomPage />} />
                  <Route path="/resume" element={<ResumeAnalysisPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  {/* 404 Catch-All */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>

            {/* Global Toast Notification Outlet */}
            <ToastContainer />

            {/* Application Shared Footer */}
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
