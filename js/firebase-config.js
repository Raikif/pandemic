// ==================== FIREBASE CONFIGURATION ====================
// Pandemic Web Game - Firebase Setup
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyALIoCf7m_AYiE60cRHoyr7FaWFHydCjKs",
    authDomain: "pandemic-1190d.firebaseapp.com",
    databaseURL: "https://pandemic-1190d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pandemic-1190d",
    storageBucket: "pandemic-1190d.firebasestorage.app",
    messagingSenderId: "597342154698",
    appId: "1:597342154698:web:2a5490f50fdb6813906933"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get database reference
const database = firebase.database();

// Get auth reference
const auth = firebase.auth();

// ==================== AUTHENTICATION ====================

/**
 * Ensure user is authenticated (anonymous)
 */
async function ensureAuth() {
    // Wait for auth state to be ready
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            
            if (user) {
                console.log('✅ Already authenticated:', user.uid);
                resolve(user);
            } else {
                try {
                    const userCredential = await auth.signInAnonymously();
                    console.log('✅ Authenticated anonymously:', userCredential.user.uid);
                    resolve(userCredential.user);
                } catch (error) {
                    console.error('❌ Authentication failed:', error);
                    reject(error);
                }
            }
        });
    });
}

// ==================== DATABASE REFERENCES ====================
const roomsRef = database.ref('rooms');

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate random room code (6 characters)
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars (0,O,1,I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate unique player ID
 */
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get current timestamp
 */
function getTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
}

/**
 * Check if room exists
 */
async function checkRoomExists(roomCode) {
    try {
        const snapshot = await roomsRef.child(roomCode).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking room:', error);
        return false;
    }
}

// ==================== GAME DATA STRUCTURES ====================

/**
 * Player roles with special abilities
 */
const ROLES = {
    MEDIC: {
        id: 'medic',
        name: 'Medic',
        color: '#ff6b6b',
        icon: '🏥',
        ability: 'Hapus semua kubus penyakit dengan 1 aksi. Otomatis hapus kubus penyakit yang sudah ada obatnya.'
    },
    SCIENTIST: {
        id: 'scientist',
        name: 'Scientist',
        color: '#4ecdc4',
        icon: '🔬',
        ability: 'Butuh hanya 4 kartu (bukan 5) untuk menemukan obat.'
    },
    RESEARCHER: {
        id: 'researcher',
        name: 'Researcher',
        color: '#ffe66d',
        icon: '📚',
        ability: 'Bisa memberikan kartu kota manapun ke pemain di kota yang sama.'
    },
    OPERATIONS_EXPERT: {
        id: 'operations_expert',
        name: 'Operations Expert',
        color: '#95e1d3',
        icon: '🔧',
        ability: 'Bisa membangun Research Station tanpa membuang kartu.'
    },
    DISPATCHER: {
        id: 'dispatcher',
        name: 'Dispatcher',
        color: '#a8d8ea',
        icon: '📡',
        ability: 'Bisa memindahkan pion pemain lain. Bisa memindahkan pemain ke lokasi pemain lain.'
    },
    QUARANTINE_SPECIALIST: {
        id: 'quarantine_specialist',
        name: 'Quarantine Specialist',
        color: '#aa96da',
        icon: '🛡️',
        ability: 'Mencegah penempatan kubus penyakit di kota saat ini dan kota yang terhubung.'
    },
    CONTINGENCY_PLANNER: {
        id: 'contingency_planner',
        name: 'Contingency Planner',
        color: '#fcbad3',
        icon: '📋',
        ability: 'Bisa mengambil kartu Event dari discard pile.'
    },
    GENERALIST: {
        id: 'generalist',
        name: 'Generalist',
        color: '#f38181',
        icon: '🎯',
        ability: 'Bisa melakukan 5 aksi per giliran (bukan 4).'
    },
    FIELD_OPERATIVE: {
        id: 'field_operative',
        name: 'Field Operative',
        color: '#3d5a80',
        icon: '🕵️',
        ability: 'Saat mengobati penyakit, bisa menyimpan kubus sebagai sampel untuk membantu menemukan obat.'
    },
    PILOT: {
        id: 'pilot',
        name: 'Pilot',
        color: '#98c1d9',
        icon: '✈️',
        ability: 'Sekali per giliran, bisa terbang ke kota manapun tanpa membuang kartu.'
    }
};

/**
 * All cities data with connections
 */
const CITIES = {
    // ===== BLUE CITIES (North America & Europe) =====
    san_francisco: {
        id: 'san_francisco',
        name: 'San Francisco',
        color: 'blue',
        position: { x: 8, y: 35 },
        connections: ['tokyo', 'manila', 'los_angeles', 'chicago']
    },
    chicago: {
        id: 'chicago',
        name: 'Chicago',
        color: 'blue',
        position: { x: 15, y: 30 },
        connections: ['san_francisco', 'los_angeles', 'mexico_city', 'atlanta', 'montreal']
    },
    montreal: {
        id: 'montreal',
        name: 'Montreal',
        color: 'blue',
        position: { x: 20, y: 25 },
        connections: ['chicago', 'new_york', 'washington']
    },
    new_york: {
        id: 'new_york',
        name: 'New York',
        color: 'blue',
        position: { x: 23, y: 30 },
        connections: ['montreal', 'washington', 'london', 'madrid']
    },
    washington: {
        id: 'washington',
        name: 'Washington',
        color: 'blue',
        position: { x: 21, y: 35 },
        connections: ['montreal', 'new_york', 'atlanta', 'miami']
    },
    atlanta: {
        id: 'atlanta',
        name: 'Atlanta',
        color: 'blue',
        position: { x: 17, y: 38 },
        connections: ['chicago', 'washington', 'miami'],
        hasResearchStation: true // Starting city
    },
    london: {
        id: 'london',
        name: 'London',
        color: 'blue',
        position: { x: 40, y: 22 },
        connections: ['new_york', 'madrid', 'paris', 'essen']
    },
    madrid: {
        id: 'madrid',
        name: 'Madrid',
        color: 'blue',
        position: { x: 38, y: 35 },
        connections: ['new_york', 'london', 'paris', 'sao_paulo', 'algiers']
    },
    paris: {
        id: 'paris',
        name: 'Paris',
        color: 'blue',
        position: { x: 43, y: 28 },
        connections: ['london', 'madrid', 'essen', 'milan', 'algiers']
    },
    essen: {
        id: 'essen',
        name: 'Essen',
        color: 'blue',
        position: { x: 45, y: 20 },
        connections: ['london', 'paris', 'milan', 'st_petersburg']
    },
    milan: {
        id: 'milan',
        name: 'Milan',
        color: 'blue',
        position: { x: 47, y: 28 },
        connections: ['paris', 'essen', 'istanbul']
    },
    st_petersburg: {
        id: 'st_petersburg',
        name: 'St. Petersburg',
        color: 'blue',
        position: { x: 52, y: 15 },
        connections: ['essen', 'moscow', 'istanbul']
    },

    // ===== YELLOW CITIES (South America & Africa) =====
    los_angeles: {
        id: 'los_angeles',
        name: 'Los Angeles',
        color: 'yellow',
        position: { x: 10, y: 42 },
        connections: ['san_francisco', 'chicago', 'mexico_city', 'sydney']
    },
    mexico_city: {
        id: 'mexico_city',
        name: 'Mexico City',
        color: 'yellow',
        position: { x: 13, y: 48 },
        connections: ['los_angeles', 'chicago', 'miami', 'bogota', 'lima']
    },
    miami: {
        id: 'miami',
        name: 'Miami',
        color: 'yellow',
        position: { x: 19, y: 45 },
        connections: ['washington', 'atlanta', 'mexico_city', 'bogota']
    },
    bogota: {
        id: 'bogota',
        name: 'Bogota',
        color: 'yellow',
        position: { x: 18, y: 58 },
        connections: ['miami', 'mexico_city', 'lima', 'sao_paulo', 'buenos_aires']
    },
    lima: {
        id: 'lima',
        name: 'Lima',
        color: 'yellow',
        position: { x: 15, y: 68 },
        connections: ['mexico_city', 'bogota', 'santiago']
    },
    santiago: {
        id: 'santiago',
        name: 'Santiago',
        color: 'yellow',
        position: { x: 17, y: 80 },
        connections: ['lima']
    },
    buenos_aires: {
        id: 'buenos_aires',
        name: 'Buenos Aires',
        color: 'yellow',
        position: { x: 23, y: 78 },
        connections: ['bogota', 'sao_paulo']
    },
    sao_paulo: {
        id: 'sao_paulo',
        name: 'Sao Paulo',
        color: 'yellow',
        position: { x: 27, y: 70 },
        connections: ['bogota', 'buenos_aires', 'madrid', 'lagos']
    },
    lagos: {
        id: 'lagos',
        name: 'Lagos',
        color: 'yellow',
        position: { x: 42, y: 55 },
        connections: ['sao_paulo', 'khartoum', 'kinshasa']
    },
    kinshasa: {
        id: 'kinshasa',
        name: 'Kinshasa',
        color: 'yellow',
        position: { x: 45, y: 65 },
        connections: ['lagos', 'khartoum', 'johannesburg']
    },
    johannesburg: {
        id: 'johannesburg',
        name: 'Johannesburg',
        color: 'yellow',
        position: { x: 50, y: 75 },
        connections: ['kinshasa', 'khartoum']
    },
    khartoum: {
        id: 'khartoum',
        name: 'Khartoum',
        color: 'yellow',
        position: { x: 52, y: 52 },
        connections: ['lagos', 'kinshasa', 'johannesburg', 'cairo']
    },

    // ===== BLACK CITIES (Middle East & Asia) =====
    algiers: {
        id: 'algiers',
        name: 'Algiers',
        color: 'black',
        position: { x: 42, y: 40 },
        connections: ['madrid', 'paris', 'istanbul', 'cairo']
    },
    cairo: {
        id: 'cairo',
        name: 'Cairo',
        color: 'black',
        position: { x: 50, y: 42 },
        connections: ['algiers', 'istanbul', 'baghdad', 'riyadh', 'khartoum']
    },
    istanbul: {
        id: 'istanbul',
        name: 'Istanbul',
        color: 'black',
        position: { x: 50, y: 32 },
        connections: ['milan', 'st_petersburg', 'algiers', 'cairo', 'baghdad', 'moscow']
    },
    moscow: {
        id: 'moscow',
        name: 'Moscow',
        color: 'black',
        position: { x: 55, y: 20 },
        connections: ['st_petersburg', 'istanbul', 'tehran']
    },
    baghdad: {
        id: 'baghdad',
        name: 'Baghdad',
        color: 'black',
        position: { x: 55, y: 38 },
        connections: ['istanbul', 'cairo', 'riyadh', 'karachi', 'tehran']
    },
    riyadh: {
        id: 'riyadh',
        name: 'Riyadh',
        color: 'black',
        position: { x: 56, y: 48 },
        connections: ['cairo', 'baghdad', 'karachi']
    },
    tehran: {
        id: 'tehran',
        name: 'Tehran',
        color: 'black',
        position: { x: 60, y: 30 },
        connections: ['moscow', 'baghdad', 'karachi', 'delhi']
    },
    karachi: {
        id: 'karachi',
        name: 'Karachi',
        color: 'black',
        position: { x: 62, y: 42 },
        connections: ['baghdad', 'riyadh', 'tehran', 'delhi', 'mumbai']
    },
    mumbai: {
        id: 'mumbai',
        name: 'Mumbai',
        color: 'black',
        position: { x: 64, y: 50 },
        connections: ['karachi', 'delhi', 'chennai']
    },
    delhi: {
        id: 'delhi',
        name: 'Delhi',
        color: 'black',
        position: { x: 66, y: 38 },
        connections: ['tehran', 'karachi', 'mumbai', 'chennai', 'kolkata']
    },
    chennai: {
        id: 'chennai',
        name: 'Chennai',
        color: 'black',
        position: { x: 68, y: 55 },
        connections: ['mumbai', 'delhi', 'kolkata', 'bangkok', 'jakarta']
    },
    kolkata: {
        id: 'kolkata',
        name: 'Kolkata',
        color: 'black',
        position: { x: 70, y: 42 },
        connections: ['delhi', 'chennai', 'bangkok', 'hong_kong']
    },

    // ===== RED CITIES (East Asia & Oceania) =====
    bangkok: {
        id: 'bangkok',
        name: 'Bangkok',
        color: 'red',
        position: { x: 73, y: 50 },
        connections: ['chennai', 'kolkata', 'hong_kong', 'ho_chi_minh', 'jakarta']
    },
    hong_kong: {
        id: 'hong_kong',
        name: 'Hong Kong',
        color: 'red',
        position: { x: 77, y: 42 },
        connections: ['kolkata', 'bangkok', 'ho_chi_minh', 'manila', 'taipei', 'shanghai']
    },
    ho_chi_minh: {
        id: 'ho_chi_minh',
        name: 'Ho Chi Minh',
        color: 'red',
        position: { x: 76, y: 55 },
        connections: ['bangkok', 'hong_kong', 'manila', 'jakarta']
    },
    jakarta: {
        id: 'jakarta',
        name: 'Jakarta',
        color: 'red',
        position: { x: 74, y: 65 },
        connections: ['chennai', 'bangkok', 'ho_chi_minh', 'sydney']
    },
    manila: {
        id: 'manila',
        name: 'Manila',
        color: 'red',
        position: { x: 82, y: 52 },
        connections: ['san_francisco', 'hong_kong', 'ho_chi_minh', 'sydney', 'taipei']
    },
    taipei: {
        id: 'taipei',
        name: 'Taipei',
        color: 'red',
        position: { x: 82, y: 40 },
        connections: ['hong_kong', 'manila', 'shanghai', 'osaka']
    },
    shanghai: {
        id: 'shanghai',
        name: 'Shanghai',
        color: 'red',
        position: { x: 78, y: 35 },
        connections: ['hong_kong', 'taipei', 'beijing', 'seoul', 'tokyo']
    },
    beijing: {
        id: 'beijing',
        name: 'Beijing',
        color: 'red',
        position: { x: 76, y: 28 },
        connections: ['shanghai', 'seoul']
    },
    seoul: {
        id: 'seoul',
        name: 'Seoul',
        color: 'red',
        position: { x: 82, y: 28 },
        connections: ['beijing', 'shanghai', 'tokyo']
    },
    tokyo: {
        id: 'tokyo',
        name: 'Tokyo',
        color: 'red',
        position: { x: 88, y: 32 },
        connections: ['san_francisco', 'shanghai', 'seoul', 'osaka']
    },
    osaka: {
        id: 'osaka',
        name: 'Osaka',
        color: 'red',
        position: { x: 87, y: 40 },
        connections: ['tokyo', 'taipei']
    },
    sydney: {
        id: 'sydney',
        name: 'Sydney',
        color: 'red',
        position: { x: 88, y: 75 },
        connections: ['los_angeles', 'jakarta', 'manila']
    }
};

/**
 * Event cards
 */
const EVENT_CARDS = [
    {
        id: 'airlift',
        name: 'Airlift',
        icon: '✈️',
        description: 'Pindahkan pion pemain manapun ke kota manapun.'
    },
    {
        id: 'government_grant',
        name: 'Government Grant',
        icon: '🏛️',
        description: 'Bangun Research Station di kota manapun (gratis).'
    },
    {
        id: 'one_quiet_night',
        name: 'One Quiet Night',
        icon: '🌙',
        description: 'Lewati fase infeksi berikutnya.'
    },
    {
        id: 'forecast',
        name: 'Forecast',
        icon: '🔮',
        description: 'Lihat 6 kartu teratas Infection Deck dan susun ulang.'
    },
    {
        id: 'resilient_population',
        name: 'Resilient Population',
        icon: '💪',
        description: 'Buang 1 kartu dari Infection Discard Pile.'
    }
];

/**
 * Infection rate track
 */
const INFECTION_RATE_TRACK = [2, 2, 2, 3, 3, 4, 4];

/**
 * Difficulty settings (number of epidemic cards)
 */
const DIFFICULTY = {
    easy: { epidemics: 4, name: 'Mudah' },
    medium: { epidemics: 5, name: 'Sedang' },
    hard: { epidemics: 6, name: 'Sulit' }
};

// ==================== ROOM FUNCTIONS ====================

/**
 * Create a new room
 */
async function createRoom(settings = {}) {
    // Ensure user is authenticated before creating room
    await ensureAuth();
    
    const roomCode = generateRoomCode();
    const roomData = {
        code: roomCode,
        status: 'lobby', // lobby, playing, finished
        createdAt: getTimestamp(),
        settings: {
            difficulty: settings.difficulty || 'easy',
            turnTimer: settings.turnTimer || 60,
            maxPlayers: 10
        },
        players: {},
        gameState: null
    };

    try {
        await roomsRef.child(roomCode).set(roomData);
        console.log('Room created:', roomCode);
        return roomCode;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

/**
 * Join a room
 */
async function joinRoom(roomCode, playerData) {
    // Ensure user is authenticated before joining room
    await ensureAuth();
    
    const playerId = generatePlayerId();
    
    try {
        // Check if room exists
        const roomSnapshot = await roomsRef.child(roomCode).once('value');
        if (!roomSnapshot.exists()) {
            throw new Error('Room tidak ditemukan');
        }

        const room = roomSnapshot.val();
        
        // Check if game already started
        if (room.status !== 'lobby') {
            throw new Error('Game sudah dimulai');
        }

        // Check player count
        const playerCount = room.players ? Object.keys(room.players).length : 0;
        if (playerCount >= room.settings.maxPlayers) {
            throw new Error('Room sudah penuh');
        }

        // Add player
        const player = {
            id: playerId,
            name: playerData.name,
            avatar: playerData.avatar,
            ready: false,
            role: null,
            joinedAt: getTimestamp()
        };

        await roomsRef.child(roomCode).child('players').child(playerId).set(player);
        
        console.log('Player joined:', playerId);
        return { playerId, roomCode };
    } catch (error) {
        console.error('Error joining room:', error);
        throw error;
    }
}

/**
 * Leave a room
 */
async function leaveRoom(roomCode, playerId) {
    try {
        await roomsRef.child(roomCode).child('players').child(playerId).remove();
        console.log('Player left:', playerId);
    } catch (error) {
        console.error('Error leaving room:', error);
        throw error;
    }
}

/**
 * Update player ready status
 */
async function updatePlayerReady(roomCode, playerId, isReady) {
    try {
        await roomsRef.child(roomCode).child('players').child(playerId).child('ready').set(isReady);
    } catch (error) {
        console.error('Error updating ready status:', error);
        throw error;
    }
}

/**
 * Delete room
 */
async function deleteRoom(roomCode) {
    try {
        await roomsRef.child(roomCode).remove();
        console.log('Room deleted:', roomCode);
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;
    }
}

// ==================== LISTENER HELPERS ====================

/**
 * Listen to room changes
 */
function listenToRoom(roomCode, callback) {
    return roomsRef.child(roomCode).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

/**
 * Stop listening to room
 */
function stopListeningToRoom(roomCode) {
    roomsRef.child(roomCode).off();
}

/**
 * Listen to players in room
 */
function listenToPlayers(roomCode, callback) {
    return roomsRef.child(roomCode).child('players').on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

/**
 * Listen to game state
 */
function listenToGameState(roomCode, callback) {
    return roomsRef.child(roomCode).child('gameState').on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

// ==================== EXPORTS ====================
// All functions and constants are available globally

console.log('🔥 Firebase Config Loaded Successfully!');
console.log('📊 Cities:', Object.keys(CITIES).length);
console.log('🎭 Roles:', Object.keys(ROLES).length);
console.log('🎴 Event Cards:', EVENT_CARDS.length);