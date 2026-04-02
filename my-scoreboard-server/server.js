// server.js

// 1. Import necessary libraries
const express = require('express');
const http = require('http'); // Node's built-in HTTP module
const socketIo = require('socket.io');

// 2. Initialize Express app
const app = express();
// Create an HTTP server instance from the Express app
const server = http.createServer(app); 

// 3. Initialize Socket.IO and attach it to the HTTP server and React
// The { cors } object is crucial for allowing your React frontend
// (which runs on a different port, like 5173) to connect securely.
const io = socketIo(server, {
    cors: {
        origin: [
            "http://localhost:5173", 
            "http://192.168.1.183:5173", // <--- ADD THIS LINE
            "https://onrender.com"
        ], // Replace with your React development URL
        methods: ["GET", "POST"]
    }
});

// Define the port the server will run on
const PORT = process.env.PORT || 3000; 

// 4. Basic Root Route (Optional)
// This is just a test to ensure the HTTP server is running and responds
app.get('/', (req, res) => {
    res.send('Scoreboard Server is running!');
});

// **Central Game State Storage in a simple object**
let gameStates = {}; 

// Function to generate a simple Game ID (e.g., A5B9)
const generateGameId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// --- Socket.IO Real-Time Logic ---
io.on('connection', (socket) => {
    // If you see this, the handshake worked!
    console.log(`--- SUCCESS: CLIENT CONNECTED! ID: ${socket.id} ---`);
    // console.log(`New client connected: ${socket.id}`);

    // 1. START GAME: Handles the request from the Lobby component
    socket.on('request_new_game', (callback) => {
        const gameId = generateGameId();
        
        // Initialize memory for the game state object with bracket notation since gameId is adynamic variable
        gameStates[gameId] = { 
            scoreA: 0, 
            scoreB: 0, 
            teamAName: 'HOME',
            teamBName: 'GUEST',
            sidesSwapped: false,
            lastSwitchedAt: 0 // Added for your 7-point tracking
        }; 
        
        // Join the room and send the new ID back via callback
        socket.join(gameId); 
        // CRITICAL: Calling callback() is what frees the Lobby component
        callback({ gameId }); 
        console.log(`Game created: ${gameId}`);
    });


    // 2. JOIN GAME: Handles requests from clients (Display/Remote) joining an existing game
    socket.on('join_game', (gameId) => {
        console.log(`Client ${socket.id} requested to join game: ${gameId}`);
        if (gameStates[gameId]) {
            socket.join(gameId); 
            console.log(`Client ${socket.id} joined room ${gameId}`);
            // Send the current state immediately upon joining
            socket.emit('score_updated', gameStates[gameId]);
        } else {
            // Send an error back if the ID is invalid
            socket.emit('error_message', 'Game ID not found.');
        }
    });

    // 3. UPDATE SCORE: Listener for score commands from the controls
    // Listener to handle score changes from the client buttons/remote
    socket.on('update_score_command', (data) => {
        console.log(`Received score update command:`, data);
        const { gameId, team, change } = data;
        const gameState = gameStates[gameId];
        
        if (!gameState) {
            console.error(`Error: Game ID ${gameId} not found.`);
            return;
        }

        // 1. Calculate the New Score so it can't be negative
        if (team === 'A') {
            // Prevent negative score
            gameState.scoreA = Math.max(0, gameState.scoreA + change);
        } else if (team === 'B') {
            // Prevent negative score
            gameState.scoreB = Math.max(0, gameState.scoreB + change);
        }

        // 2. Broadcast the updated state to ALL clients in this room
        // The clients will receive this via socket.on('score_updated', ...) in App.jsx
        io.to(gameId).emit('score_updated', gameState);
        
        console.log(`Score updated for ${gameId}. New score: A:${gameState.scoreA} B:${gameState.scoreB}`);
    });

    // ... (Add listener for the switch sides command)
    socket.on('switch_sides_command', (data) => {
        const gameId =  typeof data === 'string' ? data : data.gameId; // Handle both string and object formats
        const isPortrait = data.isPortrait || false; // Default to false if not provided
        const gameState = gameStates[gameId];

        if (gameState) {
            const { scoreA, scoreB } = gameState;
            const totalScore = scoreA + scoreB; // Added for your 7-point tracking
        
            // Check if someone has already won (Beach Volley rules)
            const winA = scoreA >= 21 && (scoreA - scoreB >= 2);
            const winB = scoreB >= 21 && (scoreB - scoreA >= 2);
            const isGameOver = winA || winB;

            if (isGameOver) {
                // 2. If game is over: Reset scores to 0, but DO NOT toggle sidesSwapped
                gameState.scoreA = 0;
                gameState.scoreB = 0;
                gameState.lastSwitchedAt = 0; // Reset your 7-point tracker
                console.log(`Game ${gameId} reset for new set (Sides stayed same).`);
            } else {
                // ONLY swap the sides if the user is NOT in portrait mode
                if (!isPortrait) {
                    gameState.sidesSwapped = !gameState.sidesSwapped;
                    console.log(`Sides swapped for ${gameId}.`);
                } else {
                    console.log(`Portrait mode detected: Overlay cleared, sides NOT swapped.`);
                }
                
                // ALWAYS update this so the 7-point overlay disappears
                gameState.lastSwitchedAt = totalScore; 
            }

            // Broadcast the updated state
            io.to(gameId).emit('score_updated', gameState);
            console.log(`Sides swapped for ${gameId}.`);
        }
    });

    socket.on('update_names_command', (data) => {
        const{ gameId, teamAName, teamBName } = data;
        if (gameStates[gameId]) {
            gameStates[gameId].teamAName = teamAName;
            gameStates[gameId].teamBName = teamBName;
            
            // Broadcast the updated state to ALL clients in this room
            io.to(gameId).emit('score_updated', gameStates[gameId]);
            console.log(`Team names updated for ${gameId}. New names: A:${teamAName} B:${teamBName}`);
        }
    })
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// 5. Start the server and listen for connections
// server.listen(PORT, '127.0.0.1', () => {
//     console.log(`Server listening on port ${PORT}`);
// });
// 5. Start the server and listen for connections
// Change '127.0.0.1' to '0.0.0.0' to allow connections from other devices (like your phone)
// server.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server listening on http://0.0.0.0:${PORT}`);
// });
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
