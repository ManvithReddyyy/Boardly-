import { useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import { useSocket } from './hooks/useSocket';
import { generateId } from './lib/utils';

function App() {
  const { socket, connected } = useSocket();
  const [boardId, setBoardId] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Get or create user ID
    let uid = localStorage.getItem('boardly_userId');
    if (!uid) {
      uid = `user_${generateId()}`;
      localStorage.setItem('boardly_userId', uid);
    }
    setUserId(uid);

    // Get board ID from URL or create new
    const path = window.location.pathname;
    const boardIdFromUrl = path.split('/board/')[1];
    
    if (boardIdFromUrl) {
      setBoardId(boardIdFromUrl);
    } else {
      const newBoardId = generateId();
      setBoardId(newBoardId);
      window.history.pushState({}, '', `/board/${newBoardId}`);
    }
  }, []);

  const joinBoard = () => {
    if (!username.trim()) {
      alert('Please enter a name');
      return;
    }
    localStorage.setItem('boardly_username', username);
    socket.emit('join-board', { boardId, userId, username });
    setJoined(true);
  };

  if (!socket || !connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to Boardly...</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Boardly
          </h1>
          <p className="text-center text-gray-600 mb-6">Real-time collaborative whiteboard</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && joinBoard()}
              />
            </div>

            <button
              onClick={joinBoard}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Join Board
            </button>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Share this link:</p>
              <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
                {window.location.href}
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Boardly
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {username}!</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Board link copied!');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Share Board
            </button>
          </div>
        </div>
      </div>
      
      <Canvas socket={socket} boardId={boardId} username={username} />

    </div>
  );
}

export default App;
