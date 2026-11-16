// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Input } from '../Input';

afterEach(() => {
  cleanup();
});

describe('Input component', () => {
  it('renders label and input correctly', () => {
    render(<Input label="Email Address" placeholder="you@company.com" />);
    expect(screen.getByLabelText('Email Address')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@company.com')).toBeTruthy();
  });

  it('renders helper text when provided and no error', () => {
    render(<Input label="Username" helperText="Must be 3-20 characters" />);
    expect(screen.getByText('Must be 3-20 characters')).toBeTruthy();
  });

  it('renders error message and applies invalid aria attributes', () => {
    render(<Input label="Password" error="Password is required" />);
    const errorMsg = screen.getByRole('alert');
    expect(errorMsg.textContent).toBe('Password is required');
    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('respects disabled prop', () => {
    render(<Input label="Disabled Field" disabled />);
    const input = screen.getByLabelText('Disabled Field');
    expect(input.getAttribute('disabled')).not.toBeNull();
  });
});
