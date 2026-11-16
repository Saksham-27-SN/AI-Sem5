import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Container } from './ui/Container';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#1E293B] bg-[#070B14] py-8 text-sm text-gray-300">
      <Container size="lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand info */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-center md:text-left">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white tracking-tight">InterviewGenie AI</span>
            <span className="text-gray-400">© 2026 • Autonomous Simulation Suite</span>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2.5 text-sm font-medium"
          >
            <Link
              to="/setup"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Setup
            </Link>
            <Link
              to="/interview/live"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Live Room
            </Link>
            <Link
              to="/interview/technical"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Tech IDE
            </Link>
            <Link
              to="/interview/aptitude"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Aptitude
            </Link>
            <Link
              to="/resume"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Resume
            </Link>
            <Link
              to="/analytics"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Analytics
            </Link>
            <Link
              to="/history"
              className="text-gray-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              History
            </Link>
            <Link
              to="/privacy"
              className="text-gray-400 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-gray-400 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Terms
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
};
