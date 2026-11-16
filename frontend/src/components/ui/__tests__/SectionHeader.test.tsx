// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';

afterEach(() => {
  cleanup();
});

describe('SectionHeader component', () => {
  it('renders badge, title, subtitle and action', () => {
    render(
      <SectionHeader
        badge="Live Metrics"
        badgeVariant="blue"
        title="Performance Analytics"
        subtitle="Track competency growth across mock rounds."
        action={<button>Export</button>}
      />
    );

    expect(screen.getByText('Live Metrics')).toBeTruthy();
    expect(screen.getByText('Performance Analytics')).toBeTruthy();
    expect(screen.getByText(/Track competency growth/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy();
  });
});
