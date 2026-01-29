import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

interface ShiftCodeData {
  code: string;
  descriptor: string;
  weighted_hours: number;
  color: string;
}

interface RosterQuickAddProps {
  shiftCodes: Array<{ code: string; color: string; descriptor?: string; weighted_hours?: number }>;
  empId: string;
  date: string;
  onAdd: (code: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export function RosterQuickAdd({ shiftCodes, empId, date, onAdd, onClose, position }: RosterQuickAddProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return shiftCodes;
    const q = query.toLowerCase();
    return shiftCodes.filter(sc => 
      sc.code.toLowerCase().includes(q) || 
      (sc.descriptor || '').toLowerCase().includes(q)
    );
  }, [shiftCodes, query]);

  const handleSelect = (code: string) => {
    onAdd(code);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.5)'
        }} 
        onClick={onClose} 
      />
      
      {/* Dialog */}
      <div 
        style={{ 
          position: 'fixed', 
          left: `${position.x}px`, 
          top: `${position.y}px`, 
          background: 'var(--popover)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--shadow-overlay)', 
          zIndex: 9999,
          width: '320px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              width: '14px', 
              height: '14px', 
              color: 'var(--muted-foreground)' 
            }} />
            <input
              type="text"
              placeholder="Search shift code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Shift Codes List */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          {filtered.length === 0 ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: 'var(--muted-foreground)',
              fontSize: 'var(--text-caption)'
            }}>
              No shift codes found
            </div>
          ) : (
            filtered.map(sc => (
              <button
                key={sc.code}
                onClick={() => handleSelect(sc.code)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '4px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 'var(--text-body)', 
                    fontWeight: 'var(--font-weight-heading)', 
                    color: 'var(--foreground)',
                    marginBottom: '2px'
                  }}>
                    {sc.code}
                  </div>
                  {sc.descriptor && (
                    <div style={{ 
                      fontSize: 'var(--text-caption)', 
                      color: 'var(--muted-foreground)',
                      lineHeight: '1.3'
                    }}>
                      {sc.descriptor}
                    </div>
                  )}
                </div>
                {sc.weighted_hours !== undefined && sc.weighted_hours !== null && (
                  <div style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--muted-foreground)',
                    fontWeight: 'var(--font-weight-body)',
                    paddingLeft: '12px',
                    flexShrink: 0
                  }}>
                    {sc.weighted_hours}h
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
