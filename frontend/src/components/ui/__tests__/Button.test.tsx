// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Button } from '../Button';

afterEach(() => {
  cleanup();
});

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('text-red-300');
  });

  it('renders disabled state when isLoading is true', () => {
    render(<Button isLoading>Submitting</Button>);
    const button = screen.getByRole('button', { name: /submitting/i });
    expect(button.getAttribute('disabled')).not.toBeNull();
  });

  it('renders disabled state when disabled prop is true', () => {
    render(<Button disabled>Disabled Action</Button>);
    const button = screen.getByRole('button', { name: /disabled action/i });
    expect(button.getAttribute('disabled')).not.toBeNull();
  });
});
