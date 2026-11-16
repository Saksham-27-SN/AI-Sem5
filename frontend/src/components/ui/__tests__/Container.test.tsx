// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Container } from '../Container';

afterEach(() => {
  cleanup();
});

describe('Container component', () => {
  it('renders children with appropriate size classes', () => {
    const { container } = render(<Container size="xl">Container Content</Container>);
    expect(screen.getByText('Container Content')).toBeTruthy();
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('max-w-[1400px]');
    expect(el.className).toContain('mx-auto');
  });
});
