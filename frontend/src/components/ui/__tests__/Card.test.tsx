// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card component', () => {
  it('renders children inside card', () => {
    render(<Card>Card content test</Card>);
    expect(screen.getByText('Card content test')).toBeTruthy();
  });

  it('applies padding and variant styles', () => {
    const { container } = render(
      <Card variant="interactive" padding="lg">
        Interactive Card
      </Card>
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('p-8');
    expect(div.className).toContain('cursor-pointer');
  });
});
