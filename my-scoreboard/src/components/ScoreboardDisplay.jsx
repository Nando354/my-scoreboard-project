// src/components/ScoreboardDisplay.jsx

import React, { useEffect, useCallback } from 'react';

// This component receives the socket connection and the entire gameState object from App.jsx
function ScoreboardDisplay({ socket, gameState }) {
  const { scoreA, scoreB, sidesSwapped, status, gameId } = gameState;

  // --- 1. Score Emitter Function ---
  // This is called by both the manual buttons and the Bluetooth key handler.
  const sendScoreUpdate = useCallback((team, change) => {
    if (!socket || !gameId) {
        console.error("Socket not ready or Game ID missing! Cannot send command.");
        return;
    }

    // Send the structured command via Socket.IO
    socket.emit('update_score_command', { gameId, team, change });
  }, [socket, gameId]);


  // --- 2. Bluetooth (Keyboard) Handler ---
  // This hook sets up the event listener for the physical button presses.
  useEffect(() => {
    
    const handleKeyDown = (event) => {
        console.log("Key pressed:", event.key); // <-- ADD THIS LINE
        // CRITICAL: Stop the browser/OS from performing the default action (e.g., changing system volume)
        event.preventDefault(); 
        
        let team = null;
        let change = 0;

        // Map the media key signals to specific commands
        switch (event.key) {
            case '7': // Mapped from Volume Up
                team = 'B'; change = 1; break;
            case '8': // Mapped from Volume Down
                team = 'B'; change = -1; break;
            case '9': // Mapped from Next Track
                team = 'A'; change = 1; break;
            case '0': // Mapped from Previous Track
                team = 'A'; change = -1; break;
            case 'a': // Mapped from Play/Pause (Use lowercase for reliability)
            case 'A': 
                if (socket && gameId) {
                    socket.emit('switch_sides_command', gameId);
              }
              return;
            default:
              return;
        }
        
        // If a valid score command was mapped, send the update
        if (team && change !== 0) {
            sendScoreUpdate(team, change);
        }
    };

    // Attach the listener to the whole document
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup the listener when the component unmounts
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [socket, gameId, sendScoreUpdate]); // Dependencies ensure the latest socket/ID/function is used


  // --- 3. Display Logic ---

  // Determine which score belongs on the left and right based on the 'sidesSwapped' flag
  const leftScore = sidesSwapped ? scoreB : scoreA;
  const rightScore = sidesSwapped ? scoreA : scoreB;
  
  const leftTeamName = sidesSwapped ? 'GUEST' : 'HOME';
  const rightTeamName = sidesSwapped ? 'HOME' : 'GUEST';

  // Logic to determine the underlying Team ID (A or B) based on side swaps
  const teamAId = sidesSwapped ? 'B' : 'A';
  const teamBId = sidesSwapped ? 'A' : 'B';

  return (
    <div className="scoreboard-container">
      {/* Status Bar / Game ID */}
      <header className={`status-bar status-${status.toLowerCase()}`}>
        <p>Game ID: **{gameId}**</p>
        <p>Connection Status: **{status}**</p>
      </header>
      
      {/* Main Score Display */}
      <div className="scores-grid">
        
        {/* Left Team Panel (HOME/GUEST) */}
        <div className="team-panel team-left">
          <h1 className="left-team-title">{leftTeamName}</h1>
          <div className="left-score-value">
            {leftScore}
          </div>
          
          {/* Manual Control Buttons */}
          <div className="control-buttons">
            <button 
                onClick={() => sendScoreUpdate(teamAId, 1)}
                disabled={status !== 'Live'}
            >+</button>
            <button 
                onClick={() => sendScoreUpdate(teamAId, -1)}
                disabled={status !== 'Live' || leftScore <= 0}
            >-</button>
          </div>
        </div>
        
        <div className="separator-line"></div>
        
        {/* Right Team Panel (GUEST/HOME) */}
        <div className="team-panel team-right">
          <h1 className="right-team-title">{rightTeamName}</h1>
          <div className="right-score-value">
            {rightScore}
          </div>

          {/* Manual Control Buttons */}
          <div className="control-buttons">
            <button 
                onClick={() => sendScoreUpdate(teamBId, 1)}
                disabled={status !== 'Live'}
            >+</button>
            <button 
                onClick={() => sendScoreUpdate(teamBId, -1)}
                disabled={status !== 'Live' || rightScore <= 0}
            >-</button>
          </div>
        </div>
      </div>
      {/* Global Controls */}
      <div className="global-controls">
        <button 
            className="swap-button"
            onClick={() => socket.emit('switch_sides_command', gameId)}
            disabled={status !== 'Live'}
        >
            Swap Sides
        </button>
      </div>
    </div>
  );
}

export default ScoreboardDisplay;