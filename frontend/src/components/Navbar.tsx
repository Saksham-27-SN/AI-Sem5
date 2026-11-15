// src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  LayoutDashboard,
  Video,
  Code,
  Brain,
  FileText,
  Award,
  Clock,
  User as UserIcon,
  LogOut,
  LogIn,
  Menu,
  X,
  Play,
  Sliders,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Setup', path: '/setup', icon: Sliders },
    { label: 'Live HR Room', path: '/interview/live', icon: Video },
    { label: 'Technical Room', path: '/interview/technical', icon: Code },
    { label: 'Aptitude Room', path: '/interview/aptitude', icon: Brain },
    { label: 'Resume Upload', path: '/resume', icon: FileText },
    { label: 'Results', path: '/results', icon: Award },
    { label: 'History', path: '/history', icon: Clock },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-[#0B0F19]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                InterviewGenie <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">AI</span>
              </span>
              <span className="hidden sm:block text-[10px] text-gray-400 font-medium tracking-wider uppercase -mt-0.5">
                Multi-Agent Simulator
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-1 ml-4">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action / Auth Controls */}
        <div className="flex items-center gap-3">
          {/* Readiness Score Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-gray-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-gray-400">Readiness:</span>
            <span className="font-semibold text-emerald-400">88% (Strong)</span>
          </div>

          {/* Quick Launch Button */}
          <Link
            to="/setup"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all duration-200"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Practice</span>
          </Link>

          {/* User Profile Menu */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800/60 border border-transparent hover:border-gray-700 transition-all text-xs text-gray-200"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-inner">
                  {user.full_name ? user.full_name.slice(0, 2) : 'AJ'}
                </div>
                <span className="hidden lg:block font-medium max-w-[120px] truncate">
                  {user.full_name}
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl glass-dropdown py-1.5 text-xs text-gray-200 border border-gray-800 shadow-2xl z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-800/80">
                    <p className="font-semibold text-white">{user.full_name}</p>
                    <p className="text-gray-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Candidate Profile & Privacy</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>My Dashboard</span>
                  </Link>
                  <div className="my-1 border-t border-gray-800/80"></div>
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-rose-950/40 text-rose-400 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 bg-gray-800/40 text-gray-200 text-xs font-medium hover:text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-800 bg-[#0B0F19]/95 backdrop-blur-xl px-4 py-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-gray-800 mt-2">
            <Link
              to="/setup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm shadow-md"
            >
              <Play className="w-4 h-4 fill-current" />
              Start New Simulation
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
