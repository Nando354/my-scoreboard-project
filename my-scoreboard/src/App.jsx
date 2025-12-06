// src/App.jsx

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import ScoreboardDisplay from './components/ScoreboardDisplay';
import Lobby from './components/Lobby';
import './App.css'; 

// IMPORTANT: Define the server URL. Use 127.0.0.1 if you made the IPv4 change in server.js
const SOCKET_SERVER_URL = "http://127.0.0.1:3000"; 
// If you didn't change server.js to bind to 127.0.0.1, use: "http://localhost:3000"

function App() {
  
  // 1. Initialize the socket immediately using useMemo (Port 3000)
  // This ensures the socket is created only once and is ready for the Lobby.
  const socket = useMemo(() => io(SOCKET_SERVER_URL, {
    // Optionally add this to ensure the client connects over HTTP/1.1 before upgrade
    transports: ['websocket', 'polling'] 
  }), []);

  // 2. Centralized State to hold ALL game data (single source of truth)
  const [gameState, setGameState] = useState({ 
    scoreA: 0, 
    scoreB: 0, 
    sidesSwapped: false,
    status: 'Connecting...',
    gameId: null // The unique ID for the session
  });
  
  // Function to set the game ID (called by the Lobby component)
  const setGameId = (id) => {
    setGameState(prev => ({ ...prev, gameId: id }));
  };

  // --- SOCKET.IO CONNECTION and LISTENERS ---
  
  useEffect(() => {
    
    // --- 3. Initial Connection & Status Handlers ---
    
    // Fires when the client successfully connects to the Node.js server
    socket.on('connect', () => {
        setGameState(prev => ({ ...prev, status: 'Connected' }));
        console.log("Client successfully connected to Game Server (3000). Socket ID:", socket.id, "Game ID:", gameState.gameId);
        
        // If we already have a gameId (e.g., coming out of the Lobby), join the room
        if (gameState.gameId) {
             socket.emit('join_game', gameState.gameId);
        }
    });

    socket.on('disconnect', () => {
        setGameState(prev => ({ ...prev, status: 'Disconnected' }));
    });
    
    // --- 4. Game-Specific Listeners ---
    
    // Primary Listener: Receive the authoritative state from the server
    socket.on('score_updated', (newState) => {
        // Overwrite the local score state with the server's new, accurate data
        setGameState(prev => ({ 
            ...prev, 
            ...newState, // Takes scoreA, scoreB, sidesSwapped, etc.
            status: 'Live' 
        }));
    });

    socket.on('error_message', (message) => {
        setGameState(prev => ({ ...prev, status: `Error: ${message}` }));
    });

    // --- 5. Cleanup ---
    
    // Cleanup the listeners when the component unmounts
    return () => {
        // Remove all listeners to prevent memory leaks/double-firing
        socket.off('connect');
        socket.off('disconnect');
        socket.off('score_updated');
        socket.off('error_message');
        // socket.disconnect(); // Generally, don't disconnect here unless App is truly unmounting
    };

  }, [gameState.gameId]); // Dependency focuses on state changes that require joining a room

  
  // --- RENDER LOGIC (Simple Routing) ---

  if (!gameState.gameId) {
    // Show the lobby/setup screen until a game ID is chosen or created
    return <Lobby socket={socket} setGameId={setGameId} currentStatus={gameState.status} />;
  }
  
  // Render the Scoreboard Display once the gameId is set
  return <ScoreboardDisplay socket={socket} gameState={gameState} />;
}

export default App;