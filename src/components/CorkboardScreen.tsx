import React from 'react';
import type { LedgerData, NightConfig, FiredConfig, CorkboardVariant, CampaignPath } from '../types/campaign';
import { FIRED_CONFIG } from '../data/firedConfig';

interface CorkboardScreenProps {
  variant: CorkboardVariant;
  nightNumber: number;
  activePath: CampaignPath;
  nightConfig?: NightConfig;
  ledger: LedgerData;
  firedConfig?: FiredConfig;
  onOpenRestaurant: () => void;
  onLeave: () => void;
}

// ---- Sub-components ----

function Pin({ color = '#c0392b' }: { color?: string }) {
  return (
    <div style={{
      position: 'absolute',
      top: -10,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: color,
      boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
      zIndex: 2,
      border: '2px solid rgba(0,0,0,0.3)',
    }} />
  );
}

function Paper({
  rotation = 0,
  children,
  pinColor,
}: {
  rotation?: number;
  children: React.ReactNode;
  pinColor?: string;
}) {
  return (
    <div style={{
      position: 'relative',
      transform: `rotate(${rotation}deg)`,
      flexShrink: 0,
      filter: 'drop-shadow(3px 6px 12px rgba(0,0,0,0.7))',
    }}>
      <Pin color={pinColor} />
      {children}
    </div>
  );
}

function LedgerPaper({ ledger, stamp }: { ledger: LedgerData; stamp?: string }) {
  return (
    <Paper rotation={-1.5} pinColor="#2c7a2c">
      <div style={{
        width: 300,
        background: '#fafaf8',
        border: '1px solid #c8c8b0',
        fontFamily: '"Courier New", Courier, monospace',
        overflow: 'hidden',
      }}>
        {/* Green ledger header */}
        <div style={{
          background: '#2d5a2d',
          color: '#e8f5e8',
          padding: '10px 16px',
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 'bold',
        }}>
          Le Solstice — Shift Report
        </div>

        {/* Ruled lines */}
        <div style={{ padding: '16px', position: 'relative' }}>
          {stamp && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-15deg)',
              border: '3px solid rgba(150,30,30,0.6)',
              color: 'rgba(150,30,30,0.6)',
              padding: '4px 12px',
              fontSize: '1.4rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              zIndex: 1,
              pointerEvents: 'none',
            }}>
              {stamp}
            </div>
          )}
          {[
            { label: 'Cash', value: `€${Math.round(ledger.cash)}` },
            { label: 'Net Profit', value: `€${Math.round(ledger.netProfit)}` },
            { label: 'Rating', value: `${ledger.rating.toFixed(1)} ★` },
            { label: 'Covers Seated', value: String(ledger.coversSeated) },
          ].map(({ label, value }, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #d0cfc0',
              padding: '6px 0',
              fontSize: '0.78rem',
            }}>
              <span style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontWeight: 'bold', color: '#222' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Paper>
  );
}

function NewspaperPaper({
  masthead,
  headline,
  deck,
  bodyLeft,
  bodyRight,
}: {
  masthead: string;
  headline: string;
  deck: string;
  bodyLeft: string;
  bodyRight: string;
}) {
  return (
    <Paper rotation={0.5} pinColor="#222">
      <div style={{
        width: 380,
        background: '#f5f3ee',
        border: '1px solid #bbb',
        fontFamily: 'Georgia, "Times New Roman", serif',
        overflow: 'hidden',
      }}>
        {/* Masthead */}
        <div style={{
          borderBottom: '3px double #111',
          padding: '8px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.1em', color: '#111' }}>
            {masthead}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.6rem',
            color: '#666',
            marginTop: 4,
            letterSpacing: '0.05em',
          }}>
            <span>ÉDITION DU SOIR</span>
            <span>PRIX: GRATUIT</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 900,
            lineHeight: 1.2,
            color: '#111',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}>
            {headline}
          </div>
          {deck && (
            <div style={{
              fontSize: '0.72rem',
              color: '#444',
              fontStyle: 'italic',
              marginTop: 6,
              borderTop: '1px solid #bbb',
              paddingTop: 6,
            }}>
              {deck}
            </div>
          )}
        </div>

        {/* Body columns */}
        {(bodyLeft || bodyRight) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            padding: '10px 16px 14px',
            borderTop: '1px solid #bbb',
            marginTop: 8,
          }}>
            <div style={{
              fontSize: '0.65rem',
              lineHeight: 1.5,
              color: '#333',
              paddingRight: 8,
              borderRight: '1px solid #ccc',
            }}>{bodyLeft}</div>
            <div style={{
              fontSize: '0.65rem',
              lineHeight: 1.5,
              color: '#333',
              paddingLeft: 8,
            }}>{bodyRight}</div>
          </div>
        )}
      </div>
    </Paper>
  );
}

function MemoLetter({ nightConfig }: { nightConfig?: NightConfig }) {
  return (
    <Paper rotation={1.2} pinColor="#8b6914">
      <div style={{
        width: 320,
        background: '#fffef8',
        border: '1px solid #c8b870',
        fontFamily: '"Courier New", Courier, monospace',
        overflow: 'hidden',
      }}>
        {/* Letterhead */}
        <div style={{
          borderBottom: '2px solid #c8b870',
          padding: '10px 16px',
          background: '#fffff0',
        }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#6a5a1a', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Le Solstice — Correspondance Interne
          </div>
          <div style={{ fontSize: '0.55rem', color: '#999', marginTop: 2 }}>Transmission du Directeur</div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {nightConfig?.quote && (
            <div style={{
              borderLeft: '3px solid #c8b870',
              paddingLeft: 10,
              marginBottom: 12,
              fontSize: '0.72rem',
              fontStyle: 'italic',
              color: '#444',
              lineHeight: 1.5,
            }}>
              "{nightConfig.quote}"
            </div>
          )}
          <div style={{ fontSize: '0.7rem', color: '#333', lineHeight: 1.6 }}>
            {nightConfig?.memo || '...'}
          </div>
          <div style={{ marginTop: 16, fontSize: '0.65rem', color: '#888', borderTop: '1px solid #e0d8a0', paddingTop: 8 }}>
            — V.
          </div>
        </div>
      </div>
    </Paper>
  );
}

function DismissalLetter({ fired }: { fired: FiredConfig }) {
  return (
    <Paper rotation={1.5} pinColor="#8b6914">
      <div style={{
        width: 320,
        background: '#fffef8',
        border: '1px solid #c8b870',
        fontFamily: '"Courier New", Courier, monospace',
        overflow: 'hidden',
      }}>
        {/* Letterhead */}
        <div style={{
          borderBottom: '2px solid #c8b870',
          padding: '10px 16px',
          background: '#fffff0',
        }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#6a5a1a', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Le Solstice — Correspondance Interne
          </div>
          <div style={{ fontSize: '0.55rem', color: '#999', marginTop: 2 }}>Transmission du Directeur</div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 8 }}>{fired.letterSalutation}</div>
          <div style={{ fontSize: '0.7rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 12 }}>
            {fired.letterBody}
          </div>
          <div style={{
            borderLeft: '3px solid #c8b870',
            paddingLeft: 10,
            marginBottom: 12,
            fontSize: '0.7rem',
            fontStyle: 'italic',
            color: '#444',
            lineHeight: 1.5,
          }}>
            "{fired.letterQuote}"
          </div>
          <div style={{ fontSize: '0.7rem', color: '#555' }}>{fired.letterSignOff}</div>
          <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: 'bold', marginTop: 4 }}>Monsieur V.</div>
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid #e0d8a0',
            fontSize: '0.65rem',
            color: '#666',
            fontStyle: 'italic',
          }}>
            P.S. {fired.letterPS}
          </div>
        </div>
      </div>
    </Paper>
  );
}

// ---- Main component ----

const openButtonStyle: React.CSSProperties = {
  background: '#e8e8e8',
  color: '#111',
  border: '1px solid #444',
  padding: '8px 20px',
  fontSize: '0.75rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  fontFamily: 'monospace',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const leaveButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#555',
  border: '1px solid #333',
  padding: '8px 20px',
  fontSize: '0.75rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  fontFamily: 'monospace',
  cursor: 'pointer',
};

export function CorkboardScreen({
  variant,
  nightNumber,
  nightConfig,
  ledger,
  firedConfig,
  onOpenRestaurant,
  onLeave,
}: CorkboardScreenProps) {
  const boardRef = React.useRef<HTMLDivElement>(null);
  const isLoss = variant === 'fired';
  const fired = isLoss ? (firedConfig ?? FIRED_CONFIG['MORALE']) : undefined;

  // Drag-to-scroll
  const drag = React.useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = {
      active: true,
      startX: e.pageX - (boardRef.current?.offsetLeft ?? 0),
      scrollLeft: boardRef.current?.scrollLeft ?? 0,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active || !boardRef.current) return;
    e.preventDefault();
    const x = e.pageX - (boardRef.current.offsetLeft);
    boardRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.2;
  };
  const onMouseUp = () => { drag.current.active = false; };

  return (
    <div className="h-screen flex flex-col" style={{ background: '#111', fontFamily: 'monospace' }}>
      {/* Cork board — horizontal scroll */}
      <div
        ref={boardRef}
        className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-14 px-20 select-none"
        style={{
          background: '#1c1c1c',
          cursor: drag.current.active ? 'grabbing' : 'grab',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <LedgerPaper ledger={ledger} stamp={isLoss && fired ? fired.ledgerStamp : undefined} />
        <NewspaperPaper
          masthead="L'Observateur"
          headline={isLoss && fired ? fired.newspaperHeadline : (nightConfig?.newspaper ?? '')}
          deck={isLoss && fired ? fired.newspaperDeck : ''}
          bodyLeft={isLoss && fired ? fired.newspaperBodyLeft : ''}
          bodyRight={isLoss && fired ? fired.newspaperBodyRight : ''}
        />
        {isLoss && fired
          ? <DismissalLetter fired={fired} />
          : <MemoLetter nightConfig={nightConfig} />
        }
      </div>

      {/* Fixed bottom bar */}
      <div
        className="flex items-center justify-between px-8 py-3 border-t"
        style={{ background: '#0a0a0a', borderColor: '#2a2a2a' }}
      >
        <span style={{ color: '#3a3a3a', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Night {nightNumber} — {isLoss ? 'Game Over' : 'Ready'}
        </span>
        {isLoss
          ? <button onClick={onLeave} style={leaveButtonStyle}>Leave.</button>
          : <button onClick={onOpenRestaurant} style={openButtonStyle}>⬡ Open Restaurant</button>
        }
        <span style={{ color: '#2a2a2a', fontSize: '0.7rem', fontFamily: 'monospace' }}>← scroll to read →</span>
      </div>
    </div>
  );
}
