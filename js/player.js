// ==================== PLAYER.JS ====================
// Pandemic Web Game - Player/Mobile Logic
// ==================================================

// ==================== GLOBAL VARIABLES ====================
let currentRoomCode = null;
let currentPlayerId = null;
let currentPlayerData = null;
let currentGameState = null;
let roomData = null;
let selectedCards = [];
let timerInterval = null;
let currentTime = 0;

// Card Drawing State
let cardsToDraw = 0;
let cardsDrawn = 0;
let isDrawingCards = false;
let isCurrentlyDrawing = false; // Lock to prevent concurrent draws

// ==================== INITIALIZATION ====================

// Check browser compatibility
function checkBrowserCompatibility() {
    const requiredFeatures = [
        { name: 'Promise', check: typeof Promise !== 'undefined' },
        { name: 'fetch', check: typeof fetch !== 'undefined' },
        { name: 'localStorage', check: typeof localStorage !== 'undefined' },
        { name: 'classList', check: 'classList' in document.createElement('div') }
    ];
    
    const missing = requiredFeatures.filter(f => !f.check).map(f => f.name);
    
    if (missing.length > 0) {
        alert(`Browser tidak didukung. Fitur yang hilang: ${missing.join(', ')}\n\nGunakan browser modern seperti Chrome, Firefox, atau Edge.`);
        return false;
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Player Display Initialized');
    
    // Check browser compatibility first
    if (!checkBrowserCompatibility()) {
        console.error('❌ Browser not compatible');
        return;
    }
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded!');
        showError('Firebase tidak tersedia. Refresh halaman.');
        return;
    }
    
    // Check if roomsRef is available
    if (typeof roomsRef === 'undefined') {
        console.error('❌ Firebase roomsRef not available!');
        showError('Koneksi database gagal. Refresh halaman.');
        return;
    }
    
    console.log('✅ Firebase ready');
    
    initializePlayer();
    setupCodeInputs();
    setupAvatarSelection();
    
    // Setup join button click handler
    const joinBtn = document.getElementById('joinBtn');
    if (joinBtn) {
        joinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔘 Join button clicked!');
            joinRoom();
        });
        
        // Also handle touch for mobile
        joinBtn.addEventListener('touchend', function(e) {
            if (!this.disabled) {
                e.preventDefault();
                console.log('📱 Join button touched!');
                joinRoom();
            }
        });
        
        console.log('✅ Join button handler attached');
    } else {
        console.error('❌ Join button not found!');
    }
});

/**
 * Initialize player display
 */
function initializePlayer() {
    // Check for rejoin first
    checkForRejoin();
    
    // Check URL for room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = urlParams.get('room');
    
    if (roomCodeFromUrl) {
        // Auto-fill room code
        const codeInputs = document.querySelectorAll('.code-input');
        roomCodeFromUrl.split('').forEach((char, index) => {
            if (codeInputs[index]) {
                codeInputs[index].value = char.toUpperCase();
                codeInputs[index].classList.add('filled');
            }
        });
    }
    
    // Load saved player data if exists
    const savedData = localStorage.getItem('pandemic_player');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            document.getElementById('playerName').value = data.name || '';
            
            // Select saved avatar
            if (data.avatar) {
                document.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                    if (opt.dataset.avatar === data.avatar) {
                        opt.classList.add('selected');
                    }
                });
            }
        } catch (e) {
            console.log('No saved player data');
        }
    }
    
    // Setup name input listener for validation
    const playerNameInput = document.getElementById('playerName');
    if (playerNameInput) {
        playerNameInput.addEventListener('input', () => {
            validateJoinForm();
        });
    }
    
    // Initial validation after everything is set up
    setTimeout(() => {
        validateJoinForm();
    }, 100);
}

/**
 * Setup code input behavior
 */
function setupCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-input');
    
    codeInputs.forEach((input, index) => {
        // Auto-focus next input
        input.addEventListener('input', (e) => {
            const value = e.target.value.toUpperCase();
            e.target.value = value;
            
            if (value.length === 1) {
                e.target.classList.add('filled');
                if (index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
            } else {
                e.target.classList.remove('filled');
            }
            
            validateJoinForm();
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                codeInputs[index - 1].focus();
                codeInputs[index - 1].value = '';
                codeInputs[index - 1].classList.remove('filled');
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').toUpperCase().slice(0, 6);
            
            pastedData.split('').forEach((char, i) => {
                if (codeInputs[i]) {
                    codeInputs[i].value = char;
                    codeInputs[i].classList.add('filled');
                }
            });
            
            if (codeInputs[pastedData.length]) {
                codeInputs[pastedData.length].focus();
            } else {
                codeInputs[codeInputs.length - 1].focus();
            }
            
            validateJoinForm();
        });
    });
}

/**
 * Setup avatar selection
 */
function setupAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            validateJoinForm();
        });
    });
}

/**
 * Validate join form
 */
function validateJoinForm() {
    const codeInputs = document.querySelectorAll('.code-input');
    const roomCode = Array.from(codeInputs).map(input => input.value).join('');
    const playerNameEl = document.getElementById('playerName');
    const playerName = playerNameEl ? playerNameEl.value.trim() : '';
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const joinBtn = document.getElementById('joinBtn');
    
    const isValid = roomCode.length === 6 && playerName.length >= 2 && selectedAvatar !== null;
    
    console.log('🔍 Validasi form:', {
        roomCode: roomCode,
        roomCodeLength: roomCode.length,
        playerName: playerName,
        playerNameLength: playerName.length,
        hasAvatar: selectedAvatar !== null,
        isValid: isValid
    });
    
    if (joinBtn) {
        joinBtn.disabled = !isValid;
    }
    
    return isValid;
}

/**
 * Get room code from inputs
 */
function getRoomCode() {
    const codeInputs = document.querySelectorAll('.code-input');
    return Array.from(codeInputs).map(input => input.value.toUpperCase()).join('');
}

// ==================== JOIN ROOM ====================

/**
 * Check for saved room data and attempt rejoin
 */
async function checkForRejoin() {
    const savedRoomCode = localStorage.getItem('pandemic_roomCode');
    const savedPlayerId = localStorage.getItem('pandemic_playerId');
    const savedPlayerName = localStorage.getItem('pandemic_playerName');
    
    if (!savedRoomCode || !savedPlayerId || !savedPlayerName) {
        return; // No saved data
    }
    
    try {
        // Check if room exists
        const roomSnapshot = await roomsRef.child(savedRoomCode).once('value');
        const room = roomSnapshot.val();
        
        if (!room) {
            // Room doesn't exist anymore, clear localStorage
            localStorage.removeItem('pandemic_roomCode');
            localStorage.removeItem('pandemic_playerId');
            localStorage.removeItem('pandemic_playerName');
            return;
        }
        
        // Check if player still exists in room
        const players = room.players || {};
        if (players[savedPlayerId]) {
            // Player exists! Show rejoin prompt
            const shouldRejoin = confirm(`Kamu pernah bergabung dengan room ${savedRoomCode} sebagai ${savedPlayerName}. Ingin bergabung lagi?`);
            
            if (shouldRejoin) {
                // Rejoin the room
                currentRoomCode = savedRoomCode;
                currentPlayerId = savedPlayerId;
                currentPlayerData = players[savedPlayerId];
                
                // Update last seen
                await roomsRef.child(currentRoomCode).child('players').child(currentPlayerId).update({
                    lastSeen: getTimestamp()
                });
                
                // Setup listeners
                listenToRoom(currentRoomCode, handleRoomUpdate);
                listenToPlayers(currentRoomCode, handlePlayersUpdate);
                listenToGameState(currentRoomCode, handleGameStateUpdate);
                
                // Check room status
                if (room.status === 'playing') {
                    // Game already started, go to game screen
                    showGameScreen();
                    showToast(`Berhasil bergabung kembali ke game!`, 'success');
                } else {
                    // Still in lobby
                    showLobbyScreen();
                    showToast(`Berhasil bergabung kembali ke lobby!`, 'success');
                }
                
                console.log('✅ Rejoined room:', savedRoomCode);
            } else {
                // User declined, clear localStorage
                localStorage.removeItem('pandemic_roomCode');
                localStorage.removeItem('pandemic_playerId');
                localStorage.removeItem('pandemic_playerName');
            }
        } else {
            // Player no longer in room, clear localStorage
            localStorage.removeItem('pandemic_roomCode');
            localStorage.removeItem('pandemic_playerId');
            localStorage.removeItem('pandemic_playerName');
        }
    } catch (error) {
        console.error('❌ Error checking rejoin:', error);
        // Clear localStorage on error
        localStorage.removeItem('pandemic_roomCode');
        localStorage.removeItem('pandemic_playerId');
        localStorage.removeItem('pandemic_playerName');
    }
}

/**
 * Join room
 */
async function joinRoom() {
    const roomCode = getRoomCode();
    const playerName = document.getElementById('playerName').value.trim();
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '🧑‍🔬';
    
    console.log('🎮 Join room attempt:', { roomCode, playerName });
    
    // Validate inputs
    if (!roomCode || roomCode.length !== 6) {
        showError('Masukkan kode room 6 karakter');
        return;
    }
    
    if (!playerName) {
        showError('Masukkan nama pemain');
        return;
    }
    
    // Hide error message
    hideError();
    
    try {
        // Check Firebase connection
        if (typeof roomsRef === 'undefined') {
            throw new Error('Koneksi database tidak tersedia. Refresh halaman.');
        }
        
        // Show loading state
        const joinBtn = document.getElementById('joinBtn');
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan...';
        
        console.log('🔍 Checking if room exists...');
        
        // Check if room exists
        const exists = await checkRoomExists(roomCode);
        console.log('Room exists:', exists);
        
        if (!exists) {
            throw new Error('Room tidak ditemukan. Periksa kode room.');
        }
        
        // Join the room
        const result = await joinRoomFirebase(roomCode, {
            name: playerName,
            avatar: avatar
        });
        
        // IMPORTANT: Set these BEFORE setting up listeners
        currentRoomCode = result.roomCode;
        currentPlayerId = result.playerId;
        
        console.log('✅ Player ID set:', currentPlayerId);
        console.log('✅ Room code set:', currentRoomCode);
        
        // Save player data locally
        localStorage.setItem('pandemic_player', JSON.stringify({
            name: playerName,
            avatar: avatar,
            playerId: currentPlayerId,
            roomCode: currentRoomCode
        }));
        
        // Wait a bit to ensure Firebase has propagated the player data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify player exists in Firebase before proceeding
        console.log('🔍 Verifying player exists in Firebase...');
        const playerCheck = await roomsRef.child(currentRoomCode).child('players').child(currentPlayerId).once('value');
        if (!playerCheck.exists()) {
            throw new Error('Player gagal ditambahkan ke room. Coba lagi.');
        }
        console.log('✅ Player verified in Firebase');
        
        // Show lobby screen
        showLobbyScreen();
        
        // Start listening to room updates (AFTER currentPlayerId is set and verified)
        console.log('📡 Setting up listeners...');
        try {
            listenToRoom(currentRoomCode, handleRoomUpdate);
            listenToPlayers(currentRoomCode, handlePlayersUpdate);
            listenToGameState(currentRoomCode, handleGameStateUpdate);
            console.log('✅ Listeners set up successfully');
        } catch (listenerError) {
            console.error('❌ Error setting up listeners:', listenerError);
            throw listenerError;
        }
        
        // Save to localStorage for rejoin capability
        localStorage.setItem('pandemic_roomCode', currentRoomCode);
        localStorage.setItem('pandemic_playerId', currentPlayerId);
        localStorage.setItem('pandemic_playerName', playerName);
        
        console.log('✅ Joined room:', currentRoomCode);
        
    } catch (error) {
        console.error('❌ Error joining room:', error);
        
        // More detailed error message
        let errorMsg = error.message || 'Gagal bergabung ke room';
        if (error.code === 'PERMISSION_DENIED') {
            errorMsg = 'Akses ditolak. Periksa koneksi internet.';
        } else if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
            errorMsg = 'Koneksi jaringan bermasalah. Periksa internet Anda.';
        }
        
        showError(errorMsg);
        
        // Reset button
        const joinBtn = document.getElementById('joinBtn');
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> GABUNG';
        }
    }
}

/**
 * Join room via Firebase
 */
async function joinRoomFirebase(roomCode, playerData) {
    console.log('🔄 Attempting to join room:', roomCode);
    
    const playerId = generatePlayerId();
    
    // Check room status
    console.log('📡 Checking room existence...');
    const roomSnapshot = await roomsRef.child(roomCode).once('value');
    
    if (!roomSnapshot.exists()) {
        console.error('❌ Room not found:', roomCode);
        throw new Error('Room tidak ditemukan');
    }
    
    const room = roomSnapshot.val();
    console.log('✅ Room found:', room.status);
    
    if (room.status !== 'lobby') {
        console.error('❌ Game already started');
        throw new Error('Game sudah dimulai');
    }
    
    const playerCount = room.players ? Object.keys(room.players).length : 0;
    console.log('👥 Current players:', playerCount);
    
    if (playerCount >= 10) {
        throw new Error('Room sudah penuh (max 10 pemain)');
    }
    
    // Add player to room
    const player = {
        id: playerId,
        name: playerData.name,
        avatar: playerData.avatar,
        ready: false,
        role: null,
        joinedAt: getTimestamp()
    };
    
    console.log('📝 Adding player to room...');
    await roomsRef.child(roomCode).child('players').child(playerId).set(player);
    console.log('✅ Player added successfully:', playerId);
    
    return { playerId, roomCode };
}

/**
 * Leave room
 */
async function leaveRoom() {
    if (!confirm('Yakin ingin keluar dari room?')) return;
    
    try {
        if (currentRoomCode && currentPlayerId) {
            await roomsRef.child(currentRoomCode).child('players').child(currentPlayerId).remove();
        }
        
        // Clear local storage (both old and new keys)
        localStorage.removeItem('pandemic_player');
        localStorage.removeItem('pandemic_roomCode');
        localStorage.removeItem('pandemic_playerId');
        localStorage.removeItem('pandemic_playerName');
        
        // Stop listening
        if (currentRoomCode) {
            stopListeningToRoom(currentRoomCode);
        }
        
        // Reset state
        currentRoomCode = null;
        currentPlayerId = null;
        currentPlayerData = null;
        
        // Show join screen
        showJoinScreen();
        
    } catch (error) {
        console.error('Error leaving room:', error);
    }
}

// ==================== SCREEN NAVIGATION ====================

/**
 * Show join screen
 */
function showJoinScreen() {
    document.getElementById('joinScreen').classList.remove('hidden');
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
}

/**
 * Show lobby screen
 */
function showLobbyScreen() {
    document.getElementById('joinScreen').classList.add('hidden');
    document.getElementById('lobbyScreen').classList.add('active');
    document.getElementById('gameScreen').classList.remove('active');
    
    // Update display
    document.getElementById('displayRoomCode').textContent = currentRoomCode;
}

/**
 * Show game screen
 */
function showGameScreen() {
    document.getElementById('joinScreen').classList.add('hidden');
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
}

// ==================== ROOM HANDLERS ====================

/**
 * Handle room update
 */
function handleRoomUpdate(room) {
    if (!room) {
        showToast('Room telah dihapus', 'error');
        showJoinScreen();
        return;
    }
    
    roomData = room;
    
    // Check if game started
    if (room.status === 'playing') {
        showGameScreen();
        // Game state will be updated by gameState listener
    }
    
    // Check game over
    if (currentGameState && currentGameState.gameOver) {
        showGameOverModal(currentGameState.gameResult);
    }
}

/**
 * Handle game state update
 */
function handleGameStateUpdate(gameState) {
    if (!gameState) return;
    
    // ✅ FIX: Ensure all arrays exist (Firebase removes empty arrays)
    if (!gameState.playerDiscard) gameState.playerDiscard = [];
    if (!gameState.infectionDiscard) gameState.infectionDiscard = [];
    if (!gameState.playerDeck) gameState.playerDeck = [];
    if (!gameState.infectionDeck) gameState.infectionDeck = [];
    if (!gameState.log) gameState.log = [];
    
    // ✅ FIX: Ensure player cards arrays exist
    if (gameState.players) {
        Object.keys(gameState.players).forEach(pid => {
            if (!gameState.players[pid].cards) {
                gameState.players[pid].cards = [];
            }
        });
    }
    
    currentGameState = gameState;
    
    // Get current player data from game state
    if (gameState.players && currentPlayerId) {
        currentPlayerData = gameState.players[currentPlayerId];
    }
    
    // Update display
    updateGameDisplay();
    
    // Check game over
    if (gameState.gameOver) {
        showGameOverModal(gameState.gameResult);
    }
}

/**
 * Handle players update
 */
function handlePlayersUpdate(players) {
    console.log('👥 Players update received:', players ? Object.keys(players).length : 0, 'players');
    
    if (!players) {
        console.log('⚠️ No players data');
        return;
    }
    
    // Make sure currentPlayerId is set
    if (!currentPlayerId) {
        console.log('⚠️ currentPlayerId not set yet, skipping update');
        return;
    }
    
    // Find current player
    currentPlayerData = players[currentPlayerId];
    
    if (!currentPlayerData) {
        // Player was removed or not found yet
        console.log('⚠️ Current player not found in players list');
        // Only show error if we're in lobby, not during initial join
        if (document.getElementById('lobbyScreen').classList.contains('active')) {
            showToast('Kamu dikeluarkan dari room', 'error');
            showJoinScreen();
        }
        return;
    }
    
    console.log('✅ Current player found:', currentPlayerData.name);
    
    // Update lobby display
    try {
        updateLobbyDisplay(players);
    } catch (error) {
        console.error('❌ Error updating lobby display:', error);
    }
}

/**
 * Update lobby display
 */
function updateLobbyDisplay(players) {
    if (!currentPlayerData) {
        console.log('⚠️ updateLobbyDisplay: No currentPlayerData');
        return;
    }
    
    // Safely update my player card with null checks
    const myAvatarEl = document.getElementById('myAvatar');
    const myNameEl = document.getElementById('myName');
    const myRoleEl = document.getElementById('myRole');
    
    if (myAvatarEl) myAvatarEl.textContent = currentPlayerData.avatar || '🧑‍🔬';
    if (myNameEl) myNameEl.textContent = currentPlayerData.name || 'Player';
    if (myRoleEl) myRoleEl.textContent = currentPlayerData.role ? currentPlayerData.role.name : 'Menunggu...';
    
    // Update ready switch
    const readySwitch = document.getElementById('readySwitch');
    const readyStatus = document.getElementById('readyStatus');
    
    if (currentPlayerData.ready) {
        readySwitch.classList.add('active');
        readyStatus.textContent = 'Siap!';
        readyStatus.classList.add('active');
    } else {
        readySwitch.classList.remove('active');
        readyStatus.textContent = 'Belum Siap';
        readyStatus.classList.remove('active');
    }
    
    // Update other players list
    const otherPlayersList = document.getElementById('otherPlayersList');
    const otherPlayers = Object.entries(players).filter(([id]) => id !== currentPlayerId);
    
    if (otherPlayers.length === 0) {
        otherPlayersList.innerHTML = `
            <div class="other-player">
                <span class="other-player-avatar">⏳</span>
                <span class="other-player-name">Menunggu pemain lain...</span>
            </div>
        `;
    } else {
        otherPlayersList.innerHTML = otherPlayers.map(([id, player]) => `
            <div class="other-player ${player.ready ? 'ready' : ''}">
                <span class="other-player-avatar">${player.avatar}</span>
                <span class="other-player-name">${escapeHtml(player.name)}</span>
                <span class="other-player-status">${player.ready ? '✅' : '⏳'}</span>
            </div>
        `).join('');
    }
}

/**
 * Toggle ready status
 */
async function toggleReady() {
    if (!currentRoomCode || !currentPlayerId) return;
    
    try {
        const newStatus = !currentPlayerData.ready;
        await roomsRef.child(currentRoomCode).child('players').child(currentPlayerId).child('ready').set(newStatus);
        
        if (newStatus) {
            showToast('Kamu sudah siap!', 'success');
        }
    } catch (error) {
        console.error('Error toggling ready:', error);
        showToast('Gagal mengubah status', 'error');
    }
}

// ==================== GAME DISPLAY ====================

/**
 * Update game display
 */
function updateGameDisplay() {
    if (!currentGameState || !currentPlayerId) return;
    
    // ✅ FIX: Initialize arrays if they don't exist
    if (!currentGameState.playerDiscard) currentGameState.playerDiscard = [];
    if (!currentGameState.infectionDiscard) currentGameState.infectionDiscard = [];
    if (!currentGameState.playerDeck) currentGameState.playerDeck = [];
    if (!currentGameState.infectionDeck) currentGameState.infectionDeck = [];
    if (!currentGameState.log) currentGameState.log = [];
    
    const myPlayer = currentGameState.players[currentPlayerId];
    if (!myPlayer) return;
    
    currentPlayerData = myPlayer;
    
    // Update turn indicator
    updateTurnIndicator();
    
    // Update status bar
    updateStatusBar();
    
    // Update current location
    updateCurrentLocation();
    
    // Update cards hand
    updateCardsHand();
    
    // Update action buttons
    updateActionButtons();
    
    // Update timer
    updateTimer();
}

/**
 * Update turn indicator
 */
function updateTurnIndicator() {
    const currentTurnPlayerId = currentGameState.turnOrder[currentGameState.currentPlayerIndex];
    const isMyTurn = currentTurnPlayerId === currentPlayerId;
    
    const turnIndicator = document.getElementById('turnIndicator');
    const actionsDisplay = document.getElementById('actionsDisplay');
    const endTurnBtn = document.getElementById('endTurnBtn');
    
    if (isMyTurn) {
        turnIndicator.className = 'turn-indicator my-turn';
        turnIndicator.innerHTML = '<i class="fas fa-play"></i> GILIRAN KAMU';
        actionsDisplay.style.display = 'flex';
        document.getElementById('actionsCount').textContent = currentPlayerData.actionsLeft;
        endTurnBtn.disabled = false;
    } else {
        const currentPlayer = currentGameState.players[currentTurnPlayerId];
        turnIndicator.className = 'turn-indicator waiting';
        turnIndicator.innerHTML = `<i class="fas fa-hourglass-half"></i> Giliran ${currentPlayer ? currentPlayer.name : '...'}`;
        actionsDisplay.style.display = 'none';
        endTurnBtn.disabled = true;
    }
    
    // Disable/enable action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = !isMyTurn || currentPlayerData.actionsLeft <= 0;
    });
}

/**
 * Update status bar
 */
function updateStatusBar() {
    // Outbreak
    const outbreakStatus = document.getElementById('outbreakStatus');
    outbreakStatus.textContent = `${currentGameState.outbreakCount}/8`;
    outbreakStatus.className = 'status-value';
    if (currentGameState.outbreakCount >= 6) {
        outbreakStatus.classList.add('danger');
    } else if (currentGameState.outbreakCount >= 4) {
        outbreakStatus.classList.add('warning');
    }
    
    // Infection rate
    document.getElementById('infectionStatus').textContent = INFECTION_RATE_TRACK[currentGameState.infectionRateIndex];
    
    // Cures
    const curesFound = Object.values(currentGameState.cures).filter(c => c).length;
    const curesStatus = document.getElementById('curesStatus');
    curesStatus.textContent = `${curesFound}/4`;
    curesStatus.className = 'status-value';
    if (curesFound === 4) {
        curesStatus.classList.add('safe');
    } else if (curesFound >= 2) {
        curesStatus.classList.add('warning');
    }
    
    // Deck
    const deckCount = currentGameState.playerDeck ? currentGameState.playerDeck.length : 0;
    document.getElementById('deckStatus').textContent = deckCount;
}

/**
 * Update current location display
 */
function updateCurrentLocation() {
    const cityId = currentPlayerData.location;
    const city = CITIES[cityId];
    const cityState = currentGameState.cities[cityId];
    
    if (!city || !cityState) return;
    
    // Update city name and color
    document.getElementById('currentCity').textContent = city.name;
    document.querySelector('.location-color').className = `location-color ${city.color}`;
    
    // Update research station indicator
    const stationIcon = cityState.hasResearchStation ? '🏥' : '';
    const locationName = document.querySelector('.location-name');
    const existingStation = locationName.querySelector('.station-icon');
    if (existingStation) existingStation.remove();
    if (stationIcon) {
        const span = document.createElement('span');
        span.className = 'station-icon';
        span.textContent = stationIcon;
        locationName.appendChild(span);
    }
    
    // Update disease cubes
    const diseaseContainer = document.getElementById('locationDisease');
    let cubesHtml = '';
    
    ['blue', 'yellow', 'black', 'red'].forEach(color => {
        for (let i = 0; i < cityState.disease[color]; i++) {
            cubesHtml += `<div class="disease-cube-small ${color}"></div>`;
        }
    });
    
    diseaseContainer.innerHTML = cubesHtml || '<span style="color: #666; font-size: 0.85rem;">Tidak ada penyakit</span>';
}

/**
 * Update cards hand
 */
function updateCardsHand() {
    const container = document.getElementById('cardsHand');
    const cards = currentPlayerData.cards || [];
    
    // ✅ FILTER: Remove any infection cards that shouldn't be here
    const validCards = cards.filter(card => {
        if (!card || !card.type) {
            console.error('Invalid card in hand:', card);
            return false;
        }
        if (card.type === 'infection') {
            console.error('❌ INFECTION CARD IN PLAYER HAND! Removing:', card);
            return false;
        }
        return true;
    });
    
    // If we filtered out invalid cards, update Firebase
    if (validCards.length !== cards.length) {
        console.warn(`Removed ${cards.length - validCards.length} invalid cards from hand`);
        roomsRef.child(currentRoomCode).child('gameState').child('players').child(currentPlayerId).child('cards').set(validCards);
        return; // Will re-render when Firebase updates
    }
    
    document.getElementById('handCount').textContent = validCards.length;
    
    if (validCards.length === 0) {
        container.innerHTML = '<div style="color: #666; padding: 20px;">Tidak ada kartu</div>';
        return;
    }
    
    container.innerHTML = validCards.map((card, index) => {
        const isSelected = selectedCards.includes(index);
        
        if (card.type === 'city') {
            return `
                <div class="card ${card.color} ${isSelected ? 'selected' : ''}" 
                     onclick="selectCard(${index})" data-index="${index}">
                    <div class="card-city">${card.name}</div>
                    <div class="card-icon">🏙️</div>
                    <div class="card-type">City</div>
                </div>
            `;
        } else if (card.type === 'event') {
            return `
                <div class="card event ${isSelected ? 'selected' : ''}" 
                     onclick="selectCard(${index})" data-index="${index}">
                    <div class="card-city">${card.name}</div>
                    <div class="card-icon">${card.icon || '⚡'}</div>
                    <div class="card-type">Event</div>
                </div>
            `;
        }
        return '';
    }).join('');
}

/**
 * Select/deselect card
 */
function selectCard(index) {
    const cardIndex = selectedCards.indexOf(index);
    
    if (cardIndex > -1) {
        selectedCards.splice(cardIndex, 1);
    } else {
        selectedCards.push(index);
    }
    
    // Update visual
    document.querySelectorAll('.card').forEach((card, i) => {
        card.classList.toggle('selected', selectedCards.includes(i));
    });
}

/**
 * Update action buttons state
 */
function updateActionButtons() {
    // Validate all required data
    if (!currentPlayerData || !currentGameState || !currentGameState.cities || !currentGameState.turnOrder) {
        console.warn('updateActionButtons: Missing required data');
        document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
        return;
    }
    
    const cityId = currentPlayerData.location;
    const city = CITIES[cityId];
    const cityState = currentGameState.cities[cityId];
    
    if (!city || !cityState) {
        console.warn('updateActionButtons: Invalid city or city state');
        document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
        return;
    }
    
    const isMyTurn = currentGameState.turnOrder[currentGameState.currentPlayerIndex] === currentPlayerId;
    
    if (!isMyTurn) {
        document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
        return;
    }
    
    const hasActions = currentPlayerData.actionsLeft > 0;
    const hasCards = currentPlayerData.cards && Array.isArray(currentPlayerData.cards) && currentPlayerData.cards.length > 0;
    
    // Move - always available if has actions
    const moveBtn = document.querySelector('.action-btn.move');
    if (moveBtn) moveBtn.disabled = !hasActions;
    
    // Fly - needs city cards
    const hasCityCards = hasCards && currentPlayerData.cards.some(c => c && c.type === 'city');
    const flyBtn = document.querySelector('.action-btn.fly');
    if (flyBtn) flyBtn.disabled = !hasActions || !hasCityCards;
    
    // Treat - needs disease cubes at location
    const hasDisease = Object.values(cityState.disease || {}).some(count => count > 0);
    const treatBtn = document.querySelector('.action-btn.treat');
    if (treatBtn) treatBtn.disabled = !hasActions || !hasDisease;
    
    // Build - needs current city card and no station
    const hasCurrentCityCard = hasCards && currentPlayerData.cards.some(c => c && c.type === 'city' && c.id === cityId);
    const canBuildFree = currentPlayerData.role && currentPlayerData.role.id === 'operations_expert';
    const buildBtn = document.querySelector('.action-btn.build');
    if (buildBtn) buildBtn.disabled = !hasActions || cityState.hasResearchStation || (!hasCurrentCityCard && !canBuildFree);
    
    // Share - needs other player at same location
    const playersHere = Object.entries(currentGameState.players || {}).filter(([id, p]) => p && p.location === cityId && id !== currentPlayerId);
    const shareBtn = document.querySelector('.action-btn.share');
    if (shareBtn) shareBtn.disabled = !hasActions || playersHere.length === 0;
    
    // Cure - needs 5 cards of same color at research station
    const canCure = checkCanDiscoverCure();
    const cureBtn = document.querySelector('.action-btn.cure');
    if (cureBtn) cureBtn.disabled = !hasActions || !canCure;
    
    // Charter - needs current city card
    const charterBtn = document.querySelector('.action-btn.charter');
    if (charterBtn) charterBtn.disabled = !hasActions || !hasCurrentCityCard;
    
    // Shuttle - needs research stations
    const stations = Object.entries(currentGameState.cities || {}).filter(([id, c]) => c && c.hasResearchStation && id !== cityId);
    const shuttleBtn = document.querySelector('.action-btn.shuttle');
    if (shuttleBtn) shuttleBtn.disabled = !hasActions || !cityState.hasResearchStation || stations.length === 0;
    
    // Event - needs event card (can be used anytime, doesn't need actions)
    const hasEventCard = hasCards && currentPlayerData.cards.some(c => c && c.type === 'event');
    const eventBtn = document.querySelector('.action-btn.event');
    if (eventBtn) eventBtn.disabled = !hasEventCard;
}

/**
 * Check if player can discover cure
 */
function checkCanDiscoverCure() {
    if (!currentPlayerData || !currentGameState || !currentGameState.cities) {
        return false;
    }
    
    const cityId = currentPlayerData.location;
    const cityState = currentGameState.cities[cityId];
    
    // Must be at research station
    if (!cityState || !cityState.hasResearchStation) return false;
    
    // Must have cards
    if (!currentPlayerData.cards || currentPlayerData.cards.length === 0) return false;
    
    // Count cards by color
    const colorCounts = { blue: 0, yellow: 0, black: 0, red: 0 };
    currentPlayerData.cards.forEach(card => {
        if (card && card.type === 'city' && card.color) {
            colorCounts[card.color]++;
        }
    });
    
    // Scientist needs 4, others need 5
    const required = currentPlayerData.role && currentPlayerData.role.id === 'scientist' ? 4 : 5;
    
    return Object.entries(colorCounts).some(([color, count]) => {
        return count >= required && !currentGameState.cures[color];
    });
}

/**
 * Update timer display
 */
function updateTimer() {
    const timerDisplay = document.getElementById('turnTimer');
    const turnTimer = currentGameState.settings?.turnTimer || 60;
    
    if (turnTimer === 0) {
        timerDisplay.textContent = '∞';
        timerDisplay.className = 'turn-timer';
        return;
    }
    
    // For now, just show the max time
    // In real implementation, this would sync with server time
    const minutes = Math.floor(turnTimer / 60);
    const seconds = turnTimer % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ==================== GAME ACTIONS ====================

/**
 * Open move modal (walk to connected city)
 */
function openMoveModal() {
    if (!checkCanAct()) return;
    
    const cityId = currentPlayerData.location;
    const city = CITIES[cityId];
    
    const modal = document.getElementById('moveModal');
    const list = document.getElementById('moveCitiesList');
    
    list.innerHTML = city.connections.map(connectedId => {
        const connectedCity = CITIES[connectedId];
        return `
            <div class="city-option" onclick="moveTo('${connectedId}')">
                <span class="city-option-color" style="background: ${getColorHex(connectedCity.color)};"></span>
                <span class="city-option-name">${connectedCity.name}</span>
                <span class="city-option-distance">Terhubung</span>
            </div>
        `;
    }).join('');
    
    modal.classList.add('active');
}

/**
 * Move to city
 */
async function moveTo(cityId) {
    closeModal('moveModal');
    await performAction('move', { destination: cityId });
}

/**
 * Open fly modal (direct flight)
 */
function openFlyModal() {
    if (!checkCanAct()) return;
    
    if (!currentPlayerData || !currentPlayerData.cards) {
        showToast('Data pemain tidak tersedia', 'error');
        return;
    }
    
    const modal = document.getElementById('flyModal');
    const list = document.getElementById('flyCitiesList');
    
    const cityCards = currentPlayerData.cards.filter(c => c && c.type === 'city');
    
    if (cityCards.length === 0) {
        list.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">Tidak ada kartu kota</div>';
    } else {
        list.innerHTML = cityCards.map((card, index) => {
            const cardIndex = currentPlayerData.cards.indexOf(card);
            return `
                <div class="city-option" onclick="flyTo('${card.id}', ${cardIndex})">
                    <span class="city-option-color" style="background: ${getColorHex(card.color)};"></span>
                    <span class="city-option-name">${card.name}</span>
                    <span class="city-option-distance">Buang kartu</span>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
}

/**
 * Fly to city (direct flight)
 */
async function flyTo(cityId, cardIndex) {
    console.log('🛫 Attempting direct flight:', { cityId, cardIndex });
    console.log('📋 Current player cards:', currentPlayerData.cards);
    console.log('🎯 Card to use:', currentPlayerData.cards[cardIndex]);
    
    closeModal('flyModal');
    await performAction('direct_flight', { destination: cityId, cardIndex: cardIndex });
}

/**
 * Charter flight (fly anywhere by discarding current city card)
 */
async function charterFlight() {
    if (!checkCanAct()) return;
    
    if (!currentPlayerData || !currentPlayerData.cards) {
        showToast('Data pemain tidak tersedia', 'error');
        return;
    }
    
    const cityId = currentPlayerData.location;
    const cardIndex = currentPlayerData.cards.findIndex(c => c && c.type === 'city' && c.id === cityId);
    
    if (cardIndex === -1) {
        showToast('Kamu tidak punya kartu kota saat ini', 'error');
        return;
    }
    
    // For simplicity, ask for destination
    const destination = prompt('Masukkan nama kota tujuan:');
    if (!destination) return;
    
    // Find matching city
    const destCity = Object.entries(CITIES).find(([id, city]) => 
        city && city.name && city.name.toLowerCase() === destination.toLowerCase()
    );
    
    if (!destCity) {
        showToast('Kota "' + destination + '" tidak ditemukan', 'error');
        return;
    }
    
    console.log('Charter flight to:', destCity[0]);
    await performAction('charter_flight', { destination: destCity[0], cardIndex: cardIndex });
}

/**
 * Shuttle flight (between research stations)
 */
async function shuttleFlight() {
    if (!checkCanAct()) return;
    
    const cityId = currentPlayerData.location;
    const cityState = currentGameState.cities[cityId];
    
    if (!cityState.hasResearchStation) {
        showToast('Harus berada di Research Station', 'error');
        return;
    }
    
    // Find other stations
    const stations = Object.entries(currentGameState.cities)
        .filter(([id, c]) => c.hasResearchStation && id !== cityId)
        .map(([id]) => id);
    
    if (stations.length === 0) {
        showToast('Tidak ada Research Station lain', 'error');
        return;
    }
    
    // Show selection (simple implementation)
    const stationNames = stations.map(id => CITIES[id].name).join(', ');
    const destination = prompt(`Pilih tujuan (${stationNames}):`);
    if (!destination) return;
    
    const destId = stations.find(id => CITIES[id].name.toLowerCase() === destination.toLowerCase());
    if (!destId) {
        showToast('Kota tidak valid', 'error');
        return;
    }
    
    await performAction('shuttle_flight', { destination: destId });
}

/**
 * Treat disease
 */
async function treatDisease() {
    if (!checkCanAct()) return;
    
    const cityId = currentPlayerData.location;
    const cityState = currentGameState.cities[cityId];
    
    // Find which diseases are present
    const diseases = Object.entries(cityState.disease).filter(([color, count]) => count > 0);
    
    if (diseases.length === 0) {
        showToast('Tidak ada penyakit di kota ini', 'error');
        return;
    }
    
    let colorToTreat;
    if (diseases.length === 1) {
        colorToTreat = diseases[0][0];
    } else {
        // Multiple diseases - ask which one
        const colors = diseases.map(([c]) => c).join(', ');
        colorToTreat = prompt(`Pilih penyakit (${colors}):`);
        if (!colorToTreat || !diseases.find(([c]) => c === colorToTreat.toLowerCase())) {
            showToast('Warna tidak valid', 'error');
            return;
        }
        colorToTreat = colorToTreat.toLowerCase();
    }
    
    await performAction('treat', { color: colorToTreat });
}

/**
 * Build research station
 */
async function buildStation() {
    if (!checkCanAct()) return;
    
    const cityId = currentPlayerData.location;
    const cityState = currentGameState.cities[cityId];
    
    if (cityState.hasResearchStation) {
        showToast('Sudah ada Research Station di sini', 'error');
        return;
    }
    
    const isOpsExpert = currentPlayerData.role.id === 'operations_expert';
    const cardIndex = currentPlayerData.cards.findIndex(c => c.type === 'city' && c.id === cityId);
    
    if (!isOpsExpert && cardIndex === -1) {
        showToast('Kamu butuh kartu kota ini', 'error');
        return;
    }
    
    await performAction('build', { cardIndex: isOpsExpert ? -1 : cardIndex });
}

/**
 * Open share modal
 */
function openShareModal() {
    if (!checkCanAct()) return;
    
    const cityId = currentPlayerData.location;
    const playersHere = Object.entries(currentGameState.players)
        .filter(([id, p]) => p.location === cityId && id !== currentPlayerId);
    
    const modal = document.getElementById('shareModal');
    const list = document.getElementById('sharePlayersList');
    
    if (playersHere.length === 0) {
        list.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">Tidak ada pemain lain di sini</div>';
    } else {
        list.innerHTML = playersHere.map(([id, player]) => `
            <div class="share-player-option" onclick="shareWith('${id}')">
                <span class="share-player-avatar">${player.avatar}</span>
                <div class="share-player-info">
                    <div class="share-player-name">${escapeHtml(player.name)}</div>
                    <div class="share-player-role">${player.role.name}</div>
                </div>
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
}

/**
 * Share card with player
 */
async function shareWith(targetPlayerId) {
    closeModal('shareModal');
    
    const cityId = currentPlayerData.location;
    const cardIndex = currentPlayerData.cards.findIndex(c => c.type === 'city' && c.id === cityId);
    
    if (cardIndex === -1) {
        showToast('Kamu tidak punya kartu kota ini', 'error');
        return;
    }
    
    await performAction('share', { targetPlayerId: targetPlayerId, cardIndex: cardIndex });
}

/**
 * Use event card
 */
async function useEventCard() {
    if (!currentPlayerData || !currentPlayerData.cards) {
        showToast('Data pemain tidak tersedia', 'error');
        return;
    }
    
    // Get all event cards
    const eventCards = currentPlayerData.cards
        .map((card, index) => ({ card, index }))
        .filter(item => item.card && item.card.type === 'event');
    
    if (eventCards.length === 0) {
        showToast('Tidak ada kartu event', 'error');
        return;
    }
    
    // Show event selection modal
    const modal = document.getElementById('eventModal');
    const list = document.getElementById('eventCardsList');
    
    list.innerHTML = eventCards.map(({ card, index }) => `
        <div class="event-card-option" onclick="selectEventCard('${card.id}', ${index})">
            <div class="event-icon">${card.icon || '⚡'}</div>
            <div class="event-info">
                <div class="event-name">${card.name}</div>
                <div class="event-desc">${card.description || ''}</div>
            </div>
        </div>
    `).join('');
    
    modal.classList.add('active');
}

/**
 * Select and use event card
 */
async function selectEventCard(eventId, cardIndex) {
    closeModal('eventModal');
    
    console.log('🎴 Using event card:', eventId, 'at index:', cardIndex);
    
    // Different actions for different event types
    switch(eventId) {
        case 'airlift':
            // Show modal to select player and destination
            await useAirlift(cardIndex);
            break;
            
        case 'government_grant':
            // Show modal to select city for research station
            await useGovernmentGrant(cardIndex);
            break;
            
        case 'one_quiet_night':
            // Direct action - skip next infection phase
            await performAction('event', { eventId, cardIndex });
            showToast('One Quiet Night digunakan! Fase infeksi berikutnya dilewati.', 'success');
            break;
            
        case 'forecast':
            // Show top 6 infection cards to reorder
            await useForecast(cardIndex);
            break;
            
        case 'resilient_population':
            // Show infection discard pile to remove one
            await useResilientPopulation(cardIndex);
            break;
            
        default:
            showToast('Event tidak dikenali', 'error');
    }
}

/**
 * Use Airlift event
 */
async function useAirlift(cardIndex) {
    // For simplicity, airlift current player to any city
    const modal = document.getElementById('flyModal');
    const list = document.getElementById('flyCitiesList');
    
    list.innerHTML = Object.values(CITIES).map(city => `
        <div class="city-option" onclick="performAirlift('${city.id}', ${cardIndex})">
            <span class="city-option-color" style="background: ${getColorHex(city.color)};"></span>
            <span class="city-option-name">${city.name}</span>
            <span class="city-option-distance">Event: Airlift</span>
        </div>
    `).join('');
    
    modal.classList.add('active');
}

/**
 * Perform airlift to city
 */
async function performAirlift(cityId, cardIndex) {
    closeModal('flyModal');
    await performAction('event', { 
        eventId: 'airlift', 
        cardIndex, 
        targetPlayerId: currentPlayerId,
        destination: cityId 
    });
}

/**
 * Use Government Grant event
 */
async function useGovernmentGrant(cardIndex) {
    const modal = document.getElementById('flyModal');
    const list = document.getElementById('flyCitiesList');
    
    // Show cities without research stations
    const citiesWithoutStations = Object.entries(CITIES).filter(([id, city]) => {
        const cityState = currentGameState.cities[id];
        return !cityState.hasResearchStation;
    });
    
    list.innerHTML = citiesWithoutStations.map(([id, city]) => `
        <div class="city-option" onclick="performGovernmentGrant('${id}', ${cardIndex})">
            <span class="city-option-color" style="background: ${getColorHex(city.color)};"></span>
            <span class="city-option-name">${city.name}</span>
            <span class="city-option-distance">Event: Build Station</span>
        </div>
    `).join('');
    
    modal.classList.add('active');
}

/**
 * Perform government grant
 */
async function performGovernmentGrant(cityId, cardIndex) {
    closeModal('flyModal');
    await performAction('event', { 
        eventId: 'government_grant', 
        cardIndex, 
        cityId 
    });
}

/**
 * Use Forecast event - reorder top 6 infection cards
 */
async function useForecast(cardIndex) {
    if (!currentGameState || !currentGameState.infectionDeck) {
        showToast('Deck infeksi tidak tersedia', 'error');
        return;
    }
    
    const top6 = currentGameState.infectionDeck.slice(0, 6);
    
    if (top6.length === 0) {
        showToast('Deck infeksi kosong', 'error');
        return;
    }
    
    // Store for confirmation
    window.forecastCardIndex = cardIndex;
    window.forecastCards = [...top6];
    
    // Show modal
    const modal = document.getElementById('forecastModal');
    const list = document.getElementById('forecastCardsList');
    
    list.innerHTML = top6.map((card, index) => {
        // Infection deck cards are just cityId strings
        const city = CITIES[card];
        return `
            <div class="forecast-card-item" draggable="true" data-index="${index}">
                <div class="forecast-card-number">${index + 1}</div>
                <div class="forecast-card-info">
                    <div class="forecast-card-city">${city.name}</div>
                    <div class="forecast-card-color" style="color: ${getColorHex(city.color)};">${city.color}</div>
                </div>
                <div class="forecast-drag-handle">⋮</div>
            </div>
        `;
    }).join('');
    
    // Setup drag and drop
    setupForecastDragDrop();
    
    modal.classList.add('active');
}

/**
 * Setup drag and drop for forecast cards
 */
function setupForecastDragDrop() {
    const cards = document.querySelectorAll('.forecast-card-item');
    let draggedElement = null;
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedElement = card;
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(card.parentElement, e.clientY);
            if (afterElement == null) {
                card.parentElement.appendChild(draggedElement);
            } else {
                card.parentElement.insertBefore(draggedElement, afterElement);
            }
        });
    });
}

/**
 * Get element after dragged position
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.forecast-card-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Confirm forecast reordering
 */
async function confirmForecast() {
    const cards = document.querySelectorAll('.forecast-card-item');
    const newOrder = Array.from(cards).map(card => {
        const index = parseInt(card.dataset.index);
        return window.forecastCards[index];
    });
    
    closeModal('forecastModal');
    
    // Use the event card and update infection deck
    await performAction('event', { 
        eventId: 'forecast', 
        cardIndex: window.forecastCardIndex,
        newInfectionOrder: newOrder
    });
    
    showToast('Forecast digunakan! Urutan kartu infeksi diatur ulang.', 'success');
}

/**
 * Use Resilient Population - remove infection card from discard
 */
async function useResilientPopulation(cardIndex) {
    if (!currentGameState || !currentGameState.infectionDiscard || currentGameState.infectionDiscard.length === 0) {
        showToast('Tidak ada kartu di infection discard pile', 'error');
        return;
    }
    
    // Store for later use
    window.resilientCardIndex = cardIndex;
    
    // Show modal
    const modal = document.getElementById('resilientModal');
    const list = document.getElementById('resilientCardsList');
    
    list.innerHTML = currentGameState.infectionDiscard.map((cityId, index) => {
        // Infection discard cards are just cityId strings
        const city = CITIES[cityId];
        return `
            <div class="resilient-card-item" onclick="removeInfectionCard(${index})">
                <div class="city-icon" style="color: ${getColorHex(city.color)};">●</div>
                <div class="city-name">${city.name}</div>
            </div>
        `;
    }).join('');
    
    modal.classList.add('active');
}

/**
 * Remove infection card permanently
 */
async function removeInfectionCard(discardIndex) {
    closeModal('resilientModal');
    
    await performAction('event', { 
        eventId: 'resilient_population', 
        cardIndex: window.resilientCardIndex,
        discardIndex: discardIndex
    });
    
    showToast('Resilient Population digunakan! Kartu infeksi dihapus.', 'success');
}

/**
 * Show discard modal when hand limit exceeded
 */
function showDiscardModal() {
    if (!currentPlayerData || !currentPlayerData.cards) return;
    
    const modal = document.getElementById('discardModal');
    const list = document.getElementById('discardCardsList');
    
    list.innerHTML = currentPlayerData.cards.map((card, index) => {
        let icon = '🃏';
        let colorStyle = '';
        
        if (card.type === 'city') {
            const city = CITIES[card.id];
            icon = getColorIcon(city.color);
            colorStyle = `color: ${getColorHex(city.color)};`;
        } else if (card.type === 'event') {
            icon = card.icon || '⚡';
        }
        
        return `
            <div class="discard-card-item" onclick="discardCard(${index})">
                <div class="card-icon" style="${colorStyle}">${icon}</div>
                <div class="card-name">${card.name || 'Kartu'}</div>
            </div>
        `;
    }).join('');
    
    modal.classList.add('active');
}

/**
 * Discard a card - ✅ FIX BUG 4: Properly sync cards with Firebase
 */
async function discardCard(cardIndex) {
    try {
        const card = currentPlayerData.cards[cardIndex];
        if (!card) {
            showToast('Kartu tidak ditemukan', 'error');
            return;
        }
        
        // ✅ FIX: Get fresh game state and update atomically
        const snapshot = await roomsRef.child(currentRoomCode).child('gameState').once('value');
        const gameState = snapshot.val();
        
        if (!gameState || !gameState.players || !gameState.players[currentPlayerId]) {
            showToast('Game state tidak tersedia', 'error');
            return;
        }
        
        // Ensure arrays exist
        if (!gameState.playerDiscard) gameState.playerDiscard = [];
        if (!gameState.players[currentPlayerId].cards) gameState.players[currentPlayerId].cards = [];
        
        // Get the card from fresh game state
        const freshCards = [...gameState.players[currentPlayerId].cards];
        if (cardIndex >= freshCards.length) {
            showToast('Kartu tidak valid (index out of bounds)', 'error');
            return;
        }
        
        const cardToDiscard = freshCards[cardIndex];
        
        // Remove card from player hand
        freshCards.splice(cardIndex, 1);
        
        // Add to discard pile
        gameState.playerDiscard.push(cardToDiscard);
        
        // Update both in one transaction
        await roomsRef.child(currentRoomCode).child('gameState').update({
            [`players/${currentPlayerId}/cards`]: freshCards,
            playerDiscard: gameState.playerDiscard
        });
        
        // Update local state
        currentPlayerData.cards = freshCards;
        
        console.log(`✅ Card discarded: ${cardToDiscard.name}, remaining cards: ${freshCards.length}`);
        showToast(`Kartu ${cardToDiscard.name || 'kartu'} dibuang`, 'info');
        
        closeModal('discardModal');
        
        // If still over 7, show again
        if (freshCards.length > 7) {
            setTimeout(() => showDiscardModal(), 500);
        }
        
    } catch (error) {
        console.error('Error discarding card:', error);
        showToast('Gagal membuang kartu', 'error');
    }
}

/**
 * Get color icon
 */
function getColorIcon(color) {
    const icons = {
        blue: '🔵',
        yellow: '🟡',
        black: '⚫',
        red: '🔴'
    };
    return icons[color] || '●';
}

/**
 * Use Forecast event - reorder top 6 infection cards
 */
async function useForecast(cardIndex) {
    if (!currentGameState || !currentGameState.infectionDeck) {
        showToast('Deck infeksi tidak tersedia', 'error');
        return;
    }
    
    const top6 = currentGameState.infectionDeck.slice(0, 6);
    
    if (top6.length === 0) {
        showToast('Deck infeksi kosong', 'error');
        return;
    }
    
    // Store for confirmation
    window.forecastCardIndex = cardIndex;
    window.forecastCards = [...top6];
    
    // Show modal
    const modal = document.getElementById('forecastModal');
    const list = document.getElementById('forecastCardsList');
    
    list.innerHTML = top6.map((card, index) => {
        // Infection deck cards are just cityId strings
        const city = CITIES[card];
        return `
            <div class="forecast-card-item" draggable="true" data-index="${index}">
                <div class="forecast-card-number">${index + 1}</div>
                <div class="forecast-card-info">
                    <div class="forecast-card-city">${city.name}</div>
                    <div class="forecast-card-color" style="color: ${getColorHex(city.color)};">${city.color}</div>
                </div>
                <div class="forecast-drag-handle">⠿</div>
            </div>
        `;
    }).join('');
    
    // Setup drag and drop
    setupForecastDragDrop();
    
    modal.classList.add('active');
}

/**
 * Setup drag and drop for forecast cards
 */
function setupForecastDragDrop() {
    const cards = document.querySelectorAll('.forecast-card-item');
    let draggedElement = null;
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedElement = card;
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(card.parentElement, e.clientY);
            if (afterElement == null) {
                card.parentElement.appendChild(draggedElement);
            } else {
                card.parentElement.insertBefore(draggedElement, afterElement);
            }
        });
    });
}

/**
 * Get element after dragged position
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.forecast-card-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Confirm forecast reordering
 */
async function confirmForecast() {
    const cards = document.querySelectorAll('.forecast-card-item');
    const newOrder = Array.from(cards).map(card => {
        const index = parseInt(card.dataset.index);
        return window.forecastCards[index];
    });
    
    closeModal('forecastModal');
    
    // Use the event card and update infection deck
    await performAction('event', { 
        eventId: 'forecast', 
        cardIndex: window.forecastCardIndex,
        newInfectionOrder: newOrder
    });
    
    showToast('Forecast digunakan! Urutan kartu infeksi diatur ulang.', 'success');
}

/**
 * Use Resilient Population - remove infection card from discard
 */
async function useResilientPopulation(cardIndex) {
    if (!currentGameState || !currentGameState.infectionDiscard || currentGameState.infectionDiscard.length === 0) {
        showToast('Tidak ada kartu di infection discard pile', 'error');
        return;
    }
    
    // Store for later use
    window.resilientCardIndex = cardIndex;
    
    // Show modal
    const modal = document.getElementById('resilientModal');
    const list = document.getElementById('resilientCardsList');
    
    list.innerHTML = currentGameState.infectionDiscard.map((cityId, index) => {
        // Infection discard cards are just cityId strings
        const city = CITIES[cityId];
        return `
            <div class="resilient-card-item" onclick="removeInfectionCard(${index})">
                <div class="city-icon" style="color: ${getColorHex(city.color)};">●</div>
                <div class="city-name">${city.name}</div>
            </div>
        `;
    }).join('');
    
    modal.classList.add('active');
}

/**
 * Remove infection card permanently
 */
async function removeInfectionCard(discardIndex) {
    closeModal('resilientModal');
    
    await performAction('event', { 
        eventId: 'resilient_population', 
        cardIndex: window.resilientCardIndex,
        discardIndex: discardIndex
    });
    
    showToast('Resilient Population digunakan! Kartu infeksi dihapus.', 'success');
}

/**
 * Show discard modal when hand limit exceeded
 */
function showDiscardModal() {
    if (!currentPlayerData || !currentPlayerData.cards) return;
    
    const modal = document.getElementById('discardModal');
    const list = document.getElementById('discardCardsList');
    
    list.innerHTML = currentPlayerData.cards.map((card, index) => {
        let icon = '🃏';
        let colorStyle = '';
        
        if (card.type === 'city') {
            const city = CITIES[card.id];
            icon = getColorIcon(city.color);
            colorStyle = `color: ${getColorHex(city.color)};`;
        } else if (card.type === 'event') {
            icon = card.icon || '⚡';
        }
        
        return `
            <div class="discard-card-item" onclick="discardCard(${index})">
                <div class="card-icon" style="${colorStyle}">${icon}</div>
                <div class="card-name">${card.name || 'Kartu'}</div>
            </div>
        `;
    }).join('');
    
    modal.classList.add('active');
}

/**
 * Discover cure
 */
async function discoverCure() {
    if (!checkCanAct()) return;
    
    if (!currentPlayerData || !currentPlayerData.cards) {
        showToast('Data pemain tidak tersedia', 'error');
        return;
    }
    
    if (!currentGameState || !currentGameState.cities) {
        showToast('Game state tidak tersedia', 'error');
        return;
    }
    
    const cityId = currentPlayerData.location;
    const cityState = currentGameState.cities[cityId];
    
    if (!cityState || !cityState.hasResearchStation) {
        showToast('Harus berada di Research Station', 'error');
        return;
    }
    
    // Find which color can be cured
    const colorCounts = { blue: [], yellow: [], black: [], red: [] };
    currentPlayerData.cards.forEach((card, index) => {
        if (card && card.type === 'city' && card.color && colorCounts[card.color]) {
            colorCounts[card.color].push(index);
        }
    });
    
    const required = currentPlayerData.role && currentPlayerData.role.id === 'scientist' ? 4 : 5;
    
    const curableColor = Object.entries(colorCounts).find(([color, indices]) => {
        return indices.length >= required && !currentGameState.cures[color];
    });
    
    if (!curableColor) {
        showToast(`Butuh ${required} kartu warna sama untuk membuat obat`, 'error');
        return;
    }
    
    const [color, cardIndices] = curableColor;
    const indicesToDiscard = cardIndices.slice(0, required);
    
    console.log('Discovering cure:', { color, cardIndices: indicesToDiscard });
    await performAction('cure', { color: color, cardIndices: indicesToDiscard });
}

/**
 * End turn - Auto draw cards and handle infection
 */
async function endTurn() {
    const currentTurnPlayerId = currentGameState.turnOrder[currentGameState.currentPlayerIndex];
    
    if (currentTurnPlayerId !== currentPlayerId) {
        showToast('Bukan giliran kamu', 'error');
        return;
    }
    
    // Check hand limit - if already at 7, skip drawing entirely
    const currentHandSize = currentPlayerData && currentPlayerData.cards ? currentPlayerData.cards.length : 0;
    if (currentHandSize >= 7) {
        showToast('Kartu penuh (7), langsung ke fase infeksi...', 'info');
        await performAction('end_turn', {});
        return;
    }
    
    // Calculate how many cards to draw (max 2, but not exceed 7)
    const cardsToDraw = Math.min(2, 7 - currentHandSize);
    
    // Auto draw cards
    showToast(`Mengambil ${cardsToDraw} kartu...`, 'info');
    await autoDrawCards(cardsToDraw);
}

/**
 * Perform action (send to Firebase)
 */
async function performAction(actionType, actionData) {
    try {
        // Validate current state first
        if (!currentGameState) {
            showToast('Game state belum tersedia', 'error');
            return;
        }
        
        if (!currentPlayerId) {
            showToast('Player ID tidak ditemukan', 'error');
            return;
        }
        
        if (!currentRoomCode) {
            showToast('Room code tidak ditemukan', 'error');
            return;
        }
        
        showToast('Memproses aksi...', 'info');
        
        console.log('🎮 Performing action:', actionType);
        console.log('📦 Action data:', actionData);
        
        // Get current game state from Firebase
        const snapshot = await roomsRef.child(currentRoomCode).child('gameState').once('value');
        const gameState = snapshot.val();
        
        if (!gameState) {
            showToast('Game state tidak ditemukan di server', 'error');
            console.error('Game state is null from Firebase');
            return;
        }
        
        console.log('✅ GameState loaded from Firebase');
        console.log('👤 Player cards:', gameState.players[currentPlayerId]?.cards);
        
        // ✅ FIX: Initialize arrays if they don't exist (Firebase removes empty arrays)
        if (!gameState.playerDiscard) gameState.playerDiscard = [];
        if (!gameState.infectionDiscard) gameState.infectionDiscard = [];
        if (!gameState.playerDeck) gameState.playerDeck = [];
        if (!gameState.infectionDeck) gameState.infectionDeck = [];
        if (!gameState.log) gameState.log = [];
        
        // Validate player exists in game state
        if (!gameState.players || !gameState.players[currentPlayerId]) {
            showToast('Player tidak ditemukan dalam game', 'error');
            console.error('Player not found in game state:', currentPlayerId);
            return;
        }
        
        // Process action
        const result = processGameAction(gameState, currentPlayerId, actionType, actionData);
        
        if (result.error) {
            // Special case: hand limit exceeded
            if (result.error === 'Hand limit exceeded') {
                showToast(result.message || 'Kartu terlalu banyak! Buang kartu dulu.', 'error');
                // Update state if provided (so player cards are synced)
                if (result.newState) {
                    await roomsRef.child(currentRoomCode).child('gameState').set(result.newState);
                }
                // Show discard modal
                setTimeout(() => showDiscardModal(), 500);
                return;
            }
            
            showToast(result.error, 'error');
            console.warn('Action rejected:', actionType, result.error);
            return;
        }
        
        if (!result.newState) {
            showToast('Gagal memproses aksi', 'error');
            console.error('No new state returned from processGameAction');
            return;
        }
        
        // Update game state in Firebase
        await roomsRef.child(currentRoomCode).child('gameState').set(result.newState);
        
        console.log('✅ Action completed:', actionType, result.message);
        showToast(result.message || 'Aksi berhasil!', 'success');
        selectedCards = [];
        
    } catch (error) {
        console.error('❌ Error performing action:', error);
        showToast('Gagal melakukan aksi: ' + (error.message || error), 'error');
    }
}

/**
 * Process game action and return new state
 */
function processGameAction(gameState, playerId, actionType, actionData) {
    console.log('🔧 Processing action:', actionType);
    console.log('👤 Player ID:', playerId);
    console.log('📦 Action data:', actionData);
    
    const player = gameState.players[playerId];
    const currentTurnPlayerId = gameState.turnOrder[gameState.currentPlayerIndex];
    
    console.log('🎲 Player data:', { location: player.location, cards: player.cards, actionsLeft: player.actionsLeft });
    
    // Check if it's player's turn (except for event cards)
    if (actionType !== 'event' && currentTurnPlayerId !== playerId) {
        console.log('❌ Not player turn');
        return { error: 'Bukan giliran kamu' };
    }
    
    // Check if player has actions left
    if (actionType !== 'end_turn' && actionType !== 'event' && player.actionsLeft <= 0) {
        console.log('❌ No actions left');
        return { error: 'Tidak ada aksi tersisa' };
    }
    
    console.log('✅ Validation passed, creating new state...');
    let newState = JSON.parse(JSON.stringify(gameState));
    
    // ✅ FIX: Ensure arrays exist (Firebase can remove empty arrays)
    if (!newState.playerDiscard) newState.playerDiscard = [];
    if (!newState.infectionDiscard) newState.infectionDiscard = [];
    if (!newState.playerDeck) newState.playerDeck = [];
    if (!newState.infectionDeck) newState.infectionDeck = [];
    if (!newState.log) newState.log = [];
    
    // ✅ FIX: Ensure player cards array exists
    if (!newState.players[playerId].cards) {
        newState.players[playerId].cards = [];
    }
    
    let message = '';
    
    switch (actionType) {
        case 'move':
            const city = CITIES[player.location];
            if (!city.connections.includes(actionData.destination)) {
                return { error: 'Kota tidak terhubung' };
            }
            newState.players[playerId].location = actionData.destination;
            newState.players[playerId].actionsLeft--;
            message = `Berjalan ke ${CITIES[actionData.destination].name}`;
            addLog(newState, `🚶 ${player.name} berjalan ke ${CITIES[actionData.destination].name}`);
            break;
            
        case 'direct_flight':
            console.log('✈️ Direct flight case entered');
            console.log('📍 Current location:', player.location);
            console.log('🎯 Destination:', actionData.destination);
            console.log('🎴 Card index:', actionData.cardIndex);
            console.log('📋 Player cards before:', newState.players[playerId].cards);
            
            // STEP 1: Cek apakah pemain memiliki kartu kota tersebut
            const card = player.cards[actionData.cardIndex];
            console.log('🃏 Card found:', card);
            
            if (!card) {
                console.log('❌ Card not found');
                return { error: 'Kartu tidak ditemukan' };
            }
            if (card.type !== 'city') {
                console.log('❌ Not a city card');
                return { error: 'Bukan kartu kota' };
            }
            if (card.id !== actionData.destination) {
                console.log('❌ Card does not match destination');
                return { error: 'Kartu tidak sesuai dengan tujuan' };
            }
            
            console.log('✅ Card validation passed');
            
            // STEP 2: Pindahkan posisi pemain ke kota tersebut
            newState.players[playerId].location = actionData.destination;
            console.log('✅ Player moved to:', actionData.destination);
            
            // STEP 3: Hapus kartu dari pemain
            const removedCard = newState.players[playerId].cards.splice(actionData.cardIndex, 1)[0];
            console.log('✅ Card removed:', removedCard);
            console.log('📋 Player cards after removal:', newState.players[playerId].cards);
            
            // STEP 4: Tambahkan kartu ke playerDiscard
            // ✅ DOUBLE CHECK: Ensure playerDiscard exists before push
            if (!newState.playerDiscard) {
                console.error('⚠️ playerDiscard was undefined! Re-initializing...');
                newState.playerDiscard = [];
            }
            newState.playerDiscard.push(removedCard);
            console.log('✅ Card added to discard pile');
            console.log('🗑️ Discard pile size:', newState.playerDiscard.length);
            
            // Update actions dan log
            newState.players[playerId].actionsLeft--;
            message = `Terbang ke ${CITIES[actionData.destination].name}`;
            addLog(newState, `✈️ ${player.name} terbang ke ${CITIES[actionData.destination].name}`);
            console.log('✅ Direct flight completed successfully');
            break;
            
        case 'charter_flight':
            // STEP 1: Cek apakah pemain memiliki kartu kota lokasi saat ini
            const charterCard = player.cards[actionData.cardIndex];
            if (!charterCard) {
                return { error: 'Kartu tidak ditemukan' };
            }
            if (charterCard.type !== 'city') {
                return { error: 'Bukan kartu kota' };
            }
            if (charterCard.id !== player.location) {
                return { error: 'Kartu harus sesuai kota saat ini' };
            }
            
            // STEP 2: Pindahkan posisi pemain ke kota tujuan
            newState.players[playerId].location = actionData.destination;
            
            // STEP 3: Hapus kartu dari pemain
            const removedCharterCard = newState.players[playerId].cards.splice(actionData.cardIndex, 1)[0];
            
            // STEP 4: Tambahkan kartu ke playerDiscard
            // ✅ DOUBLE CHECK: Ensure playerDiscard exists before push
            if (!newState.playerDiscard) {
                console.error('⚠️ playerDiscard was undefined in charter! Re-initializing...');
                newState.playerDiscard = [];
            }
            newState.playerDiscard.push(removedCharterCard);
            
            // Update actions dan log
            newState.players[playerId].actionsLeft--;
            message = `Charter flight ke ${CITIES[actionData.destination].name}`;
            addLog(newState, `🛫 ${player.name} charter flight ke ${CITIES[actionData.destination].name}`);
            break;
            
        case 'shuttle_flight':
            if (!newState.cities[player.location].hasResearchStation) {
                return { error: 'Harus di Research Station' };
            }
            if (!newState.cities[actionData.destination].hasResearchStation) {
                return { error: 'Tujuan harus Research Station' };
            }
            newState.players[playerId].location = actionData.destination;
            newState.players[playerId].actionsLeft--;
            message = `Shuttle ke ${CITIES[actionData.destination].name}`;
            addLog(newState, `🚐 ${player.name} shuttle ke ${CITIES[actionData.destination].name}`);
            break;
            
        case 'treat':
            const treatCity = newState.cities[player.location];
            if (treatCity.disease[actionData.color] <= 0) {
                return { error: 'Tidak ada penyakit warna ini' };
            }
            
            // Medic removes all, others remove 1
            // If cured, remove all
            const removeCount = player.role.id === 'medic' || newState.cures[actionData.color] 
                ? treatCity.disease[actionData.color] 
                : 1;
            
            treatCity.disease[actionData.color] -= removeCount;
            newState.cubesLeft[actionData.color] += removeCount;
            newState.players[playerId].actionsLeft--;
            message = `Mengobati ${removeCount} ${actionData.color}`;
            addLog(newState, `💊 ${player.name} mengobati ${removeCount} penyakit ${actionData.color} di ${CITIES[player.location].name}`);
            break;
            
        case 'build':
            if (newState.cities[player.location].hasResearchStation) {
                return { error: 'Sudah ada Research Station' };
            }
            if (newState.researchStations <= 0) {
                return { error: 'Tidak ada Research Station tersisa' };
            }
            
            // Operations Expert doesn't need to discard
            if (player.role.id !== 'operations_expert') {
                if (actionData.cardIndex < 0) {
                    return { error: 'Butuh kartu kota' };
                }
                const buildCard = player.cards[actionData.cardIndex];
                newState.players[playerId].cards.splice(actionData.cardIndex, 1);
                newState.playerDiscard.push(buildCard);
            }
            
            newState.cities[player.location].hasResearchStation = true;
            newState.researchStations--;
            newState.players[playerId].actionsLeft--;
            message = `Membangun Research Station`;
            addLog(newState, `🏥 ${player.name} membangun Research Station di ${CITIES[player.location].name}`);
            break;
            
        case 'share':
            const targetPlayer = newState.players[actionData.targetPlayerId];
            if (!targetPlayer || targetPlayer.location !== player.location) {
                return { error: 'Pemain tidak di lokasi sama' };
            }
            const shareCard = player.cards[actionData.cardIndex];
            if (!shareCard) {
                return { error: 'Kartu tidak valid' };
            }
            
            // Check if it's the current city card (unless Researcher)
            if (player.role.id !== 'researcher' && shareCard.id !== player.location) {
                return { error: 'Hanya bisa berbagi kartu kota saat ini' };
            }
            
            // ✅ FIX: Ensure target player cards array exists
            if (!newState.players[actionData.targetPlayerId].cards) {
                newState.players[actionData.targetPlayerId].cards = [];
            }
            
            // ✅ FIX BUG 3: Check hand limit BEFORE giving card (max 7)
            if (newState.players[actionData.targetPlayerId].cards.length >= 7) {
                return { error: `${targetPlayer.name} sudah memiliki 7 kartu (maksimum). Tidak bisa menerima kartu lagi.` };
            }
            
            newState.players[playerId].cards.splice(actionData.cardIndex, 1);
            newState.players[actionData.targetPlayerId].cards.push(shareCard);
            newState.players[playerId].actionsLeft--;
            message = `Memberikan kartu ke ${targetPlayer.name}`;
            addLog(newState, `🔄 ${player.name} memberikan kartu ${shareCard.name} ke ${targetPlayer.name}`);
            break;
            
        case 'cure':
            if (!newState.cities[player.location].hasResearchStation) {
                return { error: 'Harus di Research Station' };
            }
            if (newState.cures[actionData.color]) {
                return { error: 'Obat sudah ditemukan' };
            }
            
            const required = player.role.id === 'scientist' ? 4 : 5;
            if (actionData.cardIndices.length < required) {
                return { error: `Butuh ${required} kartu` };
            }
            
            // Remove cards (in reverse order to maintain indices)
            const sortedIndices = [...actionData.cardIndices].sort((a, b) => b - a);
            const discardedCards = [];
            sortedIndices.forEach(index => {
                const c = newState.players[playerId].cards.splice(index, 1)[0];
                discardedCards.push(c);
            });
            // ✅ DOUBLE CHECK: Ensure playerDiscard exists before push
            if (!newState.playerDiscard) {
                console.error('⚠️ playerDiscard was undefined in cure! Re-initializing...');
                newState.playerDiscard = [];
            }
            newState.playerDiscard.push(...discardedCards);
            
            newState.cures[actionData.color] = true;
            newState.players[playerId].actionsLeft--;
            message = `Menemukan obat ${actionData.color}!`;
            addLog(newState, `🧪 ${player.name} menemukan obat untuk penyakit ${actionData.color}!`, 'cure');
            
            // Check win condition
            if (Object.values(newState.cures).every(c => c)) {
                newState.gameOver = true;
                newState.gameResult = 'win';
                addLog(newState, '🏆 KEMENANGAN! Semua obat ditemukan!', 'cure');
            }
            break;
            
        case 'event':
            // Event cards can be played anytime (don't consume actions for most)
            const eventCard = player.cards[actionData.cardIndex];
            if (!eventCard || eventCard.type !== 'event') {
                return { error: 'Bukan kartu event' };
            }
            
            // Remove event card from hand
            const removedEventCard = newState.players[playerId].cards.splice(actionData.cardIndex, 1)[0];
            
            // Add to discard
            if (!newState.playerDiscard) newState.playerDiscard = [];
            newState.playerDiscard.push(removedEventCard);
            
            // Handle different event types
            switch(actionData.eventId) {
                case 'airlift':
                    // Move any player to any city
                    if (!actionData.targetPlayerId || !actionData.destination) {
                        return { error: 'Target dan tujuan harus ditentukan' };
                    }
                    newState.players[actionData.targetPlayerId].location = actionData.destination;
                    message = `Airlift: ${newState.players[actionData.targetPlayerId].name} ke ${CITIES[actionData.destination].name}`;
                    addLog(newState, `✈️ EVENT: ${player.name} menggunakan Airlift untuk memindahkan pemain ke ${CITIES[actionData.destination].name}`);
                    break;
                    
                case 'government_grant':
                    // Build research station anywhere
                    if (!actionData.cityId) {
                        return { error: 'Kota harus ditentukan' };
                    }
                    if (newState.cities[actionData.cityId].hasResearchStation) {
                        return { error: 'Sudah ada Research Station di kota ini' };
                    }
                    newState.cities[actionData.cityId].hasResearchStation = true;
                    message = `Government Grant: Research Station dibangun di ${CITIES[actionData.cityId].name}`;
                    addLog(newState, `🏛️ EVENT: ${player.name} menggunakan Government Grant untuk membangun Research Station di ${CITIES[actionData.cityId].name}`);
                    break;
                    
                case 'one_quiet_night':
                    // Skip next infection phase
                    newState.skipNextInfection = true;
                    message = 'One Quiet Night: Fase infeksi berikutnya dilewati';
                    addLog(newState, `🌙 EVENT: ${player.name} menggunakan One Quiet Night - fase infeksi berikutnya dilewati`);
                    break;
                    
                case 'forecast':
                    // Reorder top infection cards
                    if (!actionData.newInfectionOrder) {
                        return { error: 'Urutan baru harus ditentukan' };
                    }
                    // Replace top cards with new order
                    const remainingInfectionCards = newState.infectionDeck.slice(actionData.newInfectionOrder.length);
                    newState.infectionDeck = [...actionData.newInfectionOrder, ...remainingInfectionCards];
                    message = 'Forecast: Urutan kartu infeksi diatur ulang';
                    addLog(newState, `🔮 EVENT: ${player.name} menggunakan Forecast untuk mengatur urutan infeksi`);
                    break;
                    
                case 'resilient_population':
                    // Remove infection card from discard pile permanently
                    if (actionData.discardIndex === undefined || !newState.infectionDiscard) {
                        return { error: 'Kartu discard harus dipilih' };
                    }
                    const removedInfectionCard = newState.infectionDiscard.splice(actionData.discardIndex, 1)[0];
                    // removedInfectionCard is a cityId string, not an object
                    message = `Resilient Population: ${CITIES[removedInfectionCard].name} dihapus dari discard`;
                    addLog(newState, `🛡️ EVENT: ${player.name} menggunakan Resilient Population untuk menghapus ${CITIES[removedInfectionCard].name} dari infeksi`);
                    break;
                    
                default:
                    return { error: 'Event tidak dikenali' };
            }
            break;
            
        case 'end_turn':
            // NOTE: Card drawing is now handled by autoDrawCards() BEFORE this action
            // This action only handles infection phase and turn transition
            
            // Check if deck is empty (lose condition)
            if (newState.playerDeck.length === 0) {
                newState.gameOver = true;
                newState.gameResult = 'lose';
                addLog(newState, '💀 KEKALAHAN! Kehabisan kartu.', 'outbreak');
            }
            
            // Infect cities
            if (!newState.gameOver) {
                const infectionRate = INFECTION_RATE_TRACK[newState.infectionRateIndex];
                for (let i = 0; i < infectionRate; i++) {
                    newState = infectCity(newState);
                }
            }
            
            // Check hand limit
            if (newState.players[playerId].cards.length > 7) {
                // Player MUST discard - prevent turn from ending
                addLog(newState, `⚠️ ${player.name} harus membuang kartu (max 7)`, 'warning');
                // Don't change turn yet - player needs to discard first
                return { 
                    error: 'Hand limit exceeded', 
                    message: `Kamu punya ${newState.players[playerId].cards.length} kartu. Maksimal 7. Buang ${newState.players[playerId].cards.length - 7} kartu dulu.`,
                    newState: newState
                };
            }
            
            // Next player
            newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.turnOrder.length;
            const nextPlayerId = newState.turnOrder[newState.currentPlayerIndex];
            const nextPlayer = newState.players[nextPlayerId];
            newState.players[nextPlayerId].actionsLeft = nextPlayer.role.id === 'generalist' ? 5 : 4;
            
            if (newState.currentPlayerIndex === 0) {
                newState.round++;
            }
            
            message = 'Giliran selesai';
            addLog(newState, `➡️ Giliran ${newState.players[nextPlayerId].name}`);
            break;
            
        default:
            return { error: 'Aksi tidak dikenal' };
    }
    
    newState.lastUpdate = Date.now();
    
    return { newState, message };
}

/**
 * Handle epidemic
 */
function handleEpidemic(gameState) {
    // ✅ FIX: Ensure arrays exist
    if (!gameState.infectionDeck) gameState.infectionDeck = [];
    if (!gameState.infectionDiscard) gameState.infectionDiscard = [];
    
    // Increase infection rate
    if (gameState.infectionRateIndex < INFECTION_RATE_TRACK.length - 1) {
        gameState.infectionRateIndex++;
    }
    
    // Infect bottom card with 3 cubes
    if (gameState.infectionDeck.length > 0) {
        const bottomCard = gameState.infectionDeck.shift(); // Get from bottom
        const city = CITIES[bottomCard];
        
        if (city) {
            for (let i = 0; i < 3; i++) {
                gameState = addDiseaseCube(gameState, bottomCard, city.color);
            }
            
            gameState.infectionDiscard.push(bottomCard);
        }
    }
    
    // Shuffle discard and put on top
    const shuffled = shuffleArray([...gameState.infectionDiscard]);
    gameState.infectionDeck = [...shuffled, ...gameState.infectionDeck];
    gameState.infectionDiscard = [];
    
    return gameState;
}

/**
 * Infect a city (normal infection phase)
 */
function infectCity(gameState) {
    // ✅ FIX: Ensure arrays exist
    if (!gameState.infectionDeck) gameState.infectionDeck = [];
    if (!gameState.infectionDiscard) gameState.infectionDiscard = [];
    
    if (gameState.infectionDeck.length === 0) return gameState;
    
    const cityId = gameState.infectionDeck.pop();
    const city = CITIES[cityId];
    
    if (!city) return gameState;
    
    gameState.infectionDiscard.push(cityId);
    gameState = addDiseaseCube(gameState, cityId, city.color);
    
    addLog(gameState, `🦠 ${city.name} terinfeksi`, 'infection');
    
    return gameState;
}

/**
 * Add disease cube to city
 */
function addDiseaseCube(gameState, cityId, color, outbreakChain = []) {
    const cityState = gameState.cities[cityId];
    
    // Check if eradicated
    if (gameState.eradicated[color]) {
        return gameState;
    }
    
    // Check for quarantine specialist
    const hasQuarantine = Object.values(gameState.players).some(p => {
        if (p.role.id !== 'quarantine_specialist') return false;
        if (p.location === cityId) return true;
        return CITIES[p.location].connections.includes(cityId);
    });
    
    if (hasQuarantine) {
        return gameState;
    }
    
    // Check for outbreak
    if (cityState.disease[color] >= 3) {
        // Outbreak!
        if (outbreakChain.includes(cityId)) {
            return gameState; // Already had outbreak in this chain
        }
        
        gameState.outbreakCount++;
        outbreakChain.push(cityId);
        addLog(gameState, `💥 OUTBREAK di ${CITIES[cityId].name}!`, 'outbreak');
        
        // Check lose condition
        if (gameState.outbreakCount >= 8) {
            gameState.gameOver = true;
            gameState.gameResult = 'lose';
            addLog(gameState, '💀 KEKALAHAN! Terlalu banyak outbreak.', 'outbreak');
            return gameState;
        }
        
        // Spread to connected cities
        CITIES[cityId].connections.forEach(connectedId => {
            gameState = addDiseaseCube(gameState, connectedId, color, outbreakChain);
        });
    } else {
        // Add cube
        if (gameState.cubesLeft[color] <= 0) {
            gameState.gameOver = true;
            gameState.gameResult = 'lose';
            addLog(gameState, `💀 KEKALAHAN! Kubus ${color} habis.`, 'outbreak');
            return gameState;
        }
        
        cityState.disease[color]++;
        gameState.cubesLeft[color]--;
    }
    
    return gameState;
}

/**
 * Add log entry
 */
function addLog(gameState, message, type = 'info') {
    // ✅ FIX: Ensure log array exists
    if (!gameState.log) {
        gameState.log = [];
    }
    
    gameState.log.push({
        time: Date.now(),
        message: message,
        type: type
    });
    
    // Keep only last 50 logs
    if (gameState.log.length > 50) {
        gameState.log = gameState.log.slice(-50);
    }
}

// ==================== MODALS ====================

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Show game over modal
 */
function showGameOverModal(result) {
    const modal = document.getElementById('gameOverModal');
    const icon = document.getElementById('gameOverIcon');
    const title = document.getElementById('gameOverTitle');
    const message = document.getElementById('gameOverMessage');
    
    if (result === 'win') {
        icon.textContent = '🏆';
        title.textContent = 'MENANG!';
        title.className = 'game-over-title win';
        message.textContent = 'Selamat! Tim berhasil menyelamatkan dunia!';
    } else {
        icon.textContent = '💀';
        title.textContent = 'KALAH...';
        title.className = 'game-over-title lose';
        message.textContent = 'Dunia telah jatuh. Coba lagi!';
    }
    
    modal.classList.add('active');
}

/**
 * Back to home
 */
function backToHome() {
    window.location.href = 'index.html';
}

// ==================== QR SCANNER ====================

/**
 * Open QR scanner (placeholder)
 */
function openScanner() {
    showToast('QR Scanner akan segera hadir!', 'info');
    // In full implementation, use a library like html5-qrcode
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if player can act
 */
function checkCanAct() {
    if (!currentGameState || !currentGameState.turnOrder) {
        showToast('Game state tidak valid', 'error');
        return false;
    }
    
    if (!currentPlayerData) {
        showToast('Player data tidak tersedia', 'error');
        return false;
    }
    
    const currentTurnPlayerId = currentGameState.turnOrder[currentGameState.currentPlayerIndex];
    
    if (currentTurnPlayerId !== currentPlayerId) {
        showToast('Bukan giliran kamu', 'error');
        return false;
    }
    
    if (!currentPlayerData.actionsLeft || currentPlayerData.actionsLeft <= 0) {
        showToast('Tidak ada aksi tersisa', 'error');
        return false;
    }
    
    return true;
}

/**
 * Get color hex
 */
function getColorHex(color) {
    const colors = {
        blue: '#00b4d8',
        yellow: '#ffd60a',
        black: '#888',
        red: '#ff4444'
    };
    return colors[color] || '#888';
}

/**
 * Shuffle array
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
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.add('show');
}

/**
 * Hide error message
 */
function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.querySelector('.toast-icon').className = `fas ${iconMap[type] || iconMap.info} toast-icon`;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ==================== CARD DRAWING SYSTEM ====================

/**
 * Auto draw cards at end of turn
 */
async function autoDrawCards(count) {
    try {
        const drawnCards = [];
        let hasEpidemic = false;
        
        console.log(`🎴 Auto drawing ${count} cards...`);
        
        for (let i = 0; i < count; i++) {
            // Get current game state from Firebase
            const snapshot = await roomsRef.child(currentRoomCode).child('gameState').once('value');
            const gameState = snapshot.val();
            
            if (!gameState || !gameState.playerDeck || gameState.playerDeck.length === 0) {
                showToast('Deck kartu pemain habis! Game Over!', 'error');
                await performAction('game_over', { reason: 'deckEmpty' });
                return;
            }
            
            console.log(`📥 Drawing card ${i+1}/${count}, deck size: ${gameState.playerDeck.length}`);
            console.log('Top card:', gameState.playerDeck[0]);
            
            // Draw card from top of deck
            const drawnCardData = gameState.playerDeck[0];
            const remainingDeck = gameState.playerDeck.slice(1);
            
            // ✅ VALIDATION: Ensure it's a valid player card
            if (!drawnCardData || !drawnCardData.type) {
                console.error('❌ Invalid card drawn from player deck:', drawnCardData);
                showToast('Error: Kartu invalid!', 'error');
                return;
            }
            
            // ✅ VALIDATION: Infection cards should NEVER be in player deck
            if (drawnCardData.type === 'infection') {
                console.error('❌ CRITICAL BUG: Infection card in player deck!', drawnCardData);
                showToast('Error: Kartu infeksi masuk ke deck pemain! Hubungi developer.', 'error');
                return;
            }
            
            // Check if it's an epidemic
            const isEpidemic = drawnCardData.type === 'epidemic';
            if (isEpidemic) hasEpidemic = true;
            
            // Update Firebase
            const updates = {};
            updates[`gameState/playerDeck`] = remainingDeck;
            
            // ✅ IMPORTANT: Hanya tambahkan non-epidemic ke hand
            if (!isEpidemic) {
                const currentPlayer = gameState.players[currentPlayerId];
                if (!currentPlayer.cards) currentPlayer.cards = [];
                currentPlayer.cards.push(drawnCardData);
                updates[`gameState/players/${currentPlayerId}/cards`] = currentPlayer.cards;
            } else {
                // Epidemic tidak ditambahkan ke hand, tapi tetap draw lagi untuk mengganti
                console.log('⚠️ Epidemic drawn - akan draw 1 kartu tambahan');
                count++; // Draw satu kartu tambahan untuk mengganti epidemic
            }
            
            if (isEpidemic) {
                // Handle epidemic - returns updated gameState
                const updatedGameState = handleEpidemic(gameState);
                
                // Update with correct property names
                updates[`gameState/outbreakCount`] = updatedGameState.outbreakCount || 0;
                updates[`gameState/infectionRateIndex`] = updatedGameState.infectionRateIndex || 0;
                updates[`gameState/infectionDeck`] = updatedGameState.infectionDeck || [];
                updates[`gameState/infectionDiscard`] = updatedGameState.infectionDiscard || [];
                updates[`gameState/cities`] = updatedGameState.cities;
                updates[`gameState/cubesLeft`] = updatedGameState.cubesLeft;
                updates[`gameState/gameOver`] = updatedGameState.gameOver || false;
                updates[`gameState/gameResult`] = updatedGameState.gameResult || null;
                
                // Update local gameState reference
                Object.assign(gameState, updatedGameState);
                
                // Add log
                if (!gameState.log) gameState.log = [];
                gameState.log.push({
                    time: getTimestamp(),
                    type: 'epidemic',
                    message: `⚠️ EPIDEMIC! Infection rate meningkat!`
                });
                updates[`gameState/log`] = gameState.log;
            }
            
            await roomsRef.child(currentRoomCode).update(updates);
            
            // Store drawn card info
            drawnCards.push({
                data: drawnCardData,
                isEpidemic: isEpidemic
            });
            
            // Small delay between draws
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Show results
        showDrawResults(drawnCards);
        
        // Wait a bit then proceed to infection
        setTimeout(async () => {
            showToast('Menginfeksi kota...', 'info');
            await performAction('end_turn', {});
        }, hasEpidemic ? 2500 : 1500);
        
    } catch (error) {
        console.error('Error auto drawing cards:', error);
        showToast('Gagal mengambil kartu', 'error');
    }
}

/**
 * Show drawn cards results
 */
function showDrawResults(drawnCards) {
    let message = '🎴 Kartu yang didapat:\n';
    
    drawnCards.forEach((card, index) => {
        if (card.isEpidemic) {
            message += `${index + 1}. ☣️ EPIDEMIC!\n`;
        } else if (card.data.type === 'event') {
            message += `${index + 1}. ${card.data.icon || '🎴'} ${card.data.name}\n`;
        } else if (card.data.type === 'city') {
            // City card - safely access CITIES
            const city = CITIES[card.data.id];
            if (city) {
                const colorIcon = {
                    blue: '🔵',
                    yellow: '🟡',
                    black: '⚫',
                    red: '🔴'
                };
                message += `${index + 1}. ${colorIcon[city.color] || '🏙️'} ${city.name}\n`;
            } else {
                console.error('City not found:', card.data.id);
                message += `${index + 1}. 🏙️ ${card.data.name || 'Unknown City'}\n`;
            }
        } else {
            // Unknown card type - should not happen
            console.error('Unknown card type:', card.data);
            message += `${index + 1}. ❓ ${card.data.name || 'Unknown'}\n`;
        }
    });
    
    // Show in toast with longer duration
    showToast(message, drawnCards.some(c => c.isEpidemic) ? 'error' : 'success', 2000);
}

/**
 * Show card draw modal (DEPRECATED - kept for compatibility)
 */
function showCardDrawModal() {
    // Prevent opening if already active
    const modal = document.getElementById('cardDrawModal');
    if (modal.classList.contains('active')) {
        console.log('⚠️ Card draw modal already active, skipping');
        return;
    }
    
    // Check current hand size
    const currentHandSize = currentPlayerData && currentPlayerData.cards ? currentPlayerData.cards.length : 0;
    
    // Calculate how many cards can be drawn without exceeding limit
    const maxDrawable = Math.min(2, 7 - currentHandSize);
    
    if (maxDrawable <= 0) {
        // Cannot draw any cards - should have been caught earlier
        showToast('Kartu sudah penuh! Buang kartu dulu.', 'error');
        showDiscardModal();
        return;
    }
    
    // Reset state
    cardsToDraw = maxDrawable; // Draw up to 2 cards, but not exceed limit
    cardsDrawn = 0;
    isDrawingCards = true;
    isCurrentlyDrawing = false; // Reset lock
    
    // Update UI
    document.getElementById('playerDeckCount').textContent = currentGameState.playerDeck ? currentGameState.playerDeck.length : 0;
    
    if (maxDrawable < 2) {
        document.getElementById('cardDrawProgress').textContent = `Ambil ${maxDrawable} kartu (Kartu kamu: ${currentHandSize}/7)`;
    } else {
        document.getElementById('cardDrawProgress').textContent = `Ambil ${cardsToDraw} kartu kota`;
    }
    
    document.getElementById('drawnCard').innerHTML = '';
    document.getElementById('continueDrawBtn').style.display = 'none';
    
    // Show skip button if player has 5-6 cards (can't safely draw 2)
    const skipBtn = document.getElementById('skipDrawBtn');
    if (skipBtn) {
        if (currentHandSize >= 5 && currentHandSize < 7) {
            skipBtn.style.display = 'block';
        } else {
            skipBtn.style.display = 'none';
        }
    }
    
    // Reset button state
    const drawBtn = document.querySelector('.player-deck');
    if (drawBtn) {
        drawBtn.style.pointerEvents = 'auto';
        drawBtn.style.opacity = '1';
    }
    
    // Show modal
    modal.classList.add('active');
}

/**
 * Draw a player card
 */
async function drawPlayerCard() {
    // LOCK: Prevent concurrent draws
    if (isCurrentlyDrawing) {
        console.log('⚠️ Already drawing a card, please wait...');
        return;
    }
    
    if (!isDrawingCards || cardsDrawn >= cardsToDraw) return;
    
    // Check hand limit BEFORE drawing
    const currentHandSize = currentPlayerData && currentPlayerData.cards ? currentPlayerData.cards.length : 0;
    if (currentHandSize >= 7) {
        showToast('Kartu sudah penuh (max 7)! Tidak bisa draw lagi.', 'error');
        // Auto proceed to continue
        document.getElementById('cardDrawProgress').textContent = `Kartu penuh! Lanjut ke fase infeksi`;
        document.getElementById('continueDrawBtn').style.display = 'block';
        isDrawingCards = false; // Stop drawing
        return;
    }
    
    // SET LOCK
    isCurrentlyDrawing = true;
    
    // Disable draw button
    const drawBtn = document.querySelector('.player-deck');
    if (drawBtn) {
        drawBtn.style.pointerEvents = 'none';
        drawBtn.style.opacity = '0.5';
    }
    
    try {
        console.log('🎴 Drawing player card...');
        
        // Get current game state from Firebase
        const snapshot = await roomsRef.child(currentRoomCode).child('gameState').once('value');
        const gameState = snapshot.val();
        
        if (!gameState || !gameState.playerDeck || gameState.playerDeck.length === 0) {
            showToast('Deck kartu pemain habis! Game Over!', 'error');
            await performAction('game_over', { reason: 'deckEmpty' });
            return;
        }
        
        // Draw card from top of deck
        const drawnCardData = gameState.playerDeck[0];
        const remainingDeck = gameState.playerDeck.slice(1);
        
        // Check if it's an epidemic
        const isEpidemic = drawnCardData.type === 'epidemic';
        
        // Update Firebase
        const updates = {};
        updates[`gameState/playerDeck`] = remainingDeck;
        
        // ✅ IMPORTANT: Epidemic card tidak ditambahkan ke hand!
        // Hanya non-epidemic yang ditambahkan ke hand
        if (!isEpidemic) {
            const currentPlayer = gameState.players[currentPlayerId];
            if (!currentPlayer.cards) currentPlayer.cards = [];
            currentPlayer.cards.push(drawnCardData);
            updates[`gameState/players/${currentPlayerId}/cards`] = currentPlayer.cards;
        }
        
        if (isEpidemic) {
            // Handle epidemic
            const epidemicResult = handleEpidemic(gameState);
            updates[`gameState/outbreaks`] = epidemicResult.outbreaks;
            updates[`gameState/infectionRate`] = epidemicResult.infectionRate;
            updates[`gameState/infectionDeck`] = epidemicResult.infectionDeck;
            updates[`gameState/infectionDiscard`] = epidemicResult.infectionDiscard;
            updates[`gameState/cities`] = epidemicResult.cities;
            
            // Add log
            if (!gameState.log) gameState.log = [];
            gameState.log.push({
                time: getTimestamp(),
                type: 'epidemic',
                message: `⚠️ EPIDEMIC! Infection rate meningkat!`
            });
            updates[`gameState/log`] = gameState.log;
        }
        
        await roomsRef.child(currentRoomCode).update(updates);
        
        // Show drawn card with animation
        showDrawnCard(drawnCardData, isEpidemic);
        
        // ✅ IMPORTANT: Hanya hitung kartu non-epidemic
        // Epidemic tidak dihitung karena tidak ditambahkan ke hand
        if (!isEpidemic) {
            cardsDrawn++;
        } else {
            // Jika epidemic, tampilkan pesan khusus
            showToast('☣️ EPIDEMIC! Kartu epidemic tidak dihitung, draw lagi!', 'error', 2000);
        }
        
        // Update progress
        const remaining = cardsToDraw - cardsDrawn;
        if (remaining > 0) {
            document.getElementById('cardDrawProgress').textContent = `Ambil ${remaining} kartu lagi`;
        } else {
            document.getElementById('cardDrawProgress').textContent = `Selesai! Sekarang infeksi ${gameState.infectionRate} kota`;
            document.getElementById('continueDrawBtn').style.display = 'block';
        }
        
        // Update deck count
        document.getElementById('playerDeckCount').textContent = remainingDeck.length;
        
    } catch (error) {
        console.error('Error drawing card:', error);
        showToast('Gagal mengambil kartu', 'error');
    } finally {
        // RELEASE LOCK
        isCurrentlyDrawing = false;
        
        // Re-enable draw button if still drawing
        if (cardsDrawn < cardsToDraw) {
            const drawBtn = document.querySelector('.player-deck');
            if (drawBtn) {
                drawBtn.style.pointerEvents = 'auto';
                drawBtn.style.opacity = '1';
            }
        }
    }
}

/**
 * Show drawn card with animation
 */
function showDrawnCard(cardData, isEpidemic) {
    const container = document.getElementById('drawnCard');
    
    const cardDiv = document.createElement('div');
    cardDiv.className = `card-reveal ${isEpidemic ? 'epidemic' : ''}`;
    
    if (isEpidemic) {
        cardDiv.innerHTML = `
            <div class="card-reveal-icon">☣️</div>
            <div class="card-reveal-name">EPIDEMIC!</div>
        `;
    } else if (cardData.type === 'event') {
        cardDiv.innerHTML = `
            <div class="card-reveal-icon">${cardData.icon || '🎴'}</div>
            <div class="card-reveal-name">${cardData.name}</div>
        `;
    } else {
        // City card
        const city = CITIES[cardData.id];
        const colorIcon = {
            blue: '🔵',
            yellow: '🟡',
            black: '⚫',
            red: '🔴'
        };
        cardDiv.innerHTML = `
            <div class="card-reveal-icon">${colorIcon[city.color] || '🏙️'}</div>
            <div class="card-reveal-name">${city.name}</div>
        `;
    }
    
    container.innerHTML = '';
    container.appendChild(cardDiv);
    
    // Play sound effect (if you want to add one later)
    if (isEpidemic) {
        showToast('⚠️ EPIDEMIC!', 'error');
    }
}

/**
 * Continue after drawing cards
 */
async function continueAfterDraw() {
    // Check hand limit before continuing
    if (currentPlayerData && currentPlayerData.cards && currentPlayerData.cards.length > 7) {
        showToast(`Kartu kamu ${currentPlayerData.cards.length}. Maksimal 7! Buang kartu dulu.`, 'error');
        document.getElementById('cardDrawModal').classList.remove('active');
        showDiscardModal();
        return;
    }
    
    // Close modal
    document.getElementById('cardDrawModal').classList.remove('active');
    isDrawingCards = false;
    isCurrentlyDrawing = false; // Reset lock
    
    // Reset button state
    const drawBtn = document.querySelector('.player-deck');
    if (drawBtn) {
        drawBtn.style.pointerEvents = 'auto';
        drawBtn.style.opacity = '1';
    }
    
    // Now handle infection phase
    showToast('Menginfeksi kota...', 'info');
    
    // Perform end turn action (which will handle infections on host side)
    await performAction('end_turn', {});
}

/**
 * Skip drawing cards and go directly to infection phase
 */
async function skipDraw() {
    if (!confirm('Skip draw phase? Kamu tidak akan mengambil kartu sama sekali. Lanjut ke fase infeksi?')) {
        return;
    }
    
    // Close modal
    document.getElementById('cardDrawModal').classList.remove('active');
    isDrawingCards = false;
    isCurrentlyDrawing = false;
    
    // Reset button state
    const drawBtn = document.querySelector('.player-deck');
    if (drawBtn) {
        drawBtn.style.pointerEvents = 'auto';
        drawBtn.style.opacity = '1';
    }
    
    showToast('Skip draw, menginfeksi kota...', 'info');
    
    // Perform end turn action
    await performAction('end_turn', {});
}

// ==================== DEBUG ====================

window.debugState = () => {
    console.log('Room:', currentRoomCode);
    console.log('Player ID:', currentPlayerId);
    console.log('Player Data:', currentPlayerData);
    console.log('Game State:', currentGameState);
};

// ==================== QR SCANNER ====================

let html5QrcodeScanner = null;

/**
 * Open QR scanner modal
 */
function openScanner() {
    const modal = document.getElementById('scannerModal');
    modal.classList.add('active');
    
    // Initialize scanner
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
    }
    
    // Start scanning
    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Use back camera
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error('Error starting scanner:', err);
        showToast('Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.', 'error');
    });
}

/**
 * Handle successful QR scan
 */
function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);
    
    // Stop scanner
    html5QrcodeScanner.stop().then(() => {
        closeScanner();
        
        // Extract room code from URL
        try {
            const url = new URL(decodedText);
            const roomCode = url.searchParams.get('room');
            
            if (roomCode && roomCode.length === 6) {
                // Fill in room code inputs
                const codeInputs = document.querySelectorAll('.code-input');
                roomCode.split('').forEach((char, index) => {
                    if (codeInputs[index]) {
                        codeInputs[index].value = char.toUpperCase();
                        codeInputs[index].classList.add('filled');
                    }
                });
                
                // Trigger validation
                validateJoinForm();
                
                showToast('QR Code berhasil dipindai!', 'success');
            } else {
                showToast('QR Code tidak valid', 'error');
            }
        } catch (error) {
            console.error('Error parsing QR code:', error);
            showToast('Format QR Code tidak dikenali', 'error');
        }
    }).catch(err => {
        console.error('Error stopping scanner:', err);
    });
}

/**
 * Handle scan failure (usually just no QR in view)
 */
function onScanFailure(error) {
    // Don't log every frame without QR code
    // Only log actual errors
    if (error && !error.includes('NotFoundException')) {
        console.warn('QR scan error:', error);
    }
}

/**
 * Close QR scanner
 */
function closeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
    
    const modal = document.getElementById('scannerModal');
    modal.classList.remove('active');
}

console.log('📱 Player.js Loaded Successfully!');