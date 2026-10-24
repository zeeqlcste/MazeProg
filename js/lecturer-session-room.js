import { database } from "./firebase-config.js";
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Get PIN from URL Parameter (e.g. lecturer-session-room.html?pin=123456)
const urlParams = new URLSearchParams(window.location.search);
const currentPin = urlParams.get('pin');

if (!currentPin) {
  alert("No Game PIN provided!");
  window.location.href = 'create-game-session.html';
}

// DOM Elements
const lobbyPinDisplay = document.getElementById('lobbyPinDisplay');
const sessionTitleDisplay = document.getElementById('sessionTitleDisplay');
const themeBadge = document.getElementById('themeBadge');
const themeBanner = document.getElementById('themeBanner');
const playersList = document.getElementById('playersList');
const playerCount = document.getElementById('playerCount');
const sessionQuestionsContainer = document.getElementById('sessionQuestionsContainer');
const startGameBtn = document.getElementById('startGameBtn');

// Modal Elements
const addSetModal = document.getElementById('addSetModal');
const openAddQuestionModalBtn = document.getElementById('openAddQuestionModalBtn');
const closeAddSetModalBtn = document.getElementById('closeAddSetModalBtn');
const bankSetsContainer = document.getElementById('bankSetsContainer');
const confirmAddSetsBtn = document.getElementById('confirmAddSetsBtn');

let currentSessionData = {};
let cachedQuestionBank = {};
let activeQuestionList = []; // Merged questions list
let draggedIndex = null; // Menyimpan indeks item yang sedang di-drag
let isCustomized = false; // Elak overwrite jika lecturer dah delete/reorder soalan
let gameStarted = false; // Kenapa game dah mula (status IN_GAME / IN_PROGRESS)
let currentPlayers = null; // Salinan data pemain terkini supaya leaderboard boleh render sekali tukar view

// DOM Elements - Leaderboard
const leaderboardPanel = document.getElementById('leaderboardPanel');
const leaderboardBody = document.getElementById('leaderboardBody');
const leaderboardSummary = document.getElementById('leaderboardSummary');
const lobbyGrid = document.getElementById('lobbyGrid');
const bannerHint = document.getElementById('bannerHint');

if (lobbyPinDisplay) lobbyPinDisplay.textContent = currentPin;

// Theme Visual Styling Helper
const themeStyles = {
  cyberpunk: { bg: 'linear-gradient(135deg, #0f172a, #1e1b4b)', badge: '🌃 Cyberpunk', border: '#a855f7' },
  dungeon: { bg: 'linear-gradient(135deg, #1c1917, #292524)', badge: '🏰 Dungeon', border: '#f97316' },
  galaxy: { bg: 'linear-gradient(135deg, #030712, #0f172a)', badge: '🚀 Space Galaxy', border: '#38bdf8' },
  forest: { bg: 'linear-gradient(135deg, #064e3b, #022c22)', badge: '🌲 Mystic Forest', border: '#10b981' }
};

// 1. LISTEN TO SESSION DATA
const sessionRef = ref(database, `GAME_SESSIONS/${currentPin}`);
onValue(sessionRef, (snapshot) => {
  if (!snapshot.exists()) {
    alert("Session not found!");
    window.location.href = 'create-game-session.html';
    return;
  }

  currentSessionData = snapshot.val();
  if (sessionTitleDisplay) sessionTitleDisplay.textContent = currentSessionData.session_title;

  // Set Theme
  if (currentSessionData.theme) {
    document.body.setAttribute('data-theme', currentSessionData.theme);
  }

  const themeInfo = themeStyles[currentSessionData.theme] || themeStyles.cyberpunk;
  if (themeBadge) themeBadge.textContent = themeInfo.badge;
  if (themeBanner) {
    themeBanner.style.background = themeInfo.bg;
    themeBanner.style.borderColor = themeInfo.border;
  }

  // Tukar paparan lobby / leaderboard mengikut status sesi
  const sessionStatus = currentSessionData.status || 'WAITING';
  toggleGameView(isInGameStatus(sessionStatus));

  // Jika DB sudah ada custom_questions (soalan yang diedit/delete/reorder), utamakan data tersebut
  if (currentSessionData.custom_questions && currentSessionData.custom_questions.length > 0) {
    activeQuestionList = currentSessionData.custom_questions;
    isCustomized = true;
    renderQuestionsList();
  } else {
    loadAndRenderQuestions();
  }
});

// ==========================================
// Leaderboard helpers
// ==========================================
function isInGameStatus(status) {
  return status === 'IN_GAME' || status === 'IN_PROGRESS';
}

function toggleGameView(inGame) {
  gameStarted = inGame;
  if (leaderboardPanel) leaderboardPanel.style.display = inGame ? '' : 'none';
  if (lobbyGrid) lobbyGrid.style.display = inGame ? 'none' : '';

  if (startGameBtn) {
    if (inGame) {
      startGameBtn.textContent = '🟢 Game in Progress';
      startGameBtn.disabled = true;
    } else {
      startGameBtn.textContent = '🚀 START GAME NOW';
      startGameBtn.disabled = false;
    }
  }

  // Kunci pemindahan / padam soalan semasa game berjalan
  document.querySelectorAll('.del-btn').forEach((btn) => {
    btn.disabled = inGame;
    btn.style.opacity = inGame ? '0.5' : '1';
  });

  if (bannerHint) {
    bannerHint.textContent = inGame
      ? 'Game in progress - students are playing now'
      : 'Students are joining using the PIN above.';
  }

  // Paparkan leaderboard dengan data murid yang sudah diketahui apabila tukar ke view game
  if (inGame && currentPlayers && leaderboardBody) {
    renderLeaderboard(currentPlayers);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text === undefined || text === null ? '' : String(text);
  return div.innerHTML;
}

function playerStatus(p) {
  const progress = p.progress || {};
  const status = progress.status || p.status;
  const lastUpdated = Number(progress.last_updated || p.last_updated || 0);
  const now = Date.now();
  const idleMs = now - lastUpdated;

  if (status === 'COMPLETED' || progress.is_completed) return 'finished';
  if (status === 'IN_PROGRESS' || status === 'IN_GAME') {
    if (idleMs > 60000) return 'idle';
    return 'playing';
  }
  return 'waiting';
}

function currentQuestionNum(p) {
  const progress = p.progress || {};
  const current = Number(progress.current_question_index || 0);
  const total = Number(progress.total_questions || activeQuestionList.length || 0);
  if (current > 0 && total > 0) return `${current} / ${total}`;
  if (current > 0) return `Q${current}`;
  return '-';
}

function renderLeaderboard(players) {
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = '';

  const pKeys = players ? Object.keys(players) : [];

  // Summary strip
  let playing = 0, finished = 0, idle = 0, waiting = 0;
  let totalScore = 0;
  pKeys.forEach((key) => {
    const p = players[key];
    const st = playerStatus(p);
    if (st === 'playing') playing++;
    else if (st === 'finished') finished++;
    else if (st === 'idle') idle++;
    else waiting++;
    totalScore += Number(p.score || 0);
  });

  if (leaderboardSummary) {
    const avg = pKeys.length ? Math.round(totalScore / pKeys.length) : 0;
    leaderboardSummary.innerHTML = `
      <span>👥 ${pKeys.length} students</span>
      <span>🟢 ${playing} playing</span>
      <span>⏸️ ${idle} idle</span>
      <span>✅ ${finished} finished</span>
      <span>⭐ Avg score: ${avg}</span>
    `;
  }

  if (pKeys.length === 0) {
    leaderboardBody.innerHTML = '<tr><td class="lb-empty" colspan="8">No students joined yet.</td></tr>';
    return;
  }

  const rows = pKeys.map((key) => {
    const p = players[key];
    const progress = p.progress || {};
    const score = Number(p.score || 0);
    const correct = Number(progress.correct_attempts || 0);
    const totalAttempts = Number(progress.total_attempts || 0);
    const accuracy = totalAttempts ? Math.round((correct / totalAttempts) * 100) : 0;
    const streak = Number(p.bestStreak || p.streak || 0);
    const status = playerStatus(p);
    return {
      key,
      name: p.name || key,
      score,
      correct,
      totalAttempts,
      accuracy,
      streak,
      status,
      qText: currentQuestionNum(p),
      time_taken: Number(progress.time_taken || 0)
    };
  });

  // Sort: score tertinggi dulu, baru correct lebih banyak, baru masa lebih cepat
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.time_taken - b.time_taken;
  });

  const rankEmoji = ['🥇', '🥈', '🥉'];

  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const isTop = idx < 3;
    if (isTop) tr.classList.add('lb-row-top');

    const statusClass =
      row.status === 'finished' ? 'lb-status-finished' :
      row.status === 'playing' ? 'lb-status-playing' :
      row.status === 'idle' ? 'lb-status-idle' : 'lb-status-waiting';

    const qProgress = row.qText;

    tr.innerHTML = `
      <td class="lb-rank">${isTop ? rankEmoji[idx] : idx + 1}</td>
      <td><span style="font-weight: 600;">${escapeHtml(row.name)}</span></td>
      <td><span class="lb-score">${row.score}</span></td>
      <td>${escapeHtml(qProgress)}</td>
      <td>
        <div class="lb-bar"><div style="width: 0%;"></div></div>
        <span class="lb-sub">${qProgress}</span>
      </td>
      <td>${row.accuracy}%</td>
      <td>${row.streak} <span class="lb-sub">🔥</span></td>
      <td><span class="${statusClass}">${escapeHtml(row.status.charAt(0).toUpperCase() + row.status.slice(1))}</span></td>
    `;
    leaderboardBody.appendChild(tr);
  });
}

// 2. LISTEN TO JOINED PLAYERS REAL-TIME
const playersRef = ref(database, `GAME_SESSIONS/${currentPin}/players`);
onValue(playersRef, (snapshot) => {
  const players = snapshot.exists() ? snapshot.val() : null;
  currentPlayers = players;
  const pKeys = players ? Object.keys(players) : [];

  if (playerCount) playerCount.textContent = `${pKeys.length} ${pKeys.length === 1 ? 'Player' : 'Players'}`;

  // Semasa game berjalan, paparkan leaderboard bukan senarai chip menunggu
  if (gameStarted) {
    renderLeaderboard(players);
    return;
  }

  if (!playersList) return;
  playersList.innerHTML = '';
  if (players) {
    pKeys.forEach((key) => {
      const p = players[key];
      const pBadge = document.createElement('div');
      pBadge.className = 'session-player-chip';
      pBadge.style.cssText = "background: #0f172a; border: 1px solid #38bdf8; color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;";
      pBadge.textContent = `🎮 ${p.name || key}`;
      playersList.appendChild(pBadge);
    });
  } else {
    playersList.innerHTML = '<p style="color: #64748b; font-size: 13px;">Waiting for students to join...</p>';
  }
});

// 3. FETCH QUESTION BANK & BUILD MERGED QUESTIONS LIST
const bankRef = ref(database, 'QUESTIONS');
onValue(bankRef, (snapshot) => {
  if (snapshot.exists()) {
    cachedQuestionBank = snapshot.val();
    if (!isCustomized) {
      loadAndRenderQuestions();
    }
  }
});

function loadAndRenderQuestions() {
  if (!currentSessionData.question_set_ids || !cachedQuestionBank) return;

  // Jika soalan belum disunting secara manual, jana senarai daripada set IDs
  if (activeQuestionList.length === 0 && !isCustomized) {
    currentSessionData.question_set_ids.forEach((setId) => {
      const qSet = cachedQuestionBank[setId];
      if (qSet && qSet.items) {
        Object.keys(qSet.items).forEach((itemKey) => {
          activeQuestionList.push({
            setId: setId,
            itemKey: itemKey,
            data: qSet.items[itemKey]
          });
        });
      }
    });
  }

  renderQuestionsList();
}

// FUNGSI KHAS: KEMAS KINI DB BILA DELETE / REORDER / ADD SET
async function syncQuestionsToDB() {
  try {
    await update(ref(database, `GAME_SESSIONS/${currentPin}`), {
      custom_questions: activeQuestionList
    });
  } catch (err) {
    console.error("Ralat mengemaskini Database:", err);
  }
}

// 4. RENDER QUESTION LIST DENGAN FUNGSI DRAG & DROP
function renderQuestionsList() {
  if (!sessionQuestionsContainer) return;
  sessionQuestionsContainer.innerHTML = '';

  if (activeQuestionList.length === 0) {
    sessionQuestionsContainer.innerHTML = '<p style="color: #64748b; font-size: 13px;">No questions selected. Add some!</p>';
    return;
  }

  activeQuestionList.forEach((qObj, index) => {
    const item = qObj.data;
    const card = document.createElement('div');
    card.className = 'session-question-row';
    
    // Dayakan draggable pada elemen
    card.draggable = true;
    card.dataset.index = index;
    card.style.cssText = "background: #0f172a; padding: 12px; border-radius: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: grab; user-select: none; transition: background 0.2s, border-color 0.2s; margin-bottom: 8px;";

    let titleText = item.question_text || item.instruction || `Code Snippet (Line ${item.bug_line})`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
        <span style="color: #64748b; font-size: 16px; cursor: grab;">☰</span>
        <div>
          <span class="session-question-mechanism">${String(item.mechanism || item.type || 'mcq').replace(/_/g, ' ')}</span>
          <div style="font-size: 13px; color: #fff; margin-top: 4px; font-weight: 500;">
            <strong>Q${index + 1}:</strong> ${titleText}
          </div>
        </div>
      </div>

      <button class="del-btn" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">Delete</button>
    `;

    // --- EVENT LISTENERS DRAG & DROP ---
    card.addEventListener('dragstart', (e) => {
      if (gameStarted) return;
      draggedIndex = index;
      card.style.opacity = '0.5';
      card.style.border = '1px dashed #38bdf8';
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      card.style.border = '1px solid #334155';
      draggedIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.style.background = '#1e293b';
      card.style.borderColor = '#38bdf8';
    });

    card.addEventListener('dragleave', () => {
      card.style.background = '#0f172a';
      card.style.borderColor = '#334155';
    });

    card.addEventListener('drop', (e) => {
      if (gameStarted) return;
      e.preventDefault();
      card.style.background = '#0f172a';
      card.style.borderColor = '#334155';

      const targetIndex = parseInt(card.dataset.index);

      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        // Alihkan item dalam array
        const draggedItem = activeQuestionList.splice(draggedIndex, 1)[0];
        activeQuestionList.splice(targetIndex, 0, draggedItem);

        // Render semula senarai & simpan ke DB
        isCustomized = true;
        renderQuestionsList();
        syncQuestionsToDB();
      }
    });

    // Delete Question
    card.querySelector('.del-btn').onclick = (e) => {
      e.stopPropagation();
      removeQuestion(index);
    };

    sessionQuestionsContainer.appendChild(card);
  });
}

function removeQuestion(index) {
  if (gameStarted) return;
  activeQuestionList.splice(index, 1);
  isCustomized = true;
  renderQuestionsList();
  syncQuestionsToDB();
}

// 5. ADD EXTRA QUESTION SETS MODAL
if (openAddQuestionModalBtn) {
  openAddQuestionModalBtn.onclick = () => {
    if (gameStarted) return;
    bankSetsContainer.innerHTML = '';
    Object.keys(cachedQuestionBank).forEach((setId) => {
      const set = cachedQuestionBank[setId];
      const div = document.createElement('div');
      div.style.cssText = "margin-bottom: 8px; display: flex; gap: 8px; align-items: center;";
      div.innerHTML = `
        <input type="checkbox" value="${setId}" class="add-set-cb" style="accent-color: #38bdf8;">
        <label style="font-size: 13px; color: #fff;">${set.title} (${Object.keys(set.items || {}).length} Qs)</label>
      `;
      bankSetsContainer.appendChild(div);
    });
    addSetModal.style.display = "flex";
  };
}

if (closeAddSetModalBtn) {
  closeAddSetModalBtn.onclick = () => addSetModal.style.display = "none";
}

if (confirmAddSetsBtn) {
  confirmAddSetsBtn.onclick = async () => {
    if (gameStarted) return;
    const checked = document.querySelectorAll('.add-set-cb:checked');
    const newSetIds = Array.from(checked).map(cb => cb.value);

    if (newSetIds.length > 0) {
      newSetIds.forEach((setId) => {
        const qSet = cachedQuestionBank[setId];
        if (qSet && qSet.items) {
          Object.keys(qSet.items).forEach((itemKey) => {
            activeQuestionList.push({
              setId: setId,
              itemKey: itemKey,
              data: qSet.items[itemKey]
            });
          });
        }
      });

      isCustomized = true;
      renderQuestionsList();
      await syncQuestionsToDB();
      
      if (addSetModal) addSetModal.style.display = "none";
    }
  };
}

// 6. START GAME (Termasuk session_type = "game")
if (startGameBtn) {
  startGameBtn.onclick = async () => {
    if (activeQuestionList.length === 0) {
      alert("Sila masukkan sekurang-kurangnya satu soalan!");
      return;
    }

    try {
      // Update status, session_type, dan compiled_questions
      await update(ref(database, `GAME_SESSIONS/${currentPin}`), {
        status: "IN_GAME",
        session_type: "game",
        compiled_questions: activeQuestionList
      });

      alert("Game Started! Students are entering the game field.");
    } catch (err) {
      console.error("Ralat semasa memulakan game:", err);
      alert("Gagal memulakan game. Sila cuba lagi.");
    }
  };
}