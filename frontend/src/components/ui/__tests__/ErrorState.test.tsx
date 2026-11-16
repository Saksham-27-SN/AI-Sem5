// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorState } from '../ErrorState';

afterEach(() => {
  cleanup();
});

describe('ErrorState component', () => {
  it('renders alert message and triggers retry handler', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to Load Data"
        message="Unable to connect to the evaluation server. Please retry."
        onRetry={handleRetry}
        retryLabel="Try Again"
      />
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Failed to Load Data')).toBeTruthy();
    expect(screen.getByText(/Unable to connect to the evaluation server/i)).toBeTruthy();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeTruthy();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
