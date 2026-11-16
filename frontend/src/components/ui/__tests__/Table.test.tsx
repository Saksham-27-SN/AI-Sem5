// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../Table';

afterEach(() => {
  cleanup();
});

describe('Table component suite', () => {
  it('renders table elements with sticky header and cells', () => {
    render(
      <TableContainer>
        <Table>
          <TableHeader sticky>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow striped>
              <TableCell>Alex Johnson</TableCell>
              <TableCell>94%</TableCell>
              <TableCell>Passed</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Candidate')).toBeTruthy();
    expect(screen.getByText('Alex Johnson')).toBeTruthy();
    expect(screen.getByText('94%')).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
  });
});
