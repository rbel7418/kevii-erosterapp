import { useState, useMemo, useEffect } from 'react';
import { Search, Clock } from 'lucide-react';
import { Button } from './ui/BaseDialog';

interface ShiftCodeData {
  code: string;
  descriptor: string;
  weighted_hours: number;
  color: string;
}

interface ShiftEntryDialogProps {
  shiftCodes: Array<{ code: string; color: string; descriptor?: string; weighted_hours?: number }>;
  empId: string;
  date: string;
  currentShift?: string;
  onAdd: (code: string, customHours?: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export function ShiftEntryDialog({ 
  shiftCodes, 
  empId, 
  date, 
  currentShift,
  onAdd, 
  onClose, 
  position 
}: ShiftEntryDialogProps) {
  const [mode, setMode] = useState<'code' | 'custom'>('code');
  const [query, setQuery] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [calculatedHours, setCalculatedHours] = useState(8);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Smart positioning to keep dialog on screen
  useEffect(() => {
    const dialogWidth = 420;
    const dialogHeight = 600;
    const padding = 16;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + dialogWidth + padding > viewportWidth) {
      x = viewportWidth - dialogWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust vertical position
    if (y + dialogHeight + padding > viewportHeight) {
      // Try to position above instead
      const aboveY = position.y - dialogHeight - 8;
      if (aboveY >= padding) {
        y = aboveY;
      } else {
        // Center vertically if it doesn't fit above or below
        y = Math.max(padding, (viewportHeight - dialogHeight) / 2);
      }
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  useEffect(() => {
    if (mode === 'custom' && startTime && endTime) {
      const start = parseTimeToMinutes(startTime);
      const end = parseTimeToMinutes(endTime);
      
      let diff = end - start;
      if (diff < 0) {
        diff += 24 * 60;
      }
      
      const hours = diff / 60;
      setCalculatedHours(Math.round(hours * 10) / 10);
    }
  }, [startTime, endTime, mode]);

  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const filtered = useMemo(() => {
    if (!query) return shiftCodes;
    const q = query.toLowerCase();
    return shiftCodes.filter(sc => 
      sc.code.toLowerCase().includes(q) || 
      (sc.descriptor || '').toLowerCase().includes(q)
    );
  }, [shiftCodes, query]);

  const handleSelectCode = (code: string) => {
    onAdd(code);
    onClose();
  };

  const handleCustomSubmit = () => {
    if (!startTime || !endTime || calculatedHours <= 0) return;
    
    const customCode = `${startTime}-${endTime}`;
    onAdd(customCode, calculatedHours);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/50"
      />
      
      {/* Dialog - Smart Positioned */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          position: 'fixed', 
          left: `${adjustedPosition.x}px`, 
          top: `${adjustedPosition.y}px`,
          transition: 'all 0.15s ease-out'
        }}
        className="z-[9999] bg-white rounded-lg shadow-xl border border-solid border-neutral-border w-[420px] max-h-[600px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-solid border-neutral-border bg-neutral-50">
          <h3 className="text-heading-3 font-heading-3 text-default-font m-0">
            Add Shift
          </h3>
          <p className="text-caption font-caption text-subtext-color mt-1 m-0">
            Select a shift code or enter custom times
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-solid border-neutral-border">
          <button
            onClick={() => setMode('code')}
            className={`flex-1 px-4 py-2.5 text-body-bold font-body-bold border-b-2 transition-all ${
              mode === 'code'
                ? 'border-brand-primary text-brand-primary bg-brand-50'
                : 'border-transparent text-default-font hover:bg-neutral-50'
            }`}
          >
            Shift Code
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 px-4 py-2.5 text-body-bold font-body-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              mode === 'custom'
                ? 'border-brand-primary text-brand-primary bg-brand-50'
                : 'border-transparent text-default-font hover:bg-neutral-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Custom Time
          </button>
        </div>

        {/* Mode: Shift Code Selection */}
        {mode === 'code' && (
          <>
            {/* Search Input */}
            <div className="px-4 py-3 border-b border-solid border-neutral-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtext-color" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search shift codes..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-solid border-neutral-border rounded-md text-body font-body text-default-font bg-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Shift Code List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-caption font-caption text-subtext-color">
                  No shift codes found
                </div>
              ) : (
                filtered.map(sc => (
                  <div
                    key={sc.code}
                    onClick={() => handleSelectCode(sc.code)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md mb-1 transition-all ${
                      currentShift === sc.code
                        ? 'bg-brand-50 border border-solid border-brand-200'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded border border-solid border-neutral-border flex-shrink-0"
                      style={{ backgroundColor: sc.color || '#e5e5e5' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-body-bold font-body-bold text-default-font mb-0.5">
                        {sc.code}
                      </div>
                      {sc.descriptor && (
                        <div className="text-caption font-caption text-subtext-color whitespace-nowrap overflow-hidden text-ellipsis">
                          {sc.descriptor}
                        </div>
                      )}
                    </div>

                    {sc.weighted_hours !== undefined && (
                      <div className="px-2 py-0.5 rounded bg-brand-50 text-caption font-caption text-brand-700 font-semibold">
                        {sc.weighted_hours}h
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Mode: Custom Time Entry */}
        {mode === 'custom' && (
          <div className="px-5 py-5 space-y-5">
            <div className="px-3 py-2.5 bg-brand-50 border border-solid border-brand-200 rounded-md">
              <p className="text-caption font-caption text-brand-700 m-0 leading-relaxed">
                💡 Use custom time entry when the shift doesn't match any predefined codes.
              </p>
            </div>

            <div>
              <label className="block mb-1.5 text-body-bold font-body-bold text-default-font">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-solid border-neutral-border rounded-md text-body font-body text-default-font bg-white"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-body-bold font-body-bold text-default-font">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-solid border-neutral-border rounded-md text-body font-body text-default-font bg-white"
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-success-50 border border-solid border-success-200 rounded-md">
              <span className="text-body-bold font-body-bold text-success-700">
                Total Hours:
              </span>
              <span className="text-heading-2 font-heading-2 text-success-600">
                {calculatedHours}h
              </span>
            </div>

            <Button
              onClick={handleCustomSubmit}
              disabled={calculatedHours <= 0}
              variant="brand-primary"
              size="large"
            >
              Add Shift ({startTime} - {endTime})
            </Button>
          </div>
        )}
      </div>
    </>
  );
}