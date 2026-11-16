// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from '../Modal';

afterEach(() => {
  cleanup();
});

describe('Modal component', () => {
  it('renders modal content when isOpen is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Session Summary" description="Review results">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Session Summary')).toBeTruthy();
    expect(screen.getByText('Review results')).toBeTruthy();
    expect(screen.getByText('Modal body content')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={false} onClose={handleClose} title="Hidden Modal">
        <p>Hidden body</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('triggers onClose when dismiss button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Dismiss Test">
        <p>Body</p>
      </Modal>
    );

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
