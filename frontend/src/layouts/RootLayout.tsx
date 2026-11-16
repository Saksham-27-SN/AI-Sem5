import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ToastContainer } from '../components/ToastContainer';
import { Container } from '../components/ui/Container';

export interface RootLayoutProps {
  children: React.ReactNode;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
  className?: string;
  showFooter?: boolean;
}

export const RootLayout: React.FC<RootLayoutProps> = ({
  children,
  containerSize = 'lg',
  className = '',
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Sticky Global Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${className}`}>
        {containerSize === 'none' ? (
          children
        ) : (
          <Container size={containerSize} className="py-8">
            {children}
          </Container>
        )}
      </main>

      {/* Global Notifications */}
      <ToastContainer />

      {/* Global Footer */}
      {showFooter && <Footer />}
    </div>
  );
};
