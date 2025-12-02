import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Delete } from 'lucide-react';

export default function FloatingCalculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 150, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = React.useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const inputNumber = (num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEqual = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX + deltaX,
        y: dragRef.current.initialY + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="fixed z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Card className="bg-white shadow-2xl border-0 overflow-hidden w-80">
        {/* Draggable Header */}
        <div
          className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <span className="text-white text-sm font-medium">Calculator</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Display */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 pb-4">
          <div className="text-right">
            <div className="text-slate-400 text-xs font-light mb-1 h-4">
              {operation && previousValue !== null ? `${previousValue} ${operation}` : ''}
            </div>
            <div className="text-white text-3xl font-light tracking-tight break-all">
              {display.length > 10 ? parseFloat(display).toExponential(5) : display}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-3 bg-white">
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <Button
              variant="ghost"
              onClick={clear}
              className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              <Delete className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium rounded-lg opacity-50 cursor-not-allowed"
              disabled
            >
              ±
            </Button>
            <Button
              variant="ghost"
              className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium rounded-lg opacity-50 cursor-not-allowed"
              disabled
            >
              %
            </Button>
            <Button
              variant="ghost"
              onClick={() => performOperation('÷')}
              className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-95"
            >
              ÷
            </Button>

            {/* Row 2 */}
            <Button variant="ghost" onClick={() => inputNumber(7)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">7</Button>
            <Button variant="ghost" onClick={() => inputNumber(8)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">8</Button>
            <Button variant="ghost" onClick={() => inputNumber(9)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">9</Button>
            <Button variant="ghost" onClick={() => performOperation('×')} className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-95">×</Button>

            {/* Row 3 */}
            <Button variant="ghost" onClick={() => inputNumber(4)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">4</Button>
            <Button variant="ghost" onClick={() => inputNumber(5)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">5</Button>
            <Button variant="ghost" onClick={() => inputNumber(6)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">6</Button>
            <Button variant="ghost" onClick={() => performOperation('-')} className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-95">−</Button>

            {/* Row 4 */}
            <Button variant="ghost" onClick={() => inputNumber(1)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">1</Button>
            <Button variant="ghost" onClick={() => inputNumber(2)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">2</Button>
            <Button variant="ghost" onClick={() => inputNumber(3)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">3</Button>
            <Button variant="ghost" onClick={() => performOperation('+')} className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-95">+</Button>

            {/* Row 5 */}
            <Button variant="ghost" onClick={() => inputNumber(0)} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg col-span-2 transition-all duration-200 active:scale-95">0</Button>
            <Button variant="ghost" onClick={inputDecimal} className="h-12 bg-gray-50 hover:bg-gray-100 text-slate-800 font-medium rounded-lg transition-all duration-200 active:scale-95">,</Button>
            <Button variant="ghost" onClick={handleEqual} className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 active:scale-95 shadow-lg">=</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}