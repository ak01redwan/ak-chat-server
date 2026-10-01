import { render, screen } from '@testing-library/react';
import { I18nProvider } from './context';

function Probe() {
  return (
    <>
      <button type="button" data-testid="react">
        React
      </button>
      <span data-testid="dir">{document.documentElement.getAttribute('dir')}</span>
    </>
  );
}

/**
 * The suite emitted ~200 "not wrapped in act(...)" warnings because components
 * that subscribe to Firestore/Auth resolve their first snapshot asynchronously
 * while React was not yet inside act(). That noise hides real warnings, so the
 * shared setup now fails loudly if it ever comes back.
 */
describe('act() hygiene', () => {
  let consoleError: jest.SpyInstance;
  let actWarnings: string[];

  beforeEach(() => {
    actWarnings = [];
    consoleError = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const first = args[0];
      if (typeof first === 'string' && first.includes('not wrapped in act')) {
        actWarnings.push(first);
      }
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('reports no act() warnings for the locale provider tree', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('react')).toBeInTheDocument();
    expect(actWarnings).toEqual([]);
  });
});
