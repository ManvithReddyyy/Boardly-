import { useRef, useEffect, useState } from 'react';
import { Download, Trash2, Users, Type } from 'lucide-react';

const Canvas = ({ socket, boardId, username }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [activeUsers, setActiveUsers] = useState([]);
  const [tool, setTool] = useState('pen');
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [canvasHistory, setCanvasHistory] = useState(null); // Store canvas state

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 100;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.on('draw', (data) => {
      drawLine(ctx, data);
    });

    socket.on('clear-canvas', () => {
      clearCanvas();
    });

    socket.on('users-in-board', (users) => {
      setActiveUsers(users);
    });

    socket.on('user-joined', (user) => {
      setActiveUsers(prev => [...prev, user]);
    });

    socket.on('user-left', (user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    socket.on('add-text', ({ text, x, y, color, size }) => {
      const ctx = canvas.getContext('2d');
      ctx.font = `${size}px "Segoe Print", "Comic Sans MS", cursive`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    });

    return () => {
      socket.off('draw');
      socket.off('clear-canvas');
      socket.off('users-in-board');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('add-text');
    };
  }, [socket]);

  // Handle keyboard input for direct typing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isTyping) return;

      if (e.key === 'Enter') {
        finishText();
      } else if (e.key === 'Escape') {
        // Restore canvas and cancel
        if (canvasHistory) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.putImageData(canvasHistory, 0, 0);
        }
        setIsTyping(false);
        setTextInput('');
        setCanvasHistory(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setTextInput(prev => prev.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTextInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isTyping, textInput, canvasHistory]);

  // Redraw text preview on canvas while typing
  useEffect(() => {
    if (!isTyping || !canvasHistory) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Restore original canvas
    ctx.putImageData(canvasHistory, 0, 0);

    // Draw current text with cursor
    ctx.font = `${brushSize * 4}px "Segoe Print", "Comic Sans MS", cursive`;
    ctx.fillStyle = color;
    ctx.fillText(textInput + '|', textPosition.x, textPosition.y);
  }, [textInput, isTyping, canvasHistory, textPosition, color, brushSize]);

  const drawLine = (ctx, { x0, y0, x1, y1, color, size }) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    if (tool !== 'pen' || isTyping) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const drawData = {
      x0: canvas.lastX,
      y0: canvas.lastY,
      x1: x,
      y1: y,
      color,
      size: brushSize,
      boardId
    };

    drawLine(ctx, drawData);
    socket.emit('draw', drawData);

    canvas.lastX = x;
    canvas.lastY = y;
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClear = () => {
    clearCanvas();
    socket.emit('clear-canvas', { boardId });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `boardly-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  // Handle text placement - start typing directly on canvas
  const handleCanvasClick = (e) => {
    if (tool !== 'text') return;
    if (isTyping) return; // Prevent multiple text inputs
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Save current canvas state
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory(imageData);
    
    setTextPosition({ x, y });
    setIsTyping(true);
    setTextInput('');
  };

  const finishText = () => {
    if (!textInput.trim()) {
      setIsTyping(false);
      setCanvasHistory(null);
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Restore original canvas and draw final text
    if (canvasHistory) {
      ctx.putImageData(canvasHistory, 0, 0);
    }
    
    ctx.font = `${brushSize * 4}px "Segoe Print", "Comic Sans MS", cursive`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    socket.emit('add-text', {
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      size: brushSize * 4,
      boardId
    });
    
    setTextInput('');
    setIsTyping(false);
    setCanvasHistory(null);
  };

  const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        className={`border border-gray-300 ${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'} bg-white`}
      />
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-xl shadow-lg space-y-4 border border-gray-200">
        {/* Tool selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">Tool</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTool('pen');
                if (isTyping && canvasHistory) {
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext('2d');
                  ctx.putImageData(canvasHistory, 0, 0);
                  setIsTyping(false);
                  setTextInput('');
                  setCanvasHistory(null);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                tool === 'pen' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="w-4 h-4 rounded-full border-2 border-current" />
              Pen
            </button>
            <button
              onClick={() => setTool('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                tool === 'text' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Type size={16} />
              Text
            </button>
          </div>
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">Color</p>
          <div className="flex gap-2 flex-wrap">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c ? 'border-gray-800 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 cursor-pointer rounded"
          />
        </div>

        {/* Brush size */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">
            {tool === 'text' ? 'Text Size' : 'Brush Size'}: {brushSize}{tool === 'text' ? 'x' : 'px'}
          </p>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={downloadCanvas}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      {/* Active Users */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-sm">Active Users ({activeUsers.length})</h3>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activeUsers.map((user) => (
            <div key={user.userId} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-700">{user.username}</span>
              {user.username === username && (
                <span className="text-xs text-gray-500">(you)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions when text tool is active */}
      {tool === 'text' && !isTyping && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm z-50">
          Click anywhere to start typing. Press <kbd className="bg-white text-black px-2 py-1 rounded mx-1">Enter</kbd> to finish or <kbd className="bg-white text-black px-2 py-1 rounded mx-1">Esc</kbd> to cancel.
        </div>
      )}
    </div>
  );
};

export default Canvas;
