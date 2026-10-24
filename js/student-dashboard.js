import { database } from "./firebase-config.js";
import { ref, get, update, child, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM Elements
const sessionPinInput = document.getElementById('sessionPinInput');
const joinSessionBtn = document.getElementById('joinSessionBtn');
const profileBtn = document.getElementById('profileBtn');
const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const topicMasteryList = document.getElementById('topicMasteryList');
const practiceAssignmentList = document.getElementById('practiceAssignmentList');

// 1. SEMAK LOG MASUK PELAJAR
const userString = localStorage.getItem('loggedInUser');
let currentUser = null;
let currentUserId = '';

if (userString) {
  currentUser = JSON.parse(userString);

  // Pastikan user_id wujud (fallback ke uid atau id jika user_id tiada)
  const userId = currentUser.user_id || currentUser.uid || currentUser.id;
  currentUserId = userId;
  if (!userId) {
    alert("Sesi pengguna tidak sah. Sila log masuk semula.");
    localStorage.removeItem('loggedInUser');
    window.location.href = "login.html";
  }

  // Paparkan Nama Pengguna
  const displayName = currentUser.name || currentUser.username || currentUser.email || "Pelajar";
  if (userNameDisplay) userNameDisplay.textContent = displayName;

  // Paparkan Gambar Profil jika ada
  if (userAvatar && currentUser.profile_picture) {
    userAvatar.src = currentUser.profile_picture;
  }
} else {
  alert("Sila log masuk terlebih dahulu!");
  window.location.href = "login.html";
}

// 2. TEKAN PROFIL KELUAR PAGE PROFILE
if (profileBtn) {
  profileBtn.onclick = () => {
    window.location.href = 'student-profile.html';
  };
}

// 3. SEMAK DAN SERTAI SESI GAME (JOIN PIN)
if (joinSessionBtn) {
  joinSessionBtn.addEventListener('click', async () => {
    const inputPin = sessionPinInput.value.trim();

    if (!inputPin) {
      alert("Sila masukkan Session PIN terlebih dahulu!");
      return;
    }

    // Dapatkan ID pengguna yang sah
    const userId = currentUser.user_id || currentUser.uid || currentUser.id;

    try {
      // Dapatkan data sesi daripada Realtime Database
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `GAME_SESSIONS/${inputPin}`));

      if (snapshot.exists()) {
        const sessionData = snapshot.val();

        // Semak status sesi
        if (sessionData.status === "ENDED") {
          alert("Sesi game ini telah pun tamat.");
          return;
        }

        // Daftarkan pelajar ke dalam nod 'players'
        const playerRef = ref(database, `GAME_SESSIONS/${inputPin}/players/${userId}`);
        await update(playerRef, {
          user_id: userId,
          name: currentUser.name || currentUser.username || "Student",
          email: currentUser.email || "",
          joined_at: new Date().toISOString(),
          last_seen_at: Date.now()
        });

        // Hantar pelajar ke Waiting Room bersama Parameter PIN
        window.location.href = `student-waiting-room.html?pin=${inputPin}`;

      } else {
        alert("PIN tidak wujud! Sila semak semula PIN yang diberikan oleh pensyarah anda.");
      }
    } catch (error) {
      console.error("Ralat menyertai sesi:", error);
      alert("Gagal menyertai sesi: " + error.message);
    }
  });
}

// 4. SOLO PRACTICE MODE (SELF PRACTICE)
const startSoloBtn = document.getElementById('startSoloPractice');
if (startSoloBtn) {
  startSoloBtn.addEventListener('click', () => {
    window.location.href = 'student-self-practice.html';
  });
}

if (currentUserId && topicMasteryList) {
  onValue(ref(database, `PLAYER_PROGRESS/${currentUserId}/topics`), (snapshot) => {
    renderTopicMastery(snapshot.val() || {});
  });
}

if (currentUserId && practiceAssignmentList) {
  onValue(ref(database, `PRACTICE_ASSIGNMENTS/${currentUserId}`), (snapshot) => {
    renderPracticeAssignments(snapshot.val() || {});
  });
}

function renderTopicMastery(topics) {
  topicMasteryList.replaceChildren();
  const rows = Object.values(topics).map((stats) => {
    const attempts = Number(stats.attempts) || 0;
    const correct = Number(stats.correct) || 0;
    const accuracy = attempts ? correct / attempts : 0;
    const status = attempts < 3 ? 'Gathering evidence'
      : attempts >= 5 && accuracy >= 0.8 ? 'Mastered'
        : accuracy < 0.6 ? 'Needs practice' : 'Developing';
    return { topic: stats.topic || 'General', attempts, accuracy, status };
  }).sort((a, b) => a.accuracy - b.accuracy);

  if (!rows.length) {
    topicMasteryList.appendChild(createEmptyMessage('Play a game or complete assigned practice to build topic progress.'));
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'topic-mastery-row';
    const title = document.createElement('strong');
    title.textContent = item.topic;
    const details = document.createElement('span');
    details.className = 'mastery-state';
    details.textContent = `${item.status} · ${Math.round(item.accuracy * 100)}% accuracy · ${item.attempts} attempts`;
    row.append(title, details);
    topicMasteryList.appendChild(row);
  });
}

function renderPracticeAssignments(assignments) {
  practiceAssignmentList.replaceChildren();
  const entries = Object.entries(assignments).sort(([, a], [, b]) => Number(b.created_at) - Number(a.created_at));
  if (!entries.length) {
    practiceAssignmentList.appendChild(createEmptyMessage('No practice assigned yet.'));
    return;
  }

  entries.forEach(([assignmentId, assignment]) => {
    const row = document.createElement('div');
    row.className = 'practice-assignment-row';
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${assignment.topic || 'C++'} practice`;
    const evidence = document.createElement('p');
    evidence.className = 'practice-evidence';
    evidence.textContent = assignment.status === 'completed'
      ? `Completed · ${assignment.result?.accuracy_gain >= 0 ? '+' : ''}${assignment.result?.accuracy_gain ?? 0} percentage points learning gain`
      : `${assignment.evidence?.wrong || 0} incorrect of ${assignment.evidence?.attempts || 0} attempts · assigned ${formatAssignmentDate(assignment.created_at)}`;
    content.append(title, evidence);

    const startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'btn btn-primary';
    startButton.textContent = assignment.status === 'completed' ? 'Review results' : 'Start adaptive practice';
    startButton.addEventListener('click', () => {
      window.location.href = `student-practice.html?assignment=${encodeURIComponent(assignmentId)}`;
    });
    row.append(content, startButton);
    practiceAssignmentList.appendChild(row);
  });
}

function createEmptyMessage(message) {
  const element = document.createElement('p');
  element.style.color = '#94a3b8';
  element.textContent = message;
  return element;
}

function formatAssignmentDate(timestamp) {
  return timestamp ? new Date(Number(timestamp)).toLocaleDateString('ms-MY') : 'recently';
}