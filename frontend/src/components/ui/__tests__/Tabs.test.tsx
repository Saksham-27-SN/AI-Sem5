// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Tabs, TabList, TabTrigger, TabPanel } from '../Tabs';

afterEach(() => {
  cleanup();
});

describe('Tabs component', () => {
  it('renders tab triggers and active panel content', () => {
    const handleValueChange = vi.fn();
    render(
      <Tabs value="tab1" onValueChange={handleValueChange}>
        <TabList aria-label="Sample Tabs">
          <TabTrigger value="tab1">Overview</TabTrigger>
          <TabTrigger value="tab2">Analytics</TabTrigger>
        </TabList>
        <TabPanel value="tab1">Overview Content Here</TabPanel>
        <TabPanel value="tab2">Analytics Content Here</TabPanel>
      </Tabs>
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeTruthy();
    expect(screen.getByText('Overview Content Here')).toBeTruthy();
    expect(screen.queryByText('Analytics Content Here')).toBeNull();
  });

  it('triggers onValueChange on tab click', () => {
    const handleValueChange = vi.fn();
    render(
      <Tabs value="tab1" onValueChange={handleValueChange}>
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
      </Tabs>
    );

    fireEvent.click(screen.getByRole('tab', { name: /tab 2/i }));
    expect(handleValueChange).toHaveBeenCalledWith('tab2');
  });

  it('supports keyboard navigation via arrow keys', () => {
    const handleValueChange = vi.fn();
    render(
      <Tabs value="tab1" onValueChange={handleValueChange}>
        <TabList>
          <TabTrigger value="tab1">First</TabTrigger>
          <TabTrigger value="tab2">Second</TabTrigger>
        </TabList>
      </Tabs>
    );

    const firstTab = screen.getByRole('tab', { name: /first/i });
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(handleValueChange).toHaveBeenCalledWith('tab2');
  });
});
