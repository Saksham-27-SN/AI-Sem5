// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toast } from '../Toast';

afterEach(() => {
  cleanup();
});

describe('Toast component', () => {
  it('renders title and message correctly', () => {
    render(<Toast type="success" title="Session Saved" message="Your evaluation was archived." />);
    expect(screen.getByText('Session Saved')).toBeTruthy();
    expect(screen.getByText('Your evaluation was archived.')).toBeTruthy();
  });

  it('triggers onDismiss when close button is clicked', () => {
    const handleDismiss = vi.fn();
    render(
      <Toast
        id="t-1"
        type="error"
        title="Error Occurred"
        message="Failed to connect."
        onDismiss={handleDismiss}
      />
    );

    const closeBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledWith('t-1');
  });
});
