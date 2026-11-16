// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Select } from '../Select';

afterEach(() => {
  cleanup();
});

describe('Select component', () => {
  const options = [
    { value: 'software-eng', label: 'Software Engineer' },
    { value: 'product-mgr', label: 'Product Manager' },
    { value: 'data-scientist', label: 'Data Scientist' },
  ];

  it('renders label and select element with options', () => {
    render(<Select label="Target Role" options={options} defaultValue="software-eng" />);
    expect(screen.getByLabelText('Target Role')).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('Product Manager')).toBeTruthy();
  });

  it('renders placeholder option when provided', () => {
    render(<Select label="Experience Level" placeholder="Select your level" options={options} />);
    expect(screen.getByText('Select your level')).toBeTruthy();
  });

  it('renders error message and aria-invalid attribute', () => {
    render(<Select label="Role" options={options} error="Please choose a valid role" />);
    const errorMsg = screen.getByRole('alert');
    expect(errorMsg.textContent).toBe('Please choose a valid role');
    const select = screen.getByLabelText('Role');
    expect(select.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders disabled state properly', () => {
    render(<Select label="Locked Role" options={options} disabled />);
    const select = screen.getByLabelText('Locked Role');
    expect(select.getAttribute('disabled')).not.toBeNull();
  });
});
