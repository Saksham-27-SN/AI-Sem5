// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge component', () => {
  it('renders badge label text', () => {
    render(<Badge>Verified</Badge>);
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('renders dot indicator when dot is true', () => {
    const { container } = render(<Badge dot variant="emerald">Online</Badge>);
    const dot = container.querySelector('.rounded-full.bg-emerald-400');
    expect(dot).not.toBeNull();
  });
});
