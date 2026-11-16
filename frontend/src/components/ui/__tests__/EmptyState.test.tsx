// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

afterEach(() => {
  cleanup();
});

describe('EmptyState component', () => {
  it('renders title, description and CTA button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Practice Sessions Yet"
        description="Launch your first AI mock interview to build your metrics."
        action={{
          label: 'Start Interview',
          onClick: handleAction,
        }}
      />
    );

    expect(screen.getByText('No Practice Sessions Yet')).toBeTruthy();
    expect(screen.getByText(/Launch your first AI mock interview/i)).toBeTruthy();

    const cta = screen.getByRole('button', { name: /start interview/i });
    expect(cta).toBeTruthy();
    fireEvent.click(cta);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
