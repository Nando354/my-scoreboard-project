function RemoteControl({ socket, gameId }) { 
    
    // 1. Define the function here, where it can access the props
    const sendScoreUpdate = (team, change) => {
        if (!socket || !gameId) {
            console.error("Socket not connected or Game ID missing!");
            return;
        }
        
        // 2. Use the available gameId and socket object
        socket.emit('update_score_command', { gameId, team, change });
    };

    return (
        <div className="remote-interface">
            <h2>Remote for Game: {gameId}</h2>
            
            {/* Team A Buttons */}
            <div>
                <h3>HOME</h3>
                {/* 3. Attach the function to the buttons */}
                <button onClick={() => sendScoreUpdate('A', 1)}>+</button>
                <button onClick={() => sendScoreUpdate('A', -1)}>-</button>
            </div>
            
            {/* Team B Buttons (or linked to your Bluetooth media keys) */}
            <div>
                <h3>GUEST</h3>
                <button onClick={() => sendScoreUpdate('B', 1)}>+</button>
                <button onClick={() => sendScoreUpdate('B', -1)}>-</button>
            </div>
        </div>
    );
}

export default RemoteControl;