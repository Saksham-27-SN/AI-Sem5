// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LoadingSkeleton, Skeleton } from '../LoadingSkeleton';

afterEach(() => {
  cleanup();
});

describe('LoadingSkeleton component suite', () => {
  it('renders generic Skeleton with pulse class', () => {
    const { container } = render(<Skeleton className="w-16 h-8" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
  });

  it('renders card skeleton variant', () => {
    render(<LoadingSkeleton variant="card" count={2} />);
    const cards = screen.getAllByLabelText('Loading card content');
    expect(cards.length).toBe(2);
  });

  it('renders table skeleton variant', () => {
    render(<LoadingSkeleton variant="table" rows={3} columns={4} />);
    const table = screen.getByLabelText('Loading table content');
    expect(table).toBeTruthy();
  });
});
