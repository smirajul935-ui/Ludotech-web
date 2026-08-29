import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnFcJjQ6l4IE6hHnoja21TBC_ANe1hq3M",
  authDomain: "ludo-web-e0798.firebaseapp.com",
  projectId: "ludo-web-e0798",
  storageBucket: "ludo-web-e0798.firebasestorage.app",
  messagingSenderId: "1037344132269",
  appId: "1:1037344132269:web:99a8cb42fb81fdd8994a24"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Get Info from URL
const urlParams = new URLSearchParams(window.location.search);
const chatRoomId = urlParams.get("room") || "GlobalTable";
const playerName = urlParams.get("name") || "Player_" + Math.floor(Math.random()*999);

let myId = Math.random().toString(36).substr(2, 9);
let myColor = null, roomData = null;

const COLORS = ['red', 'green', 'yellow', 'blue'];
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47]; // Path safe stars
const OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

async function autoConnect() {
    const roomRef = ref(db, `rooms/${chatRoomId}`);
    const snap = await get(roomRef);
    if(!snap.exists()) {
        await set(roomRef, {
            status: 'waiting', turn: 'red', dice: 1, players: { red: {id: myId, name: playerName} },
            tokens: { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
            activePlayers: ['red']
        });
        myColor = 'red';
    } else {
        let data = snap.val();
        let color = COLORS.find(c => !data.players[c]);
        if(!color) return alert("Table Full!");
        const up = {};
        up[`players/${color}`] = {id: myId, name: playerName};
        up[`activePlayers`] = [...data.activePlayers, color];
        await update(roomRef, up);
        myColor = color;
    }
    listen();
}

function listen() {
    onValue(ref(db, `rooms/${chatRoomId}`), (s) => {
        roomData = s.val(); if(!roomData) return;
        document.getElementById('room-id').innerText = chatRoomId;
        const list = document.getElementById('player-list');
        list.innerHTML = Object.keys(roomData.players).map(c => `<li><span style="color:var(--${c})">👤</span> ${roomData.players[c].name}</li>`).join('');
        document.getElementById('p-count').innerText = Object.keys(roomData.players).length;
        if(myColor === 'red' && Object.keys(roomData.players).length >= 2) document.getElementById('start-btn').classList.remove('hidden');
        if(roomData.status === 'playing') {
            document.getElementById('lobby-screen').classList.add('hidden');
            document.getElementById('game-screen').classList.remove('hidden');
            updateUI();
        }
    });
}

async function moveToken(idx, pos) {
    let dice = roomData.dice;
    let newP = pos === -1 ? 0 : pos + dice;
    let updates = {};
    let capture = false;

    // Check Capture Logic
    if(newP <= 50) {
        let global = (newP + OFFSETS[myColor]) % 52;
        if(!SAFE_INDICES.includes(global)) {
            COLORS.forEach(enemy => {
                if(enemy !== myColor && roomData.players[enemy]) {
                    roomData.tokens[enemy].forEach((ep, ei) => {
                        if(ep >= 0 && ep <= 50 && (ep + OFFSETS[enemy]) % 52 === global) {
                            updates[`tokens/${enemy}/${ei}`] = -1;
                            capture = true;
                        }
                    });
                }
            });
        }
    }
    updates[`tokens/${myColor}/${idx}`] = newP;
    await update(ref(db, `rooms/${chatRoomId}`), updates);
    
    // Extra Turn if 6 or Captured
    switchTurn(dice === 6 || capture);
}

async function switchTurn(extra) {
    let up = { diceRolled: false };
    if(!extra) {
        let active = roomData.activePlayers;
        up.turn = active[(active.indexOf(myColor) + 1) % active.length];
    }
    await update(ref(db, `rooms/${chatRoomId}`), up);
}

function updateUI() {
    document.getElementById('turn-text').innerText = roomData.turn.toUpperCase();
    document.getElementById('dice-val').innerText = roomData.dice;
    const rb = document.getElementById('roll-btn');
    rb.disabled = !(roomData.turn === myColor && !roomData.diceRolled);
    renderTokens();
}

// UI Rendering and Dice Roll omitted for brevity (same stable logic as before)
// ... [Pichle code ka renderBoard aur rollDice yahan add karein] ...

document.getElementById('start-btn').onclick = () => update(ref(db, `rooms/${chatRoomId}`), {status:'playing'});
document.getElementById('roll-btn').onclick = async () => {
    let val = Math.floor(Math.random() * 6) + 1;
    await update(ref(db, `rooms/${chatRoomId}`), { dice: val, diceRolled: true });
};
autoConnect();
