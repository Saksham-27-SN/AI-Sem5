// src/pages/NotFoundPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Badge, Button } from '../components/ui';
import { Home, Play, Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 - Page Not Found | InterviewGenie AI';
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-16 bg-[#0B0F19] text-gray-100 font-sans">
      <Container size="md" className="text-center space-y-6">
        {/* Electric 404 Badge */}
        <div className="flex justify-center">
          <Badge variant="blue" size="md">
            404 Error • Route Not Found
          </Badge>
        </div>

        {/* Central Icon with Soft Glow */}
        <div className="relative w-20 h-20 mx-auto rounded-3xl bg-[#131B2E] border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
          <Compass className="w-10 h-10 animate-pulse text-blue-400" />
        </div>

        {/* Heading & Copy */}
        <div className="space-y-3 max-w-lg mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            The requested page does not exist or has been relocated. You can safely return to your
            candidate dashboard or launch a new autonomous interview simulation.
          </p>
        </div>

        {/* Actions with Single Primary CTA */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/dashboard')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/setup')}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
          >
            Start Simulation
          </Button>
        </div>
      </Container>
    </div>
  );
};
export default NotFoundPage;
