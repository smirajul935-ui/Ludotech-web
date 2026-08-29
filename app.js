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

// Get Table ID and Name from URL (Sent by Smali)
const params = new URLSearchParams(window.location.search);
const chatRoomId = params.get("room") || "Global";
const playerName = params.get("name") || "User_" + Math.floor(Math.random()*99);

let myId = Math.random().toString(36).substr(2, 9);
let myColor = null, roomData = null;

const COLORS = ['red', 'green', 'yellow', 'blue'];
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];
const OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

async function autoJoin() {
    const roomRef = ref(db, `rooms/${chatRoomId}`);
    const snap = await get(roomRef);
    
    if(!snap.exists()) {
        await set(roomRef, {
            status: 'waiting', turn: 'red', players: { red: {id: myId, name: playerName} },
            tokens: { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
            activePlayers: ['red'], dice: 1, diceRolled: false
        });
        myColor = 'red';
    } else {
        let data = snap.val();
        let existingColor = Object.keys(data.players).find(c => data.players[c].name === playerName);
        if(existingColor) {
            myColor = existingColor;
        } else {
            let nextColor = COLORS.find(c => !data.players[c]);
            if(!nextColor) return alert("Table Full!");
            await update(ref(db, `rooms/${chatRoomId}/players/${nextColor}`), {id: myId, name: playerName});
            await update(ref(db, `rooms/${chatRoomId}`), {activePlayers: [...data.activePlayers, nextColor]});
            myColor = nextColor;
        }
    }
    listen();
}

function listen() {
    onValue(ref(db, `rooms/${chatRoomId}`), (snap) => {
        roomData = snap.val(); if(!roomData) return;
        document.getElementById('table-id-text').innerText = "Table ID: " + chatRoomId;
        const list = document.getElementById('player-list');
        list.innerHTML = Object.keys(roomData.players).map(c => `<li><span style="color:var(--${c}); margin-right:15px">👤</span> ${roomData.players[c].name}</li>`).join('');
        document.getElementById('p-count').innerText = Object.keys(roomData.players).length;
        
        if(myColor === 'red' && Object.keys(roomData.players).length >= 2) document.getElementById('host-controls').classList.remove('hidden');
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
    switchTurn(dice === 6 || capture);
}

function updateUI() {
    document.getElementById('turn-text').innerText = roomData.turn.toUpperCase();
    document.getElementById('dice-val').innerText = roomData.dice;
    const rb = document.getElementById('roll-btn');
    rb.disabled = !(roomData.turn === myColor && !roomData.diceRolled);
    renderTokens();
}

// ... [Additional renderBoard and getCoords functions from previous stable version] ...

document.getElementById('start-btn').onclick = () => update(ref(db, `rooms/${chatRoomId}`), {status:'playing'});
autoJoin();
