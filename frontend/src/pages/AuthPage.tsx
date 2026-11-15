// src/pages/AuthPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, loginDemo } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !fullName)) {
      showToast('error', 'Missing Fields', 'Please fill in all required credentials.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await register(email, password, fullName);
        showToast('success', 'Account Created', `Welcome to InterviewGenie AI, ${fullName}!`);
      } else {
        await login(email, password);
        showToast('success', 'Signed In', 'Welcome back to your interview dashboard.');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Authentication Failed', error.message || 'Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = () => {
    loginDemo();
    showToast('success', 'Demo Candidate Active', 'Logged in as Alex Johnson with mock data loaded.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#0B0F19]">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 mb-3 border border-blue-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create Candidate Account' : 'Welcome to InterviewGenie AI'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp
              ? 'Join thousands of engineers practicing with multi-agent simulations'
              : 'Sign in to access your interview recordings and score reports'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-gray-900/80 p-1 mb-6 border border-gray-800">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-gray-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-gray-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-gray-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Authenticating...' : isSignUp ? 'Register & Begin' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <span className="relative px-3 bg-[#111827] text-[11px] text-gray-400 uppercase tracking-wider">
            Or quick demo
          </span>
        </div>

        {/* 1-Click Demo Login */}
        <button
          type="button"
          onClick={handleDemoSignIn}
          className="w-full py-2.5 px-4 rounded-xl border border-blue-500/30 hover:border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>1-Click Instant Demo Login (Candidate)</span>
        </button>
      </div>
    </div>
  );
};
