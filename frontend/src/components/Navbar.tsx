// src/components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  TrendingUp,
  User as UserIcon,
  LogOut,
  LogIn,
  Menu,
  X,
  Play,
  Sliders,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreDropdownOpen(false);
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Primary navigation items (compact short labels to guarantee fit across 1024px, 1280px, and 1440px)
  const primaryNavLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Setup', path: '/setup', icon: Sliders },
    { label: 'Live Room', path: '/interview/live', icon: Video },
    { label: 'Tech IDE', path: '/interview/technical', icon: Code },
    { label: 'Aptitude', path: '/interview/aptitude', icon: Brain },
    { label: 'Resume', path: '/resume', icon: FileText },
  ];

  // Secondary items cleanly grouped under 'More'
  const secondaryNavLinks = [
    { label: 'Results & Rubrics', path: '/results', icon: Award },
    { label: 'Analytics & Trends', path: '/analytics', icon: TrendingUp },
    { label: 'Session History', path: '/history', icon: Clock },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isMoreActive = secondaryNavLinks.some((item) => isActive(item.path));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1E293B] bg-[#0B0F19]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 group rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="InterviewGenie AI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all duration-150">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                InterviewGenie{' '}
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                  AI
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (14px font, WCAG AA contrast) */}
          <nav className="hidden xl:flex items-center gap-1" aria-label="Main Navigation">
            {primaryNavLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-blue-600/15 text-blue-300 border border-blue-500/40'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Secondary 'More' Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isMoreActive
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/40'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>More</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    moreDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {moreDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#131B2E] border border-[#1E293B] shadow-2xl py-1.5 z-50 text-sm">
                  {secondaryNavLinks.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = isActive(subItem.path);
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        onClick={() => setMoreDropdownOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors duration-150 ${
                          subActive
                            ? 'bg-blue-600/20 text-blue-300 font-semibold'
                            : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                        }`}
                      >
                        <SubIcon className="w-4 h-4 text-gray-400" />
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Action Controls: 1 Single Primary CTA ("Start Practice") & Profile */}
        <div className="flex items-center gap-3">
          {/* Single Main Primary CTA Button with Gradient */}
          <Link
            to="/setup"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 border border-blue-400/30 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Practice</span>
          </Link>

          {/* User Profile / Auth Button */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-800/60 border border-transparent hover:border-gray-700 transition-all duration-150 text-sm text-gray-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="User Account Menu"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {user.full_name ? user.full_name.slice(0, 2) : 'AJ'}
                </div>
                <span className="hidden xl:block font-medium max-w-[120px] truncate text-gray-200">
                  {user.full_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#131B2E] border border-[#1E293B] shadow-2xl py-2 text-sm text-gray-200 z-50">
                  <div className="px-4 py-2 border-b border-[#1E293B]">
                    <p className="font-semibold text-white truncate">{user.full_name}</p>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors duration-150"
                  >
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <span>Candidate Profile</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors duration-150"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>Dashboard</span>
                  </Link>
                  <div className="my-1 border-t border-[#1E293B]"></div>
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-rose-950/40 text-rose-400 transition-colors duration-150 text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#1E293B] hover:border-gray-600 bg-[#131B2E] text-gray-200 text-sm font-medium hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#1E293B] bg-[#0B0F19]/98 px-4 py-4 space-y-1">
          {[...primaryNavLinks, ...secondaryNavLinks].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[#1E293B] mt-2">
            <Link
              to="/setup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Practice</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
