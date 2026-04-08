// src/components/Lobby.jsx

import React, { useState } from 'react';

// This component receives the socket connection and the function to set the game ID
function Lobby({ socket, setGameId, currentStatus }) {
  const [inputID, setInputID] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if the socket is ready to communicate
  const isReady = socket && socket.connected;

  // Handles the logic for creating a brand new session
  const createNewGame = () => {
    if (!isReady) {
      setError("Server is not yet connected. Please wait for status 'Connected'.");
      return;
    }
    
    setLoading(true);
    setError('');

    // Emit the request to the server and wait for the callback (the new ID) from the server
    socket.emit('request_new_game', ({ gameId }) => {
      setLoading(false);
      
      if (gameId) {
        // The server sends the new ID back, and we pass it up to App.jsx
        console.log("Create New Game clicked.Received new Game ID from server:", gameId);
        setGameId(gameId); 
      } else {
        setError("Failed to create new game ID. Server response was empty.");
      }
    });
  };

  // Handles the logic for joining an already running session
  const joinExistingGame = () => {
    const id = inputID.toUpperCase();
    if (!id || id.length !== 4) {
      setError("Please enter a valid 4-character Game ID.");
      return;
    }
    
    // Clear the error and pass the manually entered ID up to App.jsx
    setError('');
    setGameId(id);
  };

  return (
    <div className="lobby-container">
      <h2>Scoreboard Game Setup</h2>
      
      <p className={`status-note status-${currentStatus.toLowerCase()}`}>
        Server Status: **{currentStatus}**
      </p>
      
      {loading && <p>Creating new game...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      
      {/* 1. Create New Game Button */}
      <div className="lobby-section">
        <h3>1. Start New Scoreboard (Main Display)</h3>
        <button 
          onClick={createNewGame} 
          disabled={loading || !isReady}
        >
          {loading ? 'Requesting...' : 'Create New Game'}
        </button>
      </div>

      <hr />

      {/* 2. Join Existing Game */}
      <div className="lobby-section">
        <h3>2. Join Existing Game (Remote/Spectator)</h3>
        <input 
          type="text"
          maxLength="4"
          placeholder="Enter 4-digit Game ID"
          value={inputID}
          onChange={(e) => setInputID(e.target.value.toUpperCase())}
          disabled={loading}
        />
        <button 
          onClick={joinExistingGame}
          disabled={loading || !inputID || inputID.length < 4}
        >
          Join Game
        </button>
        <p className="status-note">
          Use this to connect a second device to the scoreboard.
        </p>
      </div>
    </div>
  );
}

export default Lobby;