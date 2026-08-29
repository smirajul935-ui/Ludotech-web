import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnFcJjQ6l4IE6hHnoja21TBC_ANe1hq3M",
  authDomain: "ludo-web-e0798.firebaseapp.com",
  databaseURL: "https://ludo-web-e0798-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludo-web-e0798",
  storageBucket: "ludo-web-e0798.firebasestorage.app",
  messagingSenderId: "1037344132269",
  appId: "1:1037344132269:web:99a8cb42fb81fdd8994a24"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// URL se data nikalna (Detect Chatroom and Username)
const params = new URLSearchParams(window.location.search);
const chatRoomId = params.get("room") || "GlobalTable";
const playerName = params.get("name") || "Guest_" + Math.floor(Math.random()*99);

let myColor = null, roomData = null;
const myId = Math.random().toString(36).substr(2, 9);

const PATH = [[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6]];
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Automatic Join Logic
async function autoJoin() {
    const roomRef = ref(db, `rooms/${chatRoomId}`);
    const snap = await get(roomRef);
    
    if(!snap.exists()) {
        // Create table for this chatroom
        await set(roomRef, {
            status: 'waiting', turn: 'red', dice: 1, players: { red: {id: myId, name: playerName} },
            tokens: { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
            activePlayers: ['red']
        });
        myColor = 'red';
    } else {
        // Join existing table
        let data = snap.val();
        let color = ['red', 'green', 'yellow', 'blue'].find(c => !data.players[c]);
        if(!color) return alert("Table Full!");
        const updates = {};
        updates[`players/${color}`] = {id: myId, name: playerName};
        updates[`activePlayers`] = [...data.activePlayers, color];
        await update(roomRef, updates);
        myColor = color;
    }
    listen();
}

function listen() {
    onValue(ref(db, `rooms/${chatRoomId}`), (snap) => {
        roomData = snap.val(); if(!roomData) return;
        document.getElementById('p-count').innerText = Object.keys(roomData.players).length;
        const list = document.getElementById('player-list');
        list.innerHTML = Object.keys(roomData.players).map(c => `<li><span style="color:var(--${c})">👤 ${roomData.players[c].name}</span></li>`).join('');
        
        if(myColor === 'red' && Object.keys(roomData.players).length >= 2) document.getElementById('start-btn').classList.remove('hidden');
        if(roomData.status === 'playing') {
            document.getElementById('lobby-screen').classList.add('hidden');
            document.getElementById('game-screen').classList.remove('hidden');
            updateUI();
        }
    });
}

function updateUI() {
    document.getElementById('current-turn-text').innerText = roomData.turn.toUpperCase();
    document.getElementById('dice-value').innerText = roomData.dice;
    renderTokens();
}

function renderTokens() {
    const container = document.getElementById('tokens-container');
    container.innerHTML = '';
    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        if(!roomData.players[c]) return;
        roomData.tokens[c].forEach((pos, i) => {
            const t = document.createElement('div');
            t.className = `token ${c}`;
            // Position mapping logic (BASES/PATH/HOME)
            // ... (Same coordinate logic as previous stable version)
            container.appendChild(t);
        });
    });
}

document.getElementById('start-btn').onclick = () => update(ref(db, `rooms/${chatRoomId}`), {status:'playing'});
autoJoin();
