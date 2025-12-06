// server.js

// 1. Import necessary libraries
const express = require('express');
const http = require('http'); // Node's built-in HTTP module
const socketIo = require('socket.io');

// 2. Initialize Express app
const app = express();
// Create an HTTP server instance from the Express app
const server = http.createServer(app); 

// 3. Initialize Socket.IO and attach it to the HTTP server
// The { cors } object is crucial for allowing your React frontend
// (which runs on a different port, like 5173) to connect securely.
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173", // Replace with your React development URL
        methods: ["GET", "POST"]
    }
});

// Define the port the server will run on
const PORT = process.env.PORT || 3000; 

// 4. Basic Root Route (Optional)
// This is just a test to ensure the HTTP server is running
app.get('/', (req, res) => {
    res.send('Scoreboard Server is running!');
});

// **Central Game State Storage**
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
        
        // Initialize the game state
        gameStates[gameId] = { 
            scoreA: 0, 
            scoreB: 0, 
            sidesSwapped: false 
        }; 
        
        // Join the room and send the new ID back via callback
        socket.join(gameId); 
        // CRITICAL: Calling callback() is what frees the Lobby component
        callback({ gameId }); 
        console.log(`Game created: ${gameId}`);
    });


    // 2. JOIN GAME: Handles requests from clients (Display/Remote) joining an existing game
    socket.on('join_game', (gameId) => {
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

    // 3. (Future) UPDATE SCORE: Listener for score commands from the controls
    socket.on('update_score_command', ({ gameId, team, change }) => {
        // You'll add your score calculation and broadcast logic here later
        console.log(`Received command for ${gameId}: ${team} ${change}`);
    });
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// 5. Start the server and listen for connections
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server listening on port ${PORT}`);
});