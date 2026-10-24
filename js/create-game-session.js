import { database } from "./firebase-config.js";
import { ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM Elements
const createSessionForm = document.getElementById('createSessionForm');
const pinDisplay = document.getElementById('pinDisplay');
const reGenPinBtn = document.getElementById('reGenPinBtn');
const activeSessionsList = document.getElementById('activeSessionsList');
const qSetContainer = document.getElementById('qSetContainer');

// Detail Modal Elements
const viewDetailModal = document.getElementById('viewDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailTitle = document.getElementById('detailTitle');
const detailBadge = document.getElementById('detailBadge');
const detailDifficulty = document.getElementById('detailDifficulty');
const detailPublisher = document.getElementById('detailPublisher');
const detailQuestionsList = document.getElementById('detailQuestionsList');

let currentPin = "";
let cachedQuestionBank = {};

// ==========================================
// 0. BACA PENGGUNA DARI LOCALSTORAGE
// ==========================================
const userString = localStorage.getItem('loggedInUser');
let currentUser = null;

if (userString) {
  currentUser = JSON.parse(userString);
  console.log("Pengguna Aktif:", currentUser);
} else {
  alert("Sila log masuk terlebih dahulu!");
  window.location.href = "login.html";
}

// Muatkan sesi secara terus jika user sah
if (currentUser) {
  loadOwnerActiveSessions();
}

// ==========================================
// 1. JANA PIN RAWAK 6-DIGIT
// ==========================================
function generatePIN() {
  currentPin = Math.floor(100000 + Math.random() * 900000).toString();
  if (pinDisplay) pinDisplay.textContent = currentPin;
}
generatePIN();
if (reGenPinBtn) reGenPinBtn.onclick = generatePIN;

if (closeDetailModalBtn) closeDetailModalBtn.onclick = () => viewDetailModal.style.display = "none";
window.onclick = (e) => {
  if (e.target === viewDetailModal) viewDetailModal.style.display = "none";
};

// ==========================================
// 2. DAPATKAN & RENDER QUESTION BANK
// ==========================================
const qBankRef = ref(database, 'QUESTIONS');
onValue(qBankRef, (snapshot) => {
  if (!qSetContainer) return;
  qSetContainer.innerHTML = '';
  
  if (snapshot.exists()) {
    cachedQuestionBank = snapshot.val();
    
    Object.keys(cachedQuestionBank).forEach((key) => {
      const qSet = cachedQuestionBank[key];
      const totalQs = Object.keys(qSet.items || {}).length;

      const itemDiv = document.createElement('div');
      itemDiv.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155; margin-bottom: 8px;";

      itemDiv.innerHTML = `
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; color: #fff; font-size: 13px;">
          <input type="checkbox" name="selected_q_sets" value="${qSet.question_id || key}" style="accent-color: #38bdf8; width: 18px; height: 18px; cursor: pointer;">
          <div>
            <strong style="color: #f8fafc; display: block;">${qSet.title}</strong>
            <small style="color: #94a3b8;">${qSet.topic || 'General'} | ${totalQs} Qs | ${qSet.difficulty || 'Normal'}</small>
          </div>
        </label>
        <button type="button" class="view-set-btn" style="background: #0284c7; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">👁️ Preview</button>
      `;

      itemDiv.querySelector('.view-set-btn').onclick = (e) => {
        e.preventDefault();
        showSetDetails(qSet.question_id || key);
      };

      qSetContainer.appendChild(itemDiv);
    });
  } else {
    qSetContainer.innerHTML = '<p style="color: #64748b; font-size: 12px;">No question sets available in Question Bank.</p>';
  }
});

// ==========================================
// 3. SHOW DETAILS MODAL
// ==========================================
function showSetDetails(setId) {
  const q = cachedQuestionBank[setId];
  if (!q) return;

  if (detailTitle) detailTitle.textContent = q.title || 'Untitled Set';
  if (detailBadge) detailBadge.textContent = q.topic || 'General';
  if (detailDifficulty) detailDifficulty.textContent = q.difficulty || 'Easy';
  if (detailPublisher) detailPublisher.textContent = q.publisher || 'MazeProg System';

  if (detailQuestionsList) {
    detailQuestionsList.innerHTML = '';

    if (q.items) {
      Object.keys(q.items).forEach((itemKey, index) => {
        const item = q.items[itemKey];
        const qDiv = document.createElement('div');
        qDiv.style.cssText = "background: #0f172a; padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #334155; font-size: 13px;";

        const mech = item.mechanism || 'mcq';
        let content = `<strong>${index + 1}. [${mech.toUpperCase()}]</strong> `;

        if (mech === 'mcq') content += `${item.question_text || ''}<br><small style="color: #10b981;">Ans: ${item.correct_answer}</small>`;
        else if (mech === 'drag_drop') content += `${item.instruction || ''}`;
        else if (mech === 'bug_sniper') content += `Fix bug at line ${item.bug_line || '-'}`;
        else if (mech === 'catch_collect') content += `${item.question_text || ''}`;

        qDiv.innerHTML = content;
        detailQuestionsList.appendChild(qDiv);
      });
    }
  }

  if (viewDetailModal) viewDetailModal.style.display = "flex";
}

// ==========================================
// 4. SIMPAN SESI (GAME ATAU WHITEBOARD)
// ==========================================
if (createSessionForm) {
  createSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("Sila log masuk terlebih dahulu!");
      return;
    }

    // Semak Mod yang dipilih oleh lecturer (game / whiteboard)
    const sessionTypeRadio = document.querySelector('input[name="sessionType"]:checked');
    const sessionType = sessionTypeRadio ? sessionTypeRadio.value : 'game';
    const title = document.getElementById('sessionTitle').value;

    let selectedSets = [];
    let theme = "none";

    // Jika Mod Game dipilih, buat semakan Question Sets dan Theme
    if (sessionType === 'game') {
      const checkedBoxes = document.querySelectorAll('input[name="selected_q_sets"]:checked');
      if (checkedBoxes.length === 0) {
        alert("Sila tick sekurang-kurangnya SATU Question Set untuk Game Mode!");
        return;
      }
      selectedSets = Array.from(checkedBoxes).map(cb => cb.value);
      theme = document.getElementById('selectTheme').value;
    }

    const sessionData = {
      game_pin: currentPin,
      session_type: sessionType, // 'game' atau 'whiteboard'
      owner_id: currentUser.user_id,
      owner_name: currentUser.name || '',
      owner_email: currentUser.email || '',
      session_title: title,
      question_set_ids: selectedSets,
      theme: theme,
      status: sessionType === 'whiteboard' ? "WHITEBOARD_ACTIVE" : "WAITING",
      created_at: new Date().toISOString()
    };

    try {
      await set(ref(database, 'GAME_SESSIONS/' + currentPin), sessionData);
      alert(`${sessionType === 'whiteboard' ? 'Whiteboard' : 'Game'} Session Created! PIN: ${currentPin}`);
      
      const launchedPin = currentPin;
      createSessionForm.reset();
      generatePIN();

      // LENCONGKAN LECTURER KE HALAMAN YANG SEPATUTNYA
      if (sessionType === 'whiteboard') {
        window.location.href = `lecturer-whiteboard.html?pin=${launchedPin}`;
      } else {
        window.location.href = `lecturer-session-room.html?pin=${launchedPin}`;
      }

    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}

// ==========================================
// 5. PAPARKAN SESI MILIK LECTURER INI SAHAJA
// ==========================================
function loadOwnerActiveSessions() {
  const sessionsRef = ref(database, 'GAME_SESSIONS');
  onValue(sessionsRef, (snapshot) => {
    if (!activeSessionsList) return;
    activeSessionsList.innerHTML = '';

    if (snapshot.exists()) {
      const sessions = snapshot.val();
      let hasSessions = false;

      Object.keys(sessions).forEach((pin) => {
        const session = sessions[pin];

        if (currentUser && session.owner_id === currentUser.user_id) {
          hasSessions = true;
          const isWhiteboard = session.session_type === 'whiteboard';
          const countSets = session.question_set_ids ? session.question_set_ids.length : 0;

          const card = document.createElement('div');
          card.style.cssText = "background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 10px; gap: 12px;";
          
          card.onmouseover = () => card.style.borderColor = "#38bdf8";
          card.onmouseout = () => card.style.borderColor = "#334155";

          // Lencana Mod (Game vs Whiteboard)
          const modeBadge = isWhiteboard 
            ? `<span style="background: #a855f7; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">🎨 WHITEBOARD</span>`
            : `<span style="background: #0284c7; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">🎮 GAME</span>`;

          const detailsText = isWhiteboard 
            ? `Mode: <span style="color: #a855f7; font-weight: 500;">Interactive Whiteboard</span>`
            : `Theme: <span style="color: #38bdf8; font-weight: 500;">${session.theme}</span> | Selected Sets: <span style="color: #cbd5e1; font-weight: 500;">${countSets} Set(s)</span>`;

          // Struktur Layout Ditingkatkan (Mencegah Teks Terabur/Bertindih)
          card.innerHTML = `
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;">
                <span style="font-size: 18px; font-weight: bold; color: #10b981; background: #0f172a; padding: 3px 10px; border-radius: 6px; letter-spacing: 1px; border: 1px solid #334155;">${session.game_pin}</span>
                <strong style="color: #f8fafc; font-size: 15px; word-break: break-word;">${session.session_title}</strong>
                ${modeBadge}
              </div>
              <div style="font-size: 12px; color: #94a3b8;">
                ${detailsText}
              </div>
            </div>

            <button class="delete-btn" style="background: #ef4444; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; flex-shrink: 0; transition: background 0.2s ease;">Delete</button>
          `;

          // Redirect mengikut jenis mod sesi
          card.onclick = (e) => {
            if (!e.target.classList.contains('delete-btn')) {
              if (isWhiteboard) {
                window.location.href = `lecturer-whiteboard.html?pin=${session.game_pin}`;
              } else {
                window.location.href = `lecturer-session-room.html?pin=${session.game_pin}`;
              }
            }
          };

          // Butang Padam
          card.querySelector('.delete-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Delete Session PIN: ${pin}?`)) {
              await remove(ref(database, 'GAME_SESSIONS/' + pin));
            }
          };

          activeSessionsList.appendChild(card);
        }
      });

      if (!hasSessions) {
        activeSessionsList.innerHTML = '<p style="color: #64748b; font-size: 13px;">No active sessions created by you.</p>';
      }
    } else {
      activeSessionsList.innerHTML = '<p style="color: #64748b; font-size: 13px;">No active sessions.</p>';
    }
  });
}