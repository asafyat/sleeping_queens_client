import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sword, 
  Shield, 
  FlaskConical, 
  Wand2, 
  Sparkles, 
  Trophy,
  ScrollText, 
  BookOpen, 
  Loader2,
  Music,    
  Eye       
} from 'lucide-react';

// ==========================================
// 1. GEMINI API INTEGRATION
// ==========================================
const callGemini = async (prompt) => {
  // ---------------------------------------------------------
  // 🔑 IMPORTANT: Enter your Google Gemini API Key below
  // Get one at: https://aistudio.google.com/
  // ---------------------------------------------------------
  const apiKey = "AIzaSyC_eTqOnCejMnnJ4LDZ8zcxiH7MiebFUJ0"; 

  if (!apiKey) return "הרוחות שותקות... (נא להוסיף מפתח API בקוד)";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "הכוכבים מעוננים היום...";
  } catch (e) {
    console.error("Gemini API Error:", e);
    return "היועץ המלכותי בהפסקת קפה כרגע. נסה שוב מאוחר יותר.";
  }
};

// ==========================================
// 2. MOCK SERVER (JavaScript Port of Python Logic)
// ==========================================
const USE_MOCK_API = false;

class MockGameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.id = Math.random().toString(36).substr(2, 9);
    this.players = {};
    this.deck = this.createDeck();
    this.discardPile = [];
    this.queensSleeping = this.createQueens();
    this.queensAwake = {}; // { playerId: [cards] }
    this.turnPlayerId = null;
    this.started = false;
    this.lastMessage = "Game created";
    this.winnerId = null;
    this.pendingRoseWake = false;
  }

  createQueens() {
    const data = [
      { name: "Rose Queen", value: 5 }, { name: "Dog Queen", value: 15 }, { name: "Cat Queen", value: 15 },
      { name: "Sunflower Queen", value: 10 }, { name: "Rainbow Queen", value: 10 }, { name: "Moon Queen", value: 10 },
      { name: "Star Queen", value: 10 }, { name: "Heart Queen", value: 15 }, { name: "Pancake Queen", value: 15 },
      { name: "Ice Cream Queen", value: 20 }, { name: "Fire Queen", value: 20 }, { name: "Book Queen", value: 10 }
    ];
    return data.map((d, i) => ({ id: `q-${i}`, type: 'queen', ...d })).sort(() => Math.random() - 0.5);
  }

  createDeck() {
    let cards = [];
    const add = (t, c) => { for(let i=0; i<c; i++) cards.push({ id: `${t}-${Math.random().toString(36).substr(2,5)}`, type: t, value: 0 }) };
    add('king', 8); add('knight', 4); add('potion', 4); add('dragon', 3); add('wand', 3); add('jester', 4);
    for(let v=1; v<=10; v++) { for(let i=0; i<4; i++) cards.push({ id: `n-${v}-${i}`, type: 'number', value: v }); }
    return cards.sort(() => Math.random() - 0.5);
  }

  addPlayer(name) {
    const id = Math.random().toString(36).substr(2, 9);
    this.players[id] = { id, name, hand: [], score: 0 };
    this.queensAwake[id] = [];
    return { playerId: id };
  }

  drawCard(playerId, count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        if (this.discardPile.length === 0) break;
        this.deck = this.discardPile;
        this.discardPile = [];
        this.deck.sort(() => Math.random() - 0.5);
      }
      if (this.deck.length > 0) {
        this.players[playerId].hand.push(this.deck.pop());
      }
    }
  }

  startGame() {
    if (Object.keys(this.players).length < 2) throw new Error("Need at least 2 players");
    this.deck = this.deck.filter(c => c.type !== 'queen');
    Object.keys(this.players).forEach(pid => this.drawCard(pid, 5));
    this.turnPlayerId = Object.keys(this.players)[0];
    this.started = true;
    this.lastMessage = "Game Started! " + this.players[this.turnPlayerId].name + "'s turn.";
    return this.getState();
  }

  nextTurn() {
    const pids = Object.keys(this.players);
    const idx = pids.indexOf(this.turnPlayerId);
    this.turnPlayerId = pids[(idx + 1) % pids.length];
  }

  cpuAutoPlay() {
    if (!this.started || this.winnerId) return;
    const cpuId = this.turnPlayerId;
    const cpu = this.players[cpuId];
    if (cpu.name !== "CPU") return; 

    // 1. Wake
    const king = cpu.hand.find(c => c.type === 'king');
    if (king && this.queensSleeping.length > 0) {
       this.playCard(cpuId, [king.id], this.queensSleeping[0].id);
       return;
    }
    // 2. Steal
    const knight = cpu.hand.find(c => c.type === 'knight');
    const oppId = Object.keys(this.queensAwake).find(pid => pid !== cpuId && this.queensAwake[pid].length > 0);
    if (knight && oppId) {
       this.playCard(cpuId, [knight.id], this.queensAwake[oppId][0].id);
       return;
    }
    // 3. Discard
    const discard = cpu.hand[0];
    if (discard) this.finishTurn(cpuId, [discard], `CPU discarded a ${discard.type}`, false);
  }

  playCard(playerId, cardIds, targetCardId) {
    const player = this.players[playerId];
    
    // Rose Bonus Handling
    if (this.pendingRoseWake) {
      const qIdx = this.queensSleeping.findIndex(q => q.id === targetCardId);
      if (qIdx === -1) throw new Error("Select a sleeping queen for bonus!");
      const queen = this.queensSleeping.splice(qIdx, 1)[0];
      this.queensAwake[playerId].push(queen);
      this.pendingRoseWake = false;
      this.finishTurn(playerId, [], `Rose Bonus: ${player.name} woke ${queen.name}!`);
      return this.getState();
    }

    const cards = player.hand.filter(c => cardIds.includes(c.id));
    if (cards.length === 0) throw new Error("Cards not in hand");

    const type = cards[0].type;
    let msg = "";
    let extraTurn = false;

    if (type === 'number') {
      msg = `${player.name} discarded numbers: ${cards.map(c=>c.value).join(', ')}`;
    } else if (type === 'king') {
      const qIdx = this.queensSleeping.findIndex(q => q.id === targetCardId);
      if (qIdx === -1) throw new Error("Select a sleeping queen!");
      const queen = this.queensSleeping.splice(qIdx, 1)[0];
      this.queensAwake[playerId].push(queen);
      msg = `${player.name} woke ${queen.name}`;
      if (queen.name === "Rose Queen") this.pendingRoseWake = true;
    } else if (type === 'knight') {
      let victimId = null, qIdx = -1;
      Object.entries(this.queensAwake).forEach(([pid, qs]) => {
        if (pid !== playerId) {
          const idx = qs.findIndex(q => q.id === targetCardId);
          if (idx !== -1) { victimId = pid; qIdx = idx; }
        }
      });
      if (!victimId) throw new Error("Target queen not found");
      
      const victim = this.players[victimId];
      const dragonIdx = victim.hand.findIndex(c => c.type === 'dragon');
      if (dragonIdx !== -1) {
        const dragon = victim.hand.splice(dragonIdx, 1)[0];
        this.discardPile.push(dragon);
        this.drawCard(victimId, 1);
        msg = `${player.name} tried to steal, but ${victim.name} used a Dragon!`;
      } else {
        const queen = this.queensAwake[victimId].splice(qIdx, 1)[0];
        this.queensAwake[playerId].push(queen);
        msg = `${player.name} stole ${queen.name}!`;
      }
    } else if (type === 'potion') {
       let victimId = null, qIdx = -1;
       Object.entries(this.queensAwake).forEach(([pid, qs]) => {
         if (pid !== playerId) {
           const idx = qs.findIndex(q => q.id === targetCardId);
           if (idx !== -1) { victimId = pid; qIdx = idx; }
         }
       });
       if (!victimId) throw new Error("Target queen not found");
       
       const victim = this.players[victimId];
       const wandIdx = victim.hand.findIndex(c => c.type === 'wand');
       if (wandIdx !== -1) {
         const wand = victim.hand.splice(wandIdx, 1)[0];
         this.discardPile.push(wand);
         this.drawCard(victimId, 1);
         msg = `${player.name} tried to sleep a queen, but ${victim.name} used a Wand!`;
       } else {
         const queen = this.queensAwake[victimId].splice(qIdx, 1)[0];
         this.queensSleeping.push(queen);
         msg = `${player.name} put ${queen.name} to sleep!`;
       }
    } else if (type === 'jester') {
      if(this.deck.length === 0 && this.discardPile.length > 0) {
         this.deck = this.discardPile; this.discardPile = []; this.deck.sort(() => Math.random()-0.5);
      }
      if(this.deck.length === 0) {
        msg = "Jester played, but deck empty!";
      } else {
        const revealed = this.deck.pop();
        msg = `${player.name} Jester revealed: ${revealed.type} ${revealed.value||''}.`;
        
        if (revealed.type !== 'number') {
          player.hand.push(revealed);
          msg += " Magic! You get the card and play again.";
          extraTurn = true;
        } else {
          this.discardPile.push(revealed);
          const pids = Object.keys(this.players);
          const currIdx = pids.indexOf(playerId);
          const targetIdx = (currIdx + revealed.value - 1) % pids.length;
          const targetPid = pids[targetIdx];
          const targetName = this.players[targetPid].name;
          
          if (this.queensSleeping.length > 0) {
            const queen = this.queensSleeping.shift();
            this.queensAwake[targetPid].push(queen);
            msg += ` Counted to ${targetName} who woke ${queen.name}!`;
            if (queen.name === "Rose Queen" && this.queensSleeping.length > 0) {
               const bonus = this.queensSleeping.shift();
               this.queensAwake[targetPid].push(bonus);
               msg += ` (+ Rose Bonus: ${bonus.name})`;
            }
          } else {
            msg += ` Counted to ${targetName}, but no queens sleeping!`;
          }
        }
      }
    }

    this.finishTurn(playerId, cards, msg, extraTurn);
    return this.getState();
  }

  finishTurn(playerId, cardsPlayed, message, extraTurn) {
    const player = this.players[playerId];
    
    // Discard played
    cardsPlayed.forEach(c => {
      const idx = player.hand.findIndex(h => h.id === c.id);
      if(idx!==-1) player.hand.splice(idx,1);
      this.discardPile.push(c);
    });

    // Draw
    this.drawCard(playerId, 5 - player.hand.length);

    // Score Check
    const score = this.queensAwake[playerId].reduce((a,b)=>a+b.value,0);
    const count = this.queensAwake[playerId].length;
    player.score = score;
    
    if (score >= 50 || count >= 5) {
      this.winnerId = playerId;
      this.lastMessage = `GAME OVER! ${player.name} WINS!`;
    } else {
      this.lastMessage = message;
      if (!this.pendingRoseWake && !extraTurn) this.nextTurn();
    }
  }

  getState() {
    return {
      id: this.id,
      started: this.started,
      lastMessage: this.lastMessage,
      turnPlayerId: this.turnPlayerId,
      winnerId: this.winnerId,
      pendingRoseWake: this.pendingRoseWake,
      discardPile: this.discardPile.slice(-1), // Only top
      queensSleeping: this.queensSleeping,
      players: Object.values(this.players).map(p => ({
        ...p,
        queensAwake: this.queensAwake[p.id] || []
      })),
      deckSize: this.deck.length
    };
  }
}

// ------------------------------------------------------------------
// SINGLE DECLARATION OF MOCK SERVER
// ------------------------------------------------------------------
const mockServer = new MockGameEngine();

// ==========================================
// 3. CSS STYLES
// ==========================================
const styles = `
/* Global Reset */
* { box-sizing: border-box; }
body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow-x: hidden; }

/* Fix #root to take full screen so background works properly */
#root {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  text-align: center;
}

/* --- Lobby Styles --- */
.app-background {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #2c3e50 0%, #4a148c 100%); /* Deep Royal Purple Theme */
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
  direction: ltr; /* Force LTR for layout consistency */
}

.lobby-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.4);
  width: 90%;
  max-width: 450px;
  text-align: center;
  border: 3px solid #FFD700;
  position: relative;
  overflow: hidden;
}

.lobby-card::before {
  content: "👑";
  position: absolute;
  top: -20px;
  left: -20px;
  font-size: 100px;
  opacity: 0.1;
  transform: rotate(-30deg);
}

.lobby-title {
  color: #4a148c;
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  text-shadow: 1px 1px 0px rgba(0,0,0,0.1);
}

.lobby-subtitle {
  color: #666;
  margin-bottom: 30px;
  font-size: 1.1rem;
}

.input-group { margin-bottom: 15px; text-align: left; }
.input-label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; font-size: 0.9rem; }
.styled-input { width: 100%; padding: 14px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 16px; transition: all 0.3s; background: #f9f9f9; }
.styled-input:focus { border-color: #4a148c; background: #fff; outline: none; box-shadow: 0 0 0 3px rgba(74, 20, 140, 0.1); }

.action-btn { width: 100%; padding: 14px; border: none; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; transition: transform 0.1s, box-shadow 0.2s; margin-bottom: 10px; }
.action-btn:active { transform: scale(0.98); }
.btn-create { background: linear-gradient(45deg, #FFD700, #FFA000); color: #3e2723; box-shadow: 0 4px 15px rgba(255, 160, 0, 0.3); }
.btn-join { background: linear-gradient(45deg, #9C27B0, #673AB7); color: white; box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3); }

/* --- AI Buttons --- */
.btn-advisor { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4); margin-left: 10px; }
.btn-bard { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #880e4f; padding: 4px 10px; border-radius: 6px; font-size: 12px; border: 1px solid #ffc1e3; cursor: pointer; display: flex; align-items: center; gap: 5px; margin-left: 10px; }
.btn-spy { background: #333; color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 1px solid #666; cursor: pointer; position: absolute; top: -5px; right: -5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 20; }

.divider { display: flex; align-items: center; text-align: center; color: #888; margin: 20px 0; font-size: 0.9rem; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #ddd; }
.divider::before { margin-right: 10px; }
.divider::after { margin-left: 10px; }

.room-id-display { background: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px dashed #2196F3; margin-bottom: 20px; color: #0d47a1; }

/* --- Game Layout Styles --- */
.game-layout { 
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #2c3e50 0%, #4a148c 100%);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  direction: ltr;
}

.game-board {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  text-align: center;
  border: 2px solid #FFD700;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-left: auto;
  margin-right: auto;
}

/* --- Internal Game Elements --- */
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
.header h2 { margin: 0; color: #4a148c; }

.start-btn { background-color: #4CAF50; color: white; padding: 10px 20px; font-size: 16px; cursor: pointer; border: none; border-radius: 8px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }

.opponents { display: flex; justify-content: center; gap: 15px; background: #f5f5f5; padding: 15px; border-radius: 12px; flex-wrap: wrap; margin-bottom: 25px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
.opponent-card { border: 1px solid #ddd; padding: 10px 15px; background: white; min-width: 120px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); position: relative; }
.opponent-card h4 { margin: 0 0 5px 0; color: #333; }

.table-center { display: flex; justify-content: space-around; align-items: flex-start; padding: 25px; background-color: #e8f5e9; border-radius: 15px; min-height: 180px; flex-wrap: wrap; gap: 30px; margin-bottom: 25px; border: 1px solid #c8e6c9; }

.my-area { border: 2px solid #e0e0e0; padding: 25px; border-radius: 15px; background: #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.active-turn { border-color: #2196F3; box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); background-color: #fafdff; }

.card-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 15px; }

.playing-card { width: 85px; height: 120px; border: 1px solid #bbb; border-radius: 10px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: white; cursor: pointer; transition: all 0.2s; padding: 5px; box-shadow: 2px 4px 8px rgba(0,0,0,0.15); position: relative; user-select: none; }
.playing-card:hover:not(:disabled) { transform: translateY(-8px); z-index: 10; box-shadow: 0 8px 15px rgba(0,0,0,0.2); }

.hand-card { font-weight: bold; }
.card-label { font-size: 11px; font-weight: bold; text-transform: uppercase; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; margin-top: 2px; }
.card-emoji { font-size: 42px; line-height: 1; }
.card-bottom-value { font-size: 18px; font-weight: bold; align-self: flex-end; margin-right: 4px; margin-bottom: 2px; }

.card-back { width: 65px; height: 90px; background: linear-gradient(135deg, #673AB7, #512DA8); color: white; display: flex; justify-content: center; align-items: center; border-radius: 8px; border: 2px solid white; cursor: pointer; font-weight: bold; font-size: 14px; text-align: center; padding: 2px; line-height: 1.2; box-shadow: 0 2px 5px rgba(0,0,0,0.2); } 
.queen { border-color: #B8860B; background-color: #fffde7; }

.error { color: #d32f2f; font-weight: bold; margin-top: 10px; }
.selected-card { border: 3px solid #2196F3; background-color: #e3f2fd; transform: translateY(-12px) !important; box-shadow: 0 10px 20px rgba(33, 150, 243, 0.4); }
.clickable-target { cursor: pointer; box-shadow: 0 0 15px #FFD700; animation: pulse 1.5s infinite; border-color: #FFD700; }
.message-bar { display: flex; align-items: center; justify-content: center; gap: 10px; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; padding: 25px; border-radius: 16px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.4); border: 2px solid #764ba2; position: relative; }
.advisor-text { font-style: italic; color: #4a148c; line-height: 1.6; margin: 15px 0; background: #f3e5f5; padding: 15px; border-radius: 8px; direction: rtl; }
.close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666; }

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
.empty-slot { width: 85px; height: 120px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 10px; background: rgba(0,0,0,0.02); }
`;

const API_URL = 'http://127.0.0.1:5000';

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================
const getCardVisual = (card) => {
  if (!card) return { emoji: '', color: '#fff', label: '' };
  switch (card.type) {
    case 'king': return { emoji: '🤴', color: '#FFF8E1', label: 'King', icon: Crown };
    case 'knight': return { emoji: '⚔️', color: '#ECEFF1', label: 'Knight', icon: Sword };
    case 'potion': return { emoji: '🧪', color: '#E8F5E9', label: 'Potion', icon: FlaskConical };
    case 'dragon': return { emoji: '🐉', color: '#FFEBEE', label: 'Dragon', icon: Shield };
    case 'wand': return { emoji: '🪄', color: '#F3E5F5', label: 'Wand', icon: Wand2 };
    case 'jester': return { emoji: '🃏', color: '#FFF3E0', label: 'Jester', icon: Sparkles };
    case 'number': return { emoji: card.value, color: '#E3F2FD', label: 'Number', icon: null };
    case 'queen':
       let emoji = '👸';
       if (card.name.includes('Rose')) emoji = '🌹';
       else if (card.name.includes('Dog')) emoji = '🐶';
       else if (card.name.includes('Cat')) emoji = '🐱';
       else if (card.name.includes('Sun')) emoji = '☀️';
       else if (card.name.includes('Moon')) emoji = '🌙';
       else if (card.name.includes('Heart')) emoji = '❤️';
       else if (card.name.includes('Star')) emoji = '⭐';
       return { emoji, color: '#FCE4EC', label: card.name.replace(' Queen', ''), icon: Crown };
    default: return { emoji: '?', color: '#eee', label: card.type };
  }
};

export default function App() {
  const [view, setView] = useState('lobby'); // 'lobby' or 'game'
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  
  // Selection State
  const [selectedCardIds, setSelectedCardIds] = useState([]);

  // AI State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiType, setAiType] = useState(''); // 'advisor', 'lore', 'bard', 'spy'

  // --- API Calls ---

  const createGame = async () => {
    if (USE_MOCK_API) {
      mockServer.reset();
      const p = mockServer.addPlayer(playerName || "Player");
      mockServer.addPlayer("CPU"); 
      setRoomId(mockServer.id);
      setPlayerId(p.playerId);
      setGameState(mockServer.getState());
      setView('game');
    } else {
      try {
        const res = await fetch(`${API_URL}/rooms`, { method: 'POST' });
        const data = await res.json();
        setRoomId(data.roomId);
        setError('');
      } catch (err) {
        setError('Failed to create game');
      }
    }
  };

  const joinGame = async () => {
    if (!roomId || !playerName) {
      setError('Must provide Room ID and Name');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ name: playerName }),
      });
      if (!res.ok) throw new Error('Room not found');
      
      const data = await res.json();
      setPlayerId(data.playerId);
      setView('game');
      fetchGameState(); 
    } catch (err) {
      setError('Failed to join room');
    }
  };

  const startGame = async () => {
    if (USE_MOCK_API) {
      try {
        setGameState(mockServer.startGame());
      } catch(e) { setError(e.message); }
    } else {
      try {
        const res = await fetch(`${API_URL}/rooms/${roomId}/start`, { method: 'POST' });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setGameState(data);
      } catch (err) {
        setError('Failed to start game');
      }
    }
  };

  const fetchGameState = async () => {
    if (USE_MOCK_API) { setGameState(mockServer.getState()); return; }
    if (!roomId) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${roomId}`);
      const data = await res.json();
      setGameState(data);
    } catch (err) {
      console.error('Error fetching state', err);
    }
  };

  const playMove = async (targetId = null) => {
    if (selectedCardIds.length === 0 && !gameState.pendingRoseWake) return;

    try {
      if (USE_MOCK_API) {
        const effectiveCardIds = (gameState.pendingRoseWake && selectedCardIds.length === 0)
          ? [] 
          : selectedCardIds;

        setGameState(mockServer.playCard(playerId, effectiveCardIds, targetId));
        setSelectedCardIds([]);
        // CPU Turn
        if (!gameState.winnerId) {
           setTimeout(() => {
              mockServer.cpuAutoPlay();
              setGameState(mockServer.getState());
           }, 1500);
        }
      } else {
        const effectiveCardIds = (gameState.pendingRoseWake && selectedCardIds.length === 0)
          ? ['rose-bonus-action'] 
          : selectedCardIds;

        const res = await fetch(`${API_URL}/rooms/${roomId}/play`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
              playerId, 
              cardIds: effectiveCardIds, 
              targetCardId: targetId 
          }),
        });
        const data = await res.json();
        
        if (data.error) alert(data.error);
        else {
          setGameState(data);
          setSelectedCardIds([]); 
        }
      }
    } catch (err) {
      alert(err.message || 'Error playing cards');
    }
  };

  // --- GEMINI ACTIONS ---

  const askAdvisor = async () => {
    setAiType('advisor');
    setAiModalOpen(true);
    setAiLoading(true);
    
    const myHand = gameState.players.find(p=>p.id===playerId).hand.map(c=>`${c.type} ${c.value||''}`).join(', ');
    const queensSleeping = gameState.queensSleeping.length;
    const opponentStatus = gameState.players.filter(p=>p.id!==playerId).map(p=>`${p.name} has ${p.queensAwake.length} queens`).join(', ');
    
    const prompt = `
      אתה היועץ המלכותי במשחק מלכות ישנות. דבר כמו יועץ חכם מימי הביניים בעברית. היה תמציתי (מקסימום 2 משפטים).
      
      המצב הנוכחי:
      היד שלי: [${myHand}]
      מלכות ישנות שנותרו: ${queensSleeping}
      יריבים: ${opponentStatus}
      
      כללים:
      - מלכים מעירים מלכות ישנות.
      - אבירים גונבים מלכות מיריב (דרקון חוסם אביר).
      - שיקויים מרדימים מלכות של יריב (שרביט חוסם שיקוי).
      - ליצנים נותנים סיכוי לקבל קלף או להעיר מלכה.
      - מספרים מאפשרים להשליך קלפים כדי לשלוף חדשים. כללים למספרים:
         1. השלך מספר בודד.
         2. השלך זוג מספרים זהים.
         3. השלך שלושה קלפים ומעלה שיוצרים משוואת חיבור (למשל 2, 3, 5 כי 2+3=5).
      
      יעץ לי על המהלך הטוב ביותר בהתבסס על היד שלי. תן עדיפות להערת מלכות או גניבה אם אפשר. 
      אם יש לי רק מספרים, בדוק במפורש אם יש זוגות או משוואות חיבור והצע להשליך כמה שיותר קלפים.
    `;

    const response = await callGemini(prompt);
    setAiContent(response);
    setAiLoading(false);
  };

  const askLore = async (cardName) => {
    setAiType('lore');
    setAiModalOpen(true);
    setAiLoading(true);
    const prompt = `כתוב סיפור רקע אגדי, קצר (1-2 משפטים) ושובב בעברית עבור "${cardName}" בממלכת המלכות הישנות. עשה זאת קסום ומהנה.`;
    const response = await callGemini(prompt);
    setAiContent(response);
    setAiLoading(false);
  };

  const askBard = async () => {
    setAiType('bard');
    setAiModalOpen(true);
    setAiLoading(true);
    const prompt = `כתוב חמשיר קצר או חרוז (2 שורות) בעברית המסכם את אירוע המשחק הזה בסגנון פייטן מימי הביניים מצחיק: "${gameState.lastMessage}".`;
    const response = await callGemini(prompt);
    setAiContent(response);
    setAiLoading(false);
  };

  const spyOnOpponent = async (opp) => {
    setAiType('spy');
    setAiModalOpen(true);
    setAiLoading(true);
    const prompt = `
      אתה מרגל טקטי. נתח את היריב הזה במשחק מלכות ישנות:
      שם: ${opp.name}
      ניקוד: ${opp.score} נקודות
      מלכות ערות: ${opp.queensAwake.map(q=>q.name).join(', ') || 'אין'}
      גודל יד: ${opp.hand.length} קלפים.
      
      תן הערכה טקטית שנונה וקצרה (משפט אחד) בעברית על רמת האיום שלהם.
    `;
    const response = await callGemini(prompt);
    setAiContent(response);
    setAiLoading(false);
  };


  // --- Polling ---
  useEffect(() => {
    if (view === 'game') {
      const interval = setInterval(fetchGameState, 2000);
      return () => clearInterval(interval);
    }
  }, [view, roomId]);


  // --- Event Handlers ---

  const handleHandClick = (card) => {
    const isMyTurn = gameState?.turnPlayerId === playerId;
    if (!isMyTurn) return;

    const myHand = gameState.players.find(p => p.id === playerId)?.hand || [];
    const isNumber = card.type === 'number';
    
    const hasNumbersSelected = selectedCardIds.some(id => {
       const c = myHand.find(h => h.id === id);
       return c && c.type === 'number';
    });
    
    if (selectedCardIds.length > 0) {
        if (isNumber && !hasNumbersSelected) {
            alert("Cannot mix numbers and special cards");
            return;
        }
        if (!isNumber && hasNumbersSelected) {
            alert("Cannot mix numbers and special cards");
            return;
        }
        if (!isNumber) {
             if (selectedCardIds.includes(card.id)) {
                 setSelectedCardIds([]); 
             } else {
                 setSelectedCardIds([card.id]); 
             }
             return;
        }
    }

    if (selectedCardIds.includes(card.id)) {
      setSelectedCardIds(selectedCardIds.filter(id => id !== card.id));
    } else {
      setSelectedCardIds([...selectedCardIds, card.id]);
    }
  };

  const handleQueenClick = (queen) => {
    const isMyTurn = gameState?.turnPlayerId === playerId;
    if (isMyTurn && selectedCardIds.length === 1) {
        const myHand = gameState.players.find(p => p.id === playerId)?.hand;
        const card = myHand.find(c => c.id === selectedCardIds[0]);
        if (card && card.type === 'king') {
            playMove(queen.id);
        }
    }
    if (isMyTurn && gameState.pendingRoseWake) {
        playMove(queen.id);
    }
  };

  const handleOpponentQueenClick = (queen) => {
    const isMyTurn = gameState?.turnPlayerId === playerId;
    
    if (isMyTurn && selectedCardIds.length === 1) {
       const myHand = gameState.players.find(p => p.id === playerId)?.hand;
       const card = myHand.find(c => c.id === selectedCardIds[0]);
       
       if (card && (card.type === 'knight' || card.type === 'potion')) {
           playMove(queen.id);
       }
    }
  };

  // --- Render Views ---

  // 1. Lobby View
  if (view === 'lobby') {
    return (
      <div className="app-background">
        <style>{styles}</style>
        <div className="lobby-card">
          <h1 className="lobby-title">Sleeping Queens</h1>
          <p className="lobby-subtitle">Card Game</p>
          <div style={{marginBottom: 20, fontSize: 12, background: '#e3f2fd', padding: 8, borderRadius: 5}}>
             {USE_MOCK_API ? "✅ Mock Mode Enabled (Play instantly vs CPU)" : "ℹ️ Backend Mode (Requires Python Server)"}
          </div>
          
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input 
              className="styled-input"
              placeholder="Enter your name..." 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)} 
            />
          </div>

          <div className="divider">Create a New Game</div>

          <button className="action-btn btn-create" onClick={createGame}>
            Create New Room 🎲
          </button>

          {roomId && !playerId && (
            <div className="room-id-display">
               <strong>Room ID:</strong> {roomId}
               <br/>
               <small>(Share this ID with friends)</small>
            </div>
          )}

          <div className="divider">OR Join Existing</div>

          <div className="input-group">
            <label className="input-label">Room ID</label>
            <input 
              className="styled-input"
              placeholder="Paste Room ID here..." 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)} 
            />
          </div>

          <button className="action-btn btn-join" onClick={joinGame}>
            Join Room 🚀
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }
  
  // Guard Clause
  if (!gameState) return (
    <div className="app-background">
        <style>{styles}</style>
        <div style={{color: 'white', fontSize: '24px'}}>Loading game state...</div>
    </div>
  );

  // 2. Victory View
  if (gameState.winnerId) {
    const winnerName = gameState.players.find(p => p.id === gameState.winnerId)?.name;
    return (
      <div className="app-background">
        <style>{styles}</style>
        <div className="lobby-card">
            <h1 style={{color: 'gold', fontSize: '3rem', margin: 0}}>🏆</h1>
            <h2 className="lobby-title" style={{marginTop: '10px'}}>GAME OVER</h2>
            <h3>Winner: {winnerName}</h3>
            <p>Congratulations!</p>
            <button className="action-btn btn-create" onClick={() => window.location.reload()}>
                Play Again
            </button>
        </div>
      </div>
    );
  }

  // 3. Main Game View
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.turnPlayerId === playerId;

  const selectedType = selectedCardIds.length > 0 
      ? myPlayer?.hand.find(c => c.id === selectedCardIds[0])?.type 
      : null;

  const targetSleeping = isMyTurn && (selectedType === 'king' || gameState.pendingRoseWake);
  const targetAwake = isMyTurn && (selectedType === 'knight' || selectedType === 'potion');

  return (
    <div className="game-layout">
      <style>{styles}</style>
      
      {/* New Game Board Container */}
      <div className="game-board">
      
          <div className="header">
            <h2>Room: {gameState.id.slice(0, 8)}...</h2>
            <div className="status">
              {gameState.started ? (
                <span style={{ color: isMyTurn ? '#4CAF50' : '#D32F2F', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {isMyTurn ? "🟢 IT'S YOUR TURN!" : `🔴 Waiting for ${gameState.players.find(p=>p.id===gameState.turnPlayerId)?.name}...`}
                </span>
              ) : (
                <button onClick={startGame} className="start-btn">START GAME</button>
              )}
            </div>
          </div>

          {/* System Messages */}
          {gameState.lastMessage && (
            <div style={{
              backgroundColor: '#e3f2fd', 
              color: '#0d47a1', 
              padding: '12px', 
              margin: '10px 0',
              borderLeft: '5px solid #2196F3',
              borderRadius: '4px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span><strong>Last Action:</strong> {gameState.lastMessage}</span>
              <button className="btn-bard" onClick={askBard} title="שיר!">
                 <Music size={12} /> שיר!
              </button>
            </div>
          )}

          {/* Opponents Area */}
          <div className="opponents">
            {gameState.players.filter(p => p.id !== playerId).map(p => (
              <div key={p.id} className="opponent-card">
                <h4>{p.name}</h4>
                <button className="btn-spy" onClick={() => spyOnOpponent(p)} title="רגל אחרי היריב"><Eye size={12}/></button>
                <div style={{fontSize: '0.9rem', color: '#666'}}>
                    Cards: <strong>{p.hand.length}</strong> | Score: <strong>{p.score}</strong>
                </div>
                
                <div className="card-row" style={{transform: 'scale(0.85)', marginTop: '5px'}}> 
                  {p.queensAwake.map(q => {
                    const visual = getCardVisual(q);
                    return (
                      <div 
                        key={q.id} 
                        className={`playing-card queen ${selectedType === 'knight' || selectedType === 'potion' ? 'clickable-target' : ''}`}
                        onClick={() => handleOpponentQueenClick(q)}
                        title={`Value: ${q.value}`}
                        style={{backgroundColor: visual.color}}
                      >
                        <div className="card-label">{visual.label}</div>
                        <div className="card-emoji">{visual.emoji}</div>
                        <div className="card-bottom-value">{q.value}</div>
                      </div>
                    );
                  })}
                  {p.queensAwake.length === 0 && <span style={{fontSize: '12px', color: '#999', marginTop: '10px'}}>No Queens</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Center Table */}
          <div className="table-center">
            <div className="sleeping-queens">
              <h3>
                Sleeping Queens ({gameState.queensSleeping.length})
                {selectedType === 'king' && <span style={{color: '#d32f2f', fontSize: '0.8em', marginLeft: '10px'}}> (Select a Queen!)</span>}
                
                {gameState.pendingRoseWake && isMyTurn && (
                    <div style={{color: '#E91E63', fontWeight: 'bold', animation: 'pulse 1s infinite', marginTop: '5px'}}>
                       🌹 ROSE BONUS! Pick another queen! 🌹
                    </div>
                )}
              </h3>
              <div className="card-row">
                {gameState.queensSleeping.map((c) => (
                  <div 
                    key={c.id} 
                    className={`card-back ${(targetSleeping) ? 'clickable-target' : ''}`}
                    onClick={() => handleQueenClick(c)}
                  >
                    <span style={{fontSize: '40px'}}>👸</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="discard-pile">
                <h3>Discard Pile</h3>
                {gameState.discardPile && gameState.discardPile.length > 0 ? (
                    (() => {
                        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
                        const visual = getCardVisual(topCard);
                        return (
                            <div className="playing-card" style={{backgroundColor: visual.color}}>
                                <div className="card-label">{visual.label}</div>
                                <div className="card-emoji">{visual.emoji}</div>
                                <div className="card-bottom-value">{topCard.value || ''}</div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="empty-slot">Empty</div>
                )}
            </div>
          </div>

          {/* My Area */}
          <div className={`my-area ${isMyTurn ? 'active-turn' : ''}`}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <div>
                    <h3>{myPlayer?.name} (You) - Score: {myPlayer?.score}</h3>
                 </div>
                 
                 {/* AI BUTTON */}
                 {gameState.started && (
                    <button className="btn-advisor" onClick={askAdvisor} disabled={!isMyTurn}>
                      <ScrollText size={16} /> ✨ שאל את היועץ המלכותי
                    </button>
                 )}
              </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <div>
                    <h4 style={{margin: '5px 0'}}>My Awake Queens:</h4>
                    <div className="card-row" style={{minHeight: '120px'}}>
                    {myPlayer?.queensAwake.length > 0 ? myPlayer.queensAwake.map(q => {
                        const visual = getCardVisual(q);
                        return (
                        <div 
                           key={q.id} 
                           className="playing-card queen" 
                           style={{backgroundColor: visual.color}}
                           onClick={() => askLore(q.name)}
                           title="Click for Royal Lore!"
                        >
                            <div className="card-label">{visual.label}</div>
                            <div className="card-emoji">{visual.emoji}</div>
                            <div className="card-bottom-value">{q.value}</div>
                        </div>
                        );
                    }) : <span style={{color: '#999', alignSelf: 'center'}}>You have no queens yet</span>}
                    </div>
                </div>

                <div>
                    <h4 style={{margin: '5px 0'}}>My Hand:</h4>
                    <div className="card-row">
                    {myPlayer?.hand.map(card => {
                        const visual = getCardVisual(card);
                        return (
                        <button 
                            key={card.id} 
                            className={`playing-card hand-card ${selectedCardIds.includes(card.id) ? 'selected-card' : ''}`}
                            onClick={() => handleHandClick(card)}
                            disabled={!isMyTurn || !gameState.started}
                            style={{backgroundColor: visual.color}}
                        >
                            <div className="card-label">{visual.label}</div>
                            {visual.icon ? <visual.icon size={24} /> : <div style={{fontSize:28}}>{visual.emoji}</div>}
                            <div className="card-bottom-value">{card.value || ''}</div>
                        </button>
                        );
                    })}
                    </div>
                </div>
            </div>
            
            <div style={{marginTop: '20px', height: '50px'}}>
              {selectedCardIds.length > 0 && (selectedType === 'number' || selectedType === 'jester') && (
                <button onClick={() => playMove(null)} className="start-btn" style={{backgroundColor: '#2196F3', width: '250px'}}>
                  {selectedType === 'jester' ? 'Play Jester 🃏' : 'Play Selected Numbers'}
                </button>
              )}
            </div>

          </div>
      </div>

      {/* AI MODAL */}
      {aiModalOpen && (
          <div className="modal-overlay" onClick={() => setAiModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setAiModalOpen(false)}>×</button>
              
              <h2 style={{color: '#4a148c', display:'flex', alignItems:'center', justifyContent:'center', gap:10}}>
                  {aiType === 'advisor' && <><Sparkles size={24} /> היועץ המלכותי</>}
                  {aiType === 'lore' && <><BookOpen size={24} /> אגדות מלכותיות</>}
                  {aiType === 'bard' && <><Music size={24} /> הפייטן המלכותי</>}
                  {aiType === 'spy' && <><Eye size={24} /> דו"ח ריגול</>}
              </h2>

              {aiLoading ? (
                  <div style={{padding:20}}><Loader2 className="animate-spin" size={32} style={{margin:'0 auto'}}/> מתייעץ עם הקסם...</div>
              ) : (
                  <div className="advisor-text">"{aiContent}"</div>
              )}
            </div>
          </div>
        )}

    </div>
  );
}