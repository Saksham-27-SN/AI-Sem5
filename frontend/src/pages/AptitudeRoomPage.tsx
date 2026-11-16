// src/pages/AptitudeRoomPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { AptitudeMCQ, AptitudeSubmitResponse } from '../types';
import {
  Button,
  Card,
  Badge,
  Container,
  Modal,
} from '../components/ui';
import {
  Brain,
  Clock,
  Flag,
  ArrowRight,
  ArrowLeft,
  Award,
  ChevronRight,
  Check,
  AlertTriangle,
} from 'lucide-react';

export const AptitudeRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Aptitude Assessment | InterviewGenie AI';
  }, []);

  const [questions, setQuestions] = useState<AptitudeMCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60); // 15 mins
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [results, setResults] = useState<AptitudeSubmitResponse | null>(null);

  useEffect(() => {
    async function loadTest() {
      try {
        const mcqs = await api.getAptitudeQuestions(5);
        setQuestions(mcqs);
      } catch (err) {
        console.error('Failed to load aptitude questions', err);
      }
    }
    loadTest();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (results) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [results]);

  const handleSelectOption = (optionKey: string) => {
    const q = questions[currentIndex];
    if (!q) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [q.id]: optionKey,
    }));
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const handleOpenSubmitModal = () => {
    setShowConfirmModal(true);
  };

  const handleSubmitTest = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const response = await api.submitAptitudeTest({
        answers: selectedAnswers,
        time_spent_seconds: 15 * 60 - timeLeftSeconds,
      });
      setResults(response);
      showToast(
        'success',
        'Assessment Completed',
        `Score: ${response.score_percentage}% (${response.correct_count}/${response.total_questions} correct)`
      );
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Submission Failed', error.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <Container size="lg" className="min-h-[calc(100vh-4rem)] py-6 space-y-6 font-sans">
      {/* 1. Top Ribbon Banner */}
      <Card variant="default" padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Quantitative & Logic Aptitude Assessment</span>
              <Badge variant="emerald" size="sm">Timed Proctor</Badge>
            </h1>
            <p className="text-xs text-gray-400">Agent Cipher • Turn-based voice with live transcript</p>
          </div>
        </div>

        {!results && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={timeLeftSeconds < 120 ? 'rose' : 'gray'}
              size="md"
              className="font-mono font-bold"
            >
              <Clock className="w-4 h-4 text-emerald-400 inline mr-1.5" />
              <span>Time Left: {formatTimer(timeLeftSeconds)}</span>
            </Badge>

            {/* Single Primary CTA: Submit Assessment */}
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting || questions.length === 0}
              isLoading={isSubmitting}
              onClick={handleOpenSubmitModal}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/30 font-bold"
            >
              Submit Assessment
            </Button>
          </div>
        )}
      </Card>

      {/* 2. Main Body */}
      {results ? (
        /* Results View */
        <div className="space-y-6 animate-fade-in">
          {/* Score Header */}
          <Card variant="glow" padding="lg" className="text-center relative overflow-hidden">
            <div className="mb-3">
              <Badge variant="emerald" size="md">
                <Award className="w-4 h-4 inline mr-1" /> Assessment Results Verified
              </Badge>
            </div>
            <h2 className="text-4xl font-extrabold text-white">
              {results.score_percentage}%
            </h2>
            <p className="text-sm text-gray-300 mt-2">
              You answered <span className="text-emerald-400 font-bold">{results.correct_count}</span> out of{' '}
              <span className="text-white font-bold">{results.total_questions}</span> questions correctly.
            </p>

            {/* Category breakdown */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {Object.entries(results.category_scores).map(([cat, score]) => (
                <Card key={cat} variant="default" padding="sm" className="text-center">
                  <p className="text-xs text-gray-400 truncate">{cat}</p>
                  <p className={`text-lg font-bold mt-1 ${score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {score}%
                  </p>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/setup')}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                Take Another Assessment
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          </Card>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Step-by-Step Question Breakdown
            </h3>
            {results.results.map((item, idx) => (
              <Card
                key={item.question_id}
                variant="default"
                padding="md"
                className={`border ${item.is_correct ? 'border-emerald-500/30' : 'border-rose-500/30'}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="font-bold text-sm text-white">Question {idx + 1}</span>
                  {item.is_correct ? (
                    <Badge variant="emerald" size="sm" dot>Correct</Badge>
                  ) : (
                    <Badge variant="rose" size="sm" dot>Incorrect</Badge>
                  )}
                </div>

                <p className="text-sm font-semibold text-gray-100 mb-3">{item.question}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <span className="text-gray-400 text-xs">Your Answer:</span>
                    <p className={`font-bold mt-0.5 ${item.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Option {item.user_answer || 'None (Unanswered)'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <span className="text-gray-400 text-xs">Verified Correct:</span>
                    <p className="font-bold text-emerald-400 mt-0.5">Option {item.correct_answer}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-sm">
                  <span className="font-bold text-gray-200">Explanation:</span>
                  <p className="text-gray-300 mt-1 leading-relaxed">{item.explanation}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Active Assessment View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question Display (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {currentQ ? (
              <Card variant="default" padding="lg" className="flex-1 flex flex-col justify-between min-h-[460px]">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="blue" size="md">
                        Question {currentIndex + 1} of {questions.length}
                      </Badge>
                      <Badge variant="gray" size="sm">{currentQ.category}</Badge>
                    </div>

                    <Badge variant="amber" size="sm" className="capitalize">{currentQ.difficulty}</Badge>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed mb-6">
                    {currentQ.question}
                  </h2>

                  {/* Options with clean selection states */}
                  <div className="space-y-3">
                    {Object.entries(currentQ.options).map(([key, text]) => {
                      const isSelected = selectedAnswers[currentQ.id] === key;
                      return (
                        <div
                          key={key}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => handleSelectOption(key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectOption(key);
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10 text-white shadow-md shadow-blue-500/10'
                              : 'bg-[#0B0F19] border-[#1E293B] text-gray-200 hover:border-gray-600 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span
                              className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow'
                                  : 'bg-[#131B2E] text-gray-300 border border-[#1E293B]'
                              }`}
                            >
                              {key}
                            </span>
                            <span className="text-sm font-medium leading-relaxed">{text}</span>
                          </div>

                          {isSelected && <Check className="w-5 h-5 text-blue-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question Footer Navigation Controls */}
                <div className="mt-8 pt-4 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleFlag}
                    leftIcon={<Flag className={`w-3.5 h-3.5 ${flaggedQuestions.has(currentIndex) ? 'text-amber-400 fill-current' : 'text-gray-400'}`} />}
                    className={flaggedQuestions.has(currentIndex) ? 'border-amber-500/40 text-amber-300' : ''}
                  >
                    {flaggedQuestions.has(currentIndex) ? 'Flagged for Review' : 'Flag Question'}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => prev - 1)}
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentIndex === questions.length - 1}
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card variant="default" padding="lg" className="text-center text-sm text-gray-400 py-16">
                Loading aptitude questions bank...
              </Card>
            )}
          </div>

          {/* Question Palette Drawer (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card variant="default" padding="md" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Question Palette
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Jump directly to any problem</p>
              </div>

              {/* Grid of question numbers */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(selectedAnswers[q.id]);
                  const isFlagged = flaggedQuestions.has(idx);
                  const isCurrent = idx === currentIndex;

                  let badgeStyle = 'bg-[#0B0F19] text-gray-300 border-[#1E293B] hover:border-gray-600';
                  if (isCurrent) {
                    badgeStyle = 'bg-blue-600 text-white border-blue-400 font-bold shadow-md';
                  } else if (isFlagged) {
                    badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
                  } else if (isAnswered) {
                    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-xl border text-sm flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${badgeStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm border-t border-[#1E293B] pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500"></span>
                  <span className="text-gray-300">Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500"></span>
                  <span className="text-gray-300">Flagged ({flaggedQuestions.size})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#0B0F19] border border-gray-700"></span>
                  <span className="text-gray-300">
                    Unanswered ({unansweredCount})
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E293B] text-xs text-gray-400">
                <p className="font-semibold text-emerald-400 mb-1">
                  Deterministic Grading
                </p>
                Submitting produces immediate mathematical verification and answer logic with zero hallucinations.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation / Warning Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={unansweredCount > 0 ? 'Unanswered Questions Warning' : 'Submit Assessment'}
        description="Verify your answers before final deterministic grading."
        size="md"
      >
        <div className="space-y-4">
          {unansweredCount > 0 ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">
                  You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}!
                </p>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Are you sure you want to finish the assessment now? Unanswered questions will receive 0 points.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed">
              All {questions.length} questions have been answered. Would you like to submit your answers now for instant deterministic scoring and explanations?
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
            >
              Continue Test
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitTest}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/30"
            >
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
};
