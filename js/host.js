// ==================== HOST.JS ====================
// Pandemic Web Game - Host/TV Display Logic
// ================================================

// ==================== GLOBAL VARIABLES ====================
let currentRoomCode = null;
let currentGameState = null;
let playersData = {};
let gameSettings = {
    difficulty: 'easy',
    turnTimer: 60
};
let timerInterval = null;
let currentTime = 0;

// ==================== INITIALIZATION ====================

// Check browser compatibility
function checkBrowserCompatibility() {
    const requiredFeatures = [
        { name: 'Promise', check: typeof Promise !== 'undefined' },
        { name: 'fetch', check: typeof fetch !== 'undefined' },
        { name: 'classList', check: 'classList' in document.createElement('div') },
        { name: 'Object.keys', check: typeof Object.keys === 'function' }
    ];
    
    const missing = requiredFeatures.filter(f => !f.check).map(f => f.name);
    
    if (missing.length > 0) {
        alert(`Browser tidak didukung. Fitur yang hilang: ${missing.join(', ')}\n\nGunakan browser modern seperti Chrome, Firefox, atau Edge.`);
        return false;
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🖥️ Host Display Initialized');
    
    // Check browser compatibility first
    if (!checkBrowserCompatibility()) {
        console.error('❌ Browser not compatible');
        return;
    }
    
    initializeHost();
});

/**
 * Initialize host display
 */
async function initializeHost() {
    try {
        // Create new room
        currentRoomCode = await createRoom(gameSettings);
        
        // Display room code
        document.getElementById('roomCode').textContent = currentRoomCode;
        
        // Generate QR Code
        generateQRCode();
        
        // Set join URL - get directory from current path
        const currentPath = window.location.pathname;
        const directory = currentPath.substring(0, currentPath.lastIndexOf('/'));
        const joinUrl = `${window.location.origin}${directory}/player.html?room=${currentRoomCode}`;
        document.getElementById('joinUrl').textContent = joinUrl;
        
        // Listen to room changes
        listenToRoom(currentRoomCode, handleRoomUpdate);
        
        // Listen to players
        listenToPlayers(currentRoomCode, handlePlayersUpdate);
        
        console.log('✅ Room created:', currentRoomCode);
        
    } catch (error) {
        console.error('❌ Error initializing host:', error);
        alert('Gagal membuat room. Silakan refresh halaman.');
    }
}

/**
 * Generate QR Code for joining
 */
function generateQRCode() {
    // Get current page path and construct player URL correctly
    const currentPath = window.location.pathname;
    const directory = currentPath.substring(0, currentPath.lastIndexOf('/'));
    const joinUrl = `${window.location.origin}${directory}/player.html?room=${currentRoomCode}`;
    
    console.log('📱 Join URL:', joinUrl);
    
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    QRCode.toCanvas(document.createElement('canvas'), joinUrl, {
        width: 200,
        margin: 0,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, (error, canvas) => {
        if (error) {
            console.error('QR Code error:', error);
            return;
        }
        qrContainer.appendChild(canvas);
    });
}

// ==================== ROOM HANDLERS ====================

/**
 * Handle room updates
 */
function handleRoomUpdate(roomData) {
    if (!roomData) {
        console.log('Room deleted or not found');
        return;
    }
    
    // Check if game started
    if (roomData.status === 'playing' && roomData.gameState) {
        currentGameState = roomData.gameState;
        showGameScreen();
        updateGameDisplay();
    }
}

/**
 * Handle players update
 */
function handlePlayersUpdate(players) {
    playersData = players || {};
    const playerCount = Object.keys(playersData).length;
    
    // Update player count
    document.getElementById('playerCount').textContent = playerCount;
    
    // Update players grid
    updatePlayersGrid();
    
    // Enable/disable start button
    const startBtn = document.getElementById('startBtn');
    const allReady = playerCount >= 2 && Object.values(playersData).every(p => p.ready);
    startBtn.disabled = !(playerCount >= 2 && allReady);
    
    if (playerCount < 2) {
        startBtn.title = 'Minimal 2 pemain untuk memulai';
    } else if (!allReady) {
        startBtn.title = 'Semua pemain harus siap';
    } else {
        startBtn.title = 'Mulai permainan!';
    }
}

/**
 * Update players grid display
 */
function updatePlayersGrid() {
    const grid = document.getElementById('playersGrid');
    const players = Object.values(playersData);
    
    let html = '';
    
    // Add player cards
    players.forEach((player, index) => {
        const readyClass = player.ready ? 'ready' : '';
        const readyIcon = player.ready ? '✅' : '⏳';
        const roleColors = [
            '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a8d8ea',
            '#aa96da', '#fcbad3', '#f38181', '#3d5a80', '#98c1d9'
        ];
        
        html += `
            <div class="player-card ${readyClass}" style="animation-delay: ${index * 0.1}s">
                <div class="player-avatar" style="background: ${roleColors[index % roleColors.length]}">
                    ${player.avatar || '👤'}
                </div>
                <div class="player-info">
                    <div class="player-name">${escapeHtml(player.name)}</div>
                    <div class="player-role">${player.ready ? 'Siap!' : 'Menunggu...'}</div>
                </div>
                <div class="player-status">${readyIcon}</div>
            </div>
        `;
    });
    
    // Add empty slots
    const emptySlots = Math.max(0, 4 - players.length);
    for (let i = 0; i < emptySlots; i++) {
        html += `
            <div class="empty-slot">
                <i class="fas fa-user-plus"></i> Menunggu...
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

// ==================== SETTINGS ====================

/**
 * Open settings modal
 */
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

/**
 * Close settings modal
 */
function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

/**
 * Select difficulty
 */
function selectDifficulty(element) {
    document.querySelectorAll('.setting-group:first-of-type .setting-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    gameSettings.difficulty = element.dataset.difficulty;
}

/**
 * Select timer
 */
function selectTimer(element) {
    document.querySelectorAll('.setting-group:last-of-type .setting-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    gameSettings.turnTimer = parseInt(element.dataset.timer);
}

/**
 * Save settings
 */
async function saveSettings() {
    try {
        await roomsRef.child(currentRoomCode).child('settings').update(gameSettings);
        closeSettings();
        showToast('Pengaturan disimpan!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Gagal menyimpan pengaturan', 'error');
    }
}

// ==================== GAME START ====================

/**
 * Start the game
 */
async function startGame() {
    const players = Object.entries(playersData);
    
    if (players.length < 2) {
        showToast('Minimal 2 pemain untuk memulai!', 'error');
        return;
    }
    
    try {
        // ✅ FIX: Fetch settings from Firebase (not local variable)
        const settingsSnapshot = await roomsRef.child(currentRoomCode).child('settings').once('value');
        const savedSettings = settingsSnapshot.val() || {};
        
        // Merge with defaults
        const finalSettings = {
            difficulty: savedSettings.difficulty || gameSettings.difficulty || 'easy',
            turnTimer: savedSettings.turnTimer !== undefined ? savedSettings.turnTimer : (gameSettings.turnTimer || 60)
        };
        
        console.log('🎮 Starting game with settings:', finalSettings);
        
        // Initialize game state with correct settings
        const gameState = initializeGameState(players, finalSettings);
        
        // Update room status and game state
        await roomsRef.child(currentRoomCode).update({
            status: 'playing',
            gameState: gameState
        });
        
        console.log('🎮 Game Started!');
        
    } catch (error) {
        console.error('Error starting game:', error);
        showToast('Gagal memulai game', 'error');
    }
}

/**
 * Initialize game state
 * @param {Array} players - Array of [playerId, playerData]
 * @param {Object} settings - Game settings (difficulty, turnTimer)
 */
function initializeGameState(players, settings = {}) {
    // ✅ FIX: Use passed settings, fallback to global
    const finalSettings = {
        difficulty: settings.difficulty || gameSettings.difficulty || 'easy',
        turnTimer: settings.turnTimer !== undefined ? settings.turnTimer : (gameSettings.turnTimer || 60)
    };
    
    // ✅ FIX: Better role randomization - use crypto if available, else Math.random
    const availableRoles = Object.values(ROLES);
    
    // Proper Fisher-Yates shuffle with better randomization
    for (let i = availableRoles.length - 1; i > 0; i--) {
        // Use multiple random sources for better distribution
        const randomValue = (Math.random() + Math.random() + Date.now() % 1000 / 1000) / 3;
        const j = Math.floor(randomValue * (i + 1));
        [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
    }
    
    // Additional shuffle to break patterns
    for (let i = 0; i < 3; i++) {
        const idx1 = Math.floor(Math.random() * availableRoles.length);
        const idx2 = Math.floor(Math.random() * availableRoles.length);
        [availableRoles[idx1], availableRoles[idx2]] = [availableRoles[idx2], availableRoles[idx1]];
    }
    
    console.log('🎭 Shuffled roles:', availableRoles.map(r => r.name));
    
    // Create players state
    const playersState = {};
    players.forEach(([playerId, playerData], index) => {
        const role = availableRoles[index % availableRoles.length];
        playersState[playerId] = {
            ...playerData,
            role: role,
            location: 'atlanta',
            cards: [],
            actionsLeft: role.id === 'generalist' ? 5 : 4
        };
    });
    
    // Initialize cities
    const citiesState = {};
    Object.keys(CITIES).forEach(cityId => {
        citiesState[cityId] = {
            disease: {
                blue: 0,
                yellow: 0,
                black: 0,
                red: 0
            },
            hasResearchStation: cityId === 'atlanta'
        };
    });
    
    // Create infection deck
    const infectionDeck = shuffleArray(Object.keys(CITIES));
    
    // Initial infection (3 cities with 3, 3 cities with 2, 3 cities with 1)
    const infectionDiscard = [];
    for (let cubes = 3; cubes >= 1; cubes--) {
        for (let i = 0; i < 3; i++) {
            const cityId = infectionDeck.pop();
            const city = CITIES[cityId];
            citiesState[cityId].disease[city.color] = cubes;
            infectionDiscard.push(cityId);
        }
    }
    
    // Create player deck
    let playerDeck = [];
    
    // Add city cards
    Object.keys(CITIES).forEach(cityId => {
        playerDeck.push({
            type: 'city',
            id: cityId,
            name: CITIES[cityId].name,
            color: CITIES[cityId].color
        });
    });
    
    // Add event cards
    EVENT_CARDS.forEach(event => {
        playerDeck.push({
            type: 'event',
            id: event.id,
            name: event.name,
            icon: event.icon,
            description: event.description
        });
    });
    
    // Shuffle player deck
    playerDeck = shuffleArray(playerDeck);
    
    // Deal initial cards (2 cards per player for 4+ players, more for fewer)
    const cardsPerPlayer = players.length <= 2 ? 4 : players.length <= 3 ? 3 : 2;
    Object.keys(playersState).forEach(playerId => {
        for (let i = 0; i < cardsPerPlayer; i++) {
            if (playerDeck.length > 0) {
                playersState[playerId].cards.push(playerDeck.pop());
            }
        }
    });
    
    // Add epidemic cards - ✅ FIX: Use finalSettings not gameSettings
    const epidemicCount = DIFFICULTY[finalSettings.difficulty]?.epidemics || 4;
    console.log(`⚠️ Adding ${epidemicCount} epidemic cards (${finalSettings.difficulty} difficulty)`);
    const pileSize = Math.floor(playerDeck.length / epidemicCount);
    const piles = [];
    
    for (let i = 0; i < epidemicCount; i++) {
        const start = i * pileSize;
        const end = i === epidemicCount - 1 ? playerDeck.length : (i + 1) * pileSize;
        const pile = playerDeck.slice(start, end);
        pile.push({ type: 'epidemic', id: `epidemic_${i}`, name: 'EPIDEMIC' });
        piles.push(shuffleArray(pile));
    }
    
    playerDeck = piles.flat();
    
    // Create turn order
    const turnOrder = Object.keys(playersState);
    shuffleArray(turnOrder);
    
    // Game state object
    return {
        phase: 'action', // action, draw, infect
        currentPlayerIndex: 0,
        turnOrder: turnOrder,
        round: 1,
        
        players: playersState,
        cities: citiesState,
        
        playerDeck: playerDeck,
        playerDiscard: [],
        infectionDeck: infectionDeck,
        infectionDiscard: infectionDiscard,
        
        outbreakCount: 0,
        infectionRateIndex: 0,
        
        cures: {
            blue: false,
            yellow: false,
            black: false,
            red: false
        },
        eradicated: {
            blue: false,
            yellow: false,
            black: false,
            red: false
        },
        
        cubesLeft: {
            blue: 24 - 9, // 9 used in initial infection (3+3+3 cities, but varies)
            yellow: 24,
            black: 24,
            red: 24
        },
        
        researchStations: 5, // 6 total, 1 used in Atlanta
        
        gameOver: false,
        gameResult: null, // 'win' or 'lose'
        
        log: [
            { time: Date.now(), message: '🎮 Game dimulai!', type: 'info' },
            { time: Date.now(), message: `⚙️ Kesulitan: ${DIFFICULTY[finalSettings.difficulty]?.name || 'Mudah'} (${epidemicCount} epidemik)`, type: 'info' }
        ],
        
        settings: finalSettings,
        
        lastUpdate: getTimestamp()
    };
}

// ==================== GAME DISPLAY ====================

/**
 * Show game screen
 */
function showGameScreen() {
    console.log('🎮 Showing game screen');
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('active');
    
    // Display room code
    const gameRoomCodeEl = document.getElementById('gameRoomCode');
    if (gameRoomCodeEl && currentRoomCode) {
        gameRoomCodeEl.textContent = currentRoomCode;
    }
    
    // Render cities on map
    renderCities();
    
    // Start listening for game updates
    listenToGameState(currentRoomCode, handleGameStateUpdate);
}

/**
 * Handle game state updates
 */
function handleGameStateUpdate(gameState) {
    if (!gameState) return;
    
    currentGameState = gameState;
    updateGameDisplay();
    
    // Check game over
    if (gameState.gameOver) {
        showGameOverModal(gameState.gameResult);
    }
}

/**
 * Update all game display elements
 */
function updateGameDisplay() {
    if (!currentGameState) return;
    
    updateOutbreakTrack();
    updateInfectionTrack();
    updateCardsLeft();
    updateCurrentTurn();
    updateCuresDisplay();
    updatePlayersPanel();
    updateCitiesDisplay();
    updateGameLog();

}

/**
 * Update outbreak track
 */
function updateOutbreakTrack() {
    const track = document.getElementById('outbreakTrack');
    const markers = track.querySelectorAll('.outbreak-marker');
    
    markers.forEach((marker, index) => {
        marker.classList.remove('active');
        if (index < currentGameState.outbreakCount) {
            marker.classList.add('active');
        }
    });
}

/**
 * Update infection rate track
 */
function updateInfectionTrack() {
    const track = document.getElementById('infectionTrack');
    const markers = track.querySelectorAll('.infection-marker');
    
    markers.forEach((marker, index) => {
        marker.classList.remove('active');
        if (index === currentGameState.infectionRateIndex) {
            marker.classList.add('active');
        }
    });
}

/**
 * Update cards left display
 */
function updateCardsLeft() {
    const cardsLeft = document.getElementById('cardsLeft');
    const count = currentGameState.playerDeck.length;
    
    cardsLeft.textContent = count;
    cardsLeft.classList.remove('safe', 'warning', 'danger');
    
    if (count > 20) {
        cardsLeft.classList.add('safe');
    } else if (count > 10) {
        cardsLeft.classList.add('warning');
    } else {
        cardsLeft.classList.add('danger');
    }
}

/**
 * Update current turn display
 */
function updateCurrentTurn() {
    const currentPlayerId = currentGameState.turnOrder[currentGameState.currentPlayerIndex];
    const currentPlayer = currentGameState.players[currentPlayerId];
    
    if (currentPlayer) {
        document.getElementById('turnAvatar').textContent = currentPlayer.avatar;
        document.getElementById('turnAvatar').style.background = currentPlayer.role.color;
        document.getElementById('turnName').textContent = currentPlayer.name;
        document.getElementById('turnActions').textContent = currentPlayer.actionsLeft;
    }
}

/**
 * Update cures display
 */
function updateCuresDisplay() {
    const colors = ['blue', 'yellow', 'black', 'red'];
    
    colors.forEach(color => {
        const element = document.getElementById(`cure${color.charAt(0).toUpperCase() + color.slice(1)}`);
        const statusText = element.querySelector('.cure-status');
        
        if (currentGameState.eradicated[color]) {
            element.classList.add('cured');
            element.querySelector('.cure-icon').textContent = '🏆';
            statusText.textContent = 'Eradicated!';
        } else if (currentGameState.cures[color]) {
            element.classList.add('cured');
            element.querySelector('.cure-icon').textContent = '✅';
            statusText.textContent = 'Cured!';
        } else {
            element.classList.remove('cured');
            element.querySelector('.cure-icon').textContent = '🧪';
            statusText.textContent = 'Belum';
        }
    });
}

/**
 * Update players panel
 */
function updatePlayersPanel() {
    const container = document.getElementById('gamePlayers');
    const currentPlayerId = currentGameState.turnOrder[currentGameState.currentPlayerIndex];
    
    let html = '';
    
    currentGameState.turnOrder.forEach(playerId => {
        const player = currentGameState.players[playerId];
        const isActive = playerId === currentPlayerId;
        
        html += `
            <div class="player-status-card ${isActive ? 'active' : ''}">
                <div class="player-status-avatar" style="background: ${player.role.color}">
                    ${player.avatar}
                </div>
                <div class="player-status-info">
                    <div class="player-status-name">${escapeHtml(player.name)}</div>
                    <div class="player-status-role">${player.role.name}</div>
                </div>
                <div class="player-cards-count">🃏 ${player.cards.length}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Render cities on map
 */
function renderCities() {
    const container = document.getElementById('citiesContainer');
    const svg = document.getElementById('connectionsSvg');
    
    // Clear existing
    container.innerHTML = '';
    svg.innerHTML = '';
    
    // Draw connections first
    const drawnConnections = new Set();
    
    Object.entries(CITIES).forEach(([cityId, city]) => {
        city.connections.forEach(connectedId => {
            const connectionKey = [cityId, connectedId].sort().join('-');
            
            if (!drawnConnections.has(connectionKey)) {
                drawnConnections.add(connectionKey);
                
                const connectedCity = CITIES[connectedId];
                if (connectedCity) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', `${city.position.x}%`);
                    line.setAttribute('y1', `${city.position.y}%`);
                    line.setAttribute('x2', `${connectedCity.position.x}%`);
                    line.setAttribute('y2', `${connectedCity.position.y}%`);
                    line.setAttribute('class', 'connection-line');
                    svg.appendChild(line);
                }
            }
        });
    });
    
    // Draw cities
    Object.entries(CITIES).forEach(([cityId, city]) => {
        const cityElement = document.createElement('div');
        cityElement.className = `city ${city.color}`;
        cityElement.id = `city-${cityId}`;
        cityElement.style.left = `${city.position.x}%`;
        cityElement.style.top = `${city.position.y}%`;
        
        cityElement.innerHTML = `
            <div class="disease-cubes" id="cubes-${cityId}"></div>
            <div class="city-dot"></div>
            <div class="city-name">${city.name}</div>
            <div class="research-station" id="station-${cityId}" style="display: none;">🏥</div>
            <div class="player-tokens" id="tokens-${cityId}"></div>
        `;
        
        cityElement.onclick = () => showCityInfo(cityId);
        container.appendChild(cityElement);
    });
}

/**
 * Update cities display
 */
function updateCitiesDisplay() {
    if (!currentGameState) return;
    
    Object.entries(currentGameState.cities).forEach(([cityId, cityState]) => {
        // Update disease cubes
        const cubesContainer = document.getElementById(`cubes-${cityId}`);
        if (cubesContainer) {
            let cubesHtml = '';
            ['blue', 'yellow', 'black', 'red'].forEach(color => {
                for (let i = 0; i < cityState.disease[color]; i++) {
                    cubesHtml += `<div class="disease-cube ${color}"></div>`;
                }
            });
            cubesContainer.innerHTML = cubesHtml;
        }
        
        // Update research station
        const station = document.getElementById(`station-${cityId}`);
        if (station) {
            station.style.display = cityState.hasResearchStation ? 'block' : 'none';
        }
    });
    
    // Update player tokens
    Object.entries(CITIES).forEach(([cityId]) => {
        const tokensContainer = document.getElementById(`tokens-${cityId}`);
        if (tokensContainer) {
            tokensContainer.innerHTML = '';
        }
    });
    
    Object.entries(currentGameState.players).forEach(([playerId, player]) => {
        const tokensContainer = document.getElementById(`tokens-${player.location}`);
        if (tokensContainer) {
            const token = document.createElement('div');
            token.className = 'player-token';
            token.style.background = player.role.color;
            token.textContent = player.avatar;
            token.title = player.name;
            tokensContainer.appendChild(token);
        }
    });
}

/**
 * Update game log
 */
function updateGameLog() {
    const container = document.getElementById('gameLog');
    
    const logs = currentGameState.log.slice(-20).reverse();
    
    let html = '';
    logs.forEach(log => {
        const time = new Date(log.time).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        html += `
            <div class="log-entry ${log.type || ''}">
                <span class="time">${time}</span> - ${log.message}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Show city info (when clicked)
 */
function showCityInfo(cityId) {
    const city = CITIES[cityId];
    const cityState = currentGameState?.cities[cityId];
    
    if (!city || !cityState) return;
    
    const diseases = ['blue', 'yellow', 'black', 'red']
        .filter(c => cityState.disease[c] > 0)
        .map(c => `${c}: ${cityState.disease[c]}`)
        .join(', ') || 'Tidak ada';
    
    console.log(`📍 ${city.name} (${city.color})`);
    console.log(`   Penyakit: ${diseases}`);
    console.log(`   Research Station: ${cityState.hasResearchStation ? 'Ya' : 'Tidak'}`);
}

// ==================== GAME OVER ====================

/**
 * Show game over modal
 */
function showGameOverModal(result) {
    const modal = document.getElementById('gameOverModal');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');
    
    if (result === 'win') {
        icon.textContent = '🏆';
        title.textContent = 'KEMENANGAN!';
        title.className = 'modal-title win';
        message.textContent = 'Selamat! Tim berhasil menemukan obat untuk semua penyakit dan menyelamatkan dunia!';
    } else {
        icon.textContent = '💀';
        title.textContent = 'KEKALAHAN...';
        title.className = 'modal-title lose';
        
        // Determine loss reason
        let reason = 'Dunia telah jatuh ke dalam kegelapan.';
        if (currentGameState.outbreakCount >= 8) {
            reason = 'Terlalu banyak outbreak! Kepanikan melanda dunia.';
        } else if (currentGameState.playerDeck.length === 0) {
            reason = 'Kehabisan waktu! Tidak ada harapan tersisa.';
        } else {
            const emptyColor = Object.entries(currentGameState.cubesLeft).find(([_, count]) => count < 0);
            if (emptyColor) {
                reason = `Penyakit ${emptyColor[0]} menyebar tak terkendali!`;
            }
        }
        message.textContent = reason;
    }
    
    modal.classList.add('active');
}

/**
 * Restart game
 */
async function restartGame() {
    try {
        // Reset room to lobby state
        await roomsRef.child(currentRoomCode).update({
            status: 'lobby',
            gameState: null
        });
        
        // Reset all players ready status
        const playerUpdates = {};
        Object.keys(playersData).forEach(playerId => {
            playerUpdates[`players/${playerId}/ready`] = false;
        });
        await roomsRef.child(currentRoomCode).update(playerUpdates);
        
        // Hide game over modal
        document.getElementById('gameOverModal').classList.remove('active');
        
        // Show lobby screen
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('lobbyScreen').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error restarting game:', error);
    }
}

/**
 * Exit room
 */
async function exitRoom() {
    if (confirm('Yakin ingin keluar? Room akan dihapus.')) {
        try {
            await deleteRoom(currentRoomCode);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error exiting room:', error);
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast if doesn't exist
    let toast = document.getElementById('hostToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'hostToast';
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-info-circle toast-icon"></i>
            <span class="toast-message"></span>
        `;
        document.body.appendChild(toast);
        
        // Add toast styles if not present
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: rgba(0,0,0,0.9);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 12px;
                padding: 15px 25px;
                z-index: 2000;
                transition: transform 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .toast.show { transform: translateX(-50%) translateY(0); }
            .toast.success { border-color: rgba(0, 255, 136, 0.5); }
            .toast.error { border-color: rgba(255, 68, 68, 0.5); }
            .toast.info { border-color: rgba(0, 180, 216, 0.5); }
            .toast.success .toast-icon { color: #00ff88; }
            .toast.error .toast-icon { color: #ff4444; }
            .toast.info .toast-icon { color: #00b4d8; }
        `;
        document.head.appendChild(style);
    }
    
    // Set content
    toast.className = `toast ${type}`;
    toast.querySelector('.toast-message').textContent = message;
    
    // Set icon
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    toast.querySelector('.toast-icon').className = `fas ${iconMap[type] || iconMap.info} toast-icon`;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after delay
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== DEBUG FUNCTIONS ====================

/**
 * Debug: Log current game state
 */
function debugGameState() {
    console.log('=== GAME STATE ===');
    console.log(currentGameState);
}

/**
 * Debug: Add test players
 */
async function debugAddPlayers(count = 2) {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const avatars = ['🧑‍🔬', '👨‍⚕️', '👩‍🔬', '🧑‍✈️', '👷', '🦸', '🧙', '👨‍🚀', '🥷', '🧛'];
    
    for (let i = 0; i < count; i++) {
        await joinRoom(currentRoomCode, {
            name: names[i],
            avatar: avatars[i]
        });
    }
    
    console.log(`Added ${count} test players`);
}

// Make debug functions available globally
window.debugGameState = debugGameState;
window.debugAddPlayers = debugAddPlayers;

console.log('🖥️ Host.js Loaded Successfully!');