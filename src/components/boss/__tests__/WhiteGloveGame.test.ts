// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { WhiteGloveGame, isSnapped } from '../WhiteGloveGame';

describe('isSnapped', () => {
  const target = { x: 200, y: 300, rotation: 0 };

  it('returns true within tolerance', () => {
    expect(isSnapped({ x: 204, y: 296, rotation: 3 }, target)).toBe(true);
  });

  it('returns false when too far in position', () => {
    expect(isSnapped({ x: 220, y: 300, rotation: 0 }, target)).toBe(false);
  });

  it('returns false when too far in rotation', () => {
    expect(isSnapped({ x: 200, y: 300, rotation: 10 }, target)).toBe(false);
  });

  it('is exact on boundary', () => {
    expect(isSnapped({ x: 208, y: 308, rotation: 5 }, target)).toBe(true);
  });
});

describe('WhiteGloveGame', () => {
  it('renders arena and utensils', () => {
    render(React.createElement(WhiteGloveGame, { onWin: () => {}, onLose: () => {}, durationMs: 20_000 }));
    expect(screen.getByTestId('white-glove-arena')).toBeTruthy();
    expect(screen.getByTestId('white-glove-fork')).toBeTruthy();
    expect(screen.getByTestId('white-glove-knife')).toBeTruthy();
  });
});

