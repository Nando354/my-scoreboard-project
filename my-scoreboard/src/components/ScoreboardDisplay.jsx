// src/components/ScoreboardDisplay.jsx

import React, { useEffect, useCallback } from 'react';

// This component receives the socket connection and the entire gameState object from App.jsx
function ScoreboardDisplay({ socket, gameState }) {
  const { scoreA, scoreB, teamAName, teamBName, sidesSwapped, status, gameId } = gameState;

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
        // If the user is typing in ANY input or textarea, let the keys work normally as opposed to controlling the scoreboard (important for the team name inputs). This allows the media keys to control the scoreboard while still letting you type in the team names without interruption.
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return; 
        }

        console.log("Key pressed:", event.key);
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
  
  // Similarly, determine the team names for the left and right panels
  const leftTeamName = sidesSwapped ? teamBName : teamAName;
  const rightTeamName = sidesSwapped ? teamAName : teamBName;

  // Logic to determine the underlying Team ID (A or B) based on side swaps corresoponding to the physical buttons
  const teamAId = sidesSwapped ? 'B' : 'A';
  const teamBId = sidesSwapped ? 'A' : 'B';

  //Beach Volleyball Scoreing and switching rules
  const totalScore = scoreA + scoreB;
  //Switch sides every 7 points but don't show if the game is already over
  const isSwitchPoint = totalScore > 0 && totalScore % 7 === 0;

  //Win Logic: At least 21 point And leading by at least 2 points
  const winA = scoreA >= 21 && (scoreA -scoreB >= 2);
  const winB = scoreB >= 21 && (scoreB -scoreA >= 2);
  const isGameOver = winA || winB;

  return (
    /* Update the className to dynamically add 'switch-alert' or 'game-over' */
    <div className={`scoreboard-container ${isSwitchPoint && !isGameOver ? 'switch-alert' : ''} ${isGameOver ? 'game-over' : ''}`}>
      
      {/* 1. SWITCH OVERLAY */}
      {isSwitchPoint && !isGameOver && (
        <div className="switch-overlay">
          <h1>SWITCH SIDES</h1>
          {/* <h1>{scoreA} - {scoreB}</h1> */}
          <h1>Total Points: {totalScore}</h1>
        </div>
      )}

      {/* 2. WINNER OVERLAY */}
      {isGameOver && (
        <div className="winner-overlay">
          <h1>{winA ? teamAName : teamBName} WINS!</h1>
          {/* <p>{scoreA} - {scoreB}</p> */}
          <button onClick={() => window.location.reload()}>Reset Match</button>
        </div>
      )}

      {/* Status Bar / Game ID */}
      <header className={`status-bar status-${status.toLowerCase()}`}>
        <p>Game ID: **{gameId}**</p>
        <p>Connection Status: **{status}**</p>
      </header>
      
      {/* Main Score Display */}
      <div className="scores-grid">
        
        {/* Left Team Panel (HOME/GUEST) */}
        <div className="team-panel team-left">
          <input 
            className="team-name-input"
            value={leftTeamName} 
            onChange={(e) => {
              const newName = e.target.value;
              // We determine WHICH team is currently on the left to send the right update
              const updateData = sidesSwapped 
                ? { gameId, teamAName, teamBName: newName } 
                : { gameId, teamAName: newName, teamBName };

              socket.emit('update_names_command', updateData);
            }}
          />
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
          <input 
            className="team-name-input"
            value={rightTeamName} 
            onChange={(e) => {
              const newName = e.target.value;
              // We determine WHICH team is currently on the right to send the right update
              const updateData = sidesSwapped 
                ? { gameId, teamAName: newName, teamBName } 
                : { gameId, teamAName, teamBName: newName };

              socket.emit('update_names_command', updateData);
            }} 
          />

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