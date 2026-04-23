import React from 'react';
import { createPortal } from 'react-dom';
import type { MiniGameId } from '../../types';
import { DEV_MINI_GAME_ORDER } from '../../data/bossRoster';
import { useDevPlayApi } from '../../dev/DevPlayApiContext';
import { Z_INDEX } from '../../zIndex';

const STORAGE_KEY = 'service-compris-dev-palette-ui';

interface PaletteUiPrefs {
  /** When true, show a small “Dev” control when the palette is closed. */
  showDevChip: boolean;
}

function loadPrefs(): PaletteUiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { showDevChip: true };
    const p = JSON.parse(raw) as Partial<PaletteUiPrefs>;
    return { showDevChip: p.showDevChip !== false };
  } catch {
    return { showDevChip: true };
  }
}

function savePrefs(prefs: PaletteUiPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

function isPaletteShortcut(e: KeyboardEvent): boolean {
  if (e.key !== 'k' && e.key !== 'K') return false;
  if (!e.shiftKey) return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  return true;
}

type DevCommand = {
  id: string;
  label: string;
  subtitle?: string;
  keywords: string;
  disabled?: boolean;
  run: () => void;
};

export interface DevCommandPaletteProps {
  onAdvanceCorkboard: () => void;
  onFiredCorkboard: () => void;
}

export function DevCommandPalette({ onAdvanceCorkboard, onFiredCorkboard }: DevCommandPaletteProps) {
  const { launchMiniGame } = useDevPlayApi();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [prefs, setPrefs] = React.useState<PaletteUiPrefs>(() => loadPrefs());
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const commands = React.useMemo((): DevCommand[] => {
    const base: DevCommand[] = [
      {
        id: 'corkboard-mock',
        label: 'Corkboard: advance (mock ledger)',
        subtitle: 'Jump to next-night corkboard with sample data',
        keywords: 'corkboard advance mock ledger shift',
        run: () => {
          onAdvanceCorkboard();
          setOpen(false);
        },
      },
      {
        id: 'corkboard-fired',
        label: 'Corkboard: fired (mock)',
        subtitle: 'Jump to fired corkboard with sample data',
        keywords: 'corkboard fired loss mock',
        run: () => {
          onFiredCorkboard();
          setOpen(false);
        },
      },
    ];

    const miniRows: DevCommand[] = DEV_MINI_GAME_ORDER.map((id: MiniGameId) => ({
      id: `minigame-${id}`,
      label: `Mini-game: ${id}`,
      subtitle: launchMiniGame ? 'Start boss encounter (dev)' : 'Start a shift first',
      keywords: `minigame boss ${id.toLowerCase().replace(/_/g, ' ')}`,
      disabled: !launchMiniGame,
      run: () => {
        if (!launchMiniGame) return;
        launchMiniGame(id);
        setOpen(false);
      },
    }));

    return [...base, ...miniRows];
  }, [launchMiniGame, onAdvanceCorkboard, onFiredCorkboard]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      c =>
        c.label.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false) ||
        c.keywords.includes(q) ||
        c.id.includes(q),
    );
  }, [commands, query]);

  React.useEffect(() => {
    const first = filtered.findIndex(c => !c.disabled);
    setHighlight(first >= 0 ? first : 0);
  }, [query, filtered]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-dev-cmd-index="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, filtered]);

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      setOpen(o => !o);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const runHighlighted = React.useCallback(() => {
    const cmd = filtered[highlight];
    if (!cmd || cmd.disabled) return;
    cmd.run();
  }, [filtered, highlight]);

  const nextEnabledIndex = React.useCallback(
    (from: number, dir: 1 | -1) => {
      if (filtered.length === 0) return 0;
      let i = from;
      for (let step = 0; step < filtered.length; step++) {
        i = (i + dir + filtered.length) % filtered.length;
        if (!filtered[i]?.disabled) return i;
      }
      return from;
    },
    [filtered],
  );

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => nextEnabledIndex(h, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => nextEnabledIndex(h, -1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      runHighlighted();
    }
  };

  const showChip = prefs.showDevChip && !open;

  const palette = open
    ? createPortal(
        <div
          className="fixed inset-0 flex items-start justify-center bg-[#141414]/55 px-3 pt-[12vh] sm:pt-[15vh]"
          style={{ zIndex: Z_INDEX.devHud }}
          role="dialog"
          aria-modal="true"
          aria-label="Dev command palette"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border-2 border-[#141414] bg-[#E4E3E0] shadow-[6px_6px_0_0_#141414]"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="border-b-2 border-[#141414] px-3 py-2">
              <input
                ref={inputRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Type to filter dev commands…"
                className="w-full border-0 bg-transparent text-sm font-medium text-[#141414] outline-none placeholder:text-[#141414]/45"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
              />
            </div>
            <div ref={listRef} className="max-h-[min(50vh,22rem)] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#141414]/55">No matching commands.</p>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    type="button"
                    data-dev-cmd-index={i}
                    disabled={cmd.disabled}
                    onClick={() => !cmd.disabled && cmd.run()}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                      cmd.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : i === highlight
                          ? 'bg-[#141414] text-[#E4E3E0]'
                          : 'text-[#141414] hover:bg-[#141414]/10'
                    }`}
                  >
                    <span className="font-bold">{cmd.label}</span>
                    {cmd.subtitle ? (
                      <span
                        className={`text-xs font-medium ${
                          i === highlight && !cmd.disabled ? 'text-[#E4E3E0]/75' : 'text-[#141414]/55'
                        }`}
                      >
                        {cmd.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#141414] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#141414]/55">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#141414]"
                  checked={prefs.showDevChip}
                  onChange={e => {
                    const next = { ...prefs, showDevChip: e.target.checked };
                    setPrefs(next);
                    savePrefs(next);
                  }}
                />
                Show Dev button when closed
              </label>
              <span>Esc close · ↑↓ Enter</span>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const chip =
    showChip && import.meta.env.DEV
      ? createPortal(
          <button
            type="button"
            className="fixed bottom-4 left-4 rounded-lg border-2 border-[#141414] bg-[#E4E3E0] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#141414] shadow-[3px_3px_0_0_#141414] hover:bg-[#141414] hover:text-[#E4E3E0]"
            style={{ zIndex: Z_INDEX.devHud }}
            onClick={() => setOpen(true)}
          >
            Dev
          </button>,
          document.body,
        )
      : null;

  return (
    <>
      {chip}
      {palette}
    </>
  );
}
