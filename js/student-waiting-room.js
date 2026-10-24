import { database } from "./firebase-config.js";
import { ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM Elements
const displayPin = document.getElementById('displayPin');
const displayTitle = document.getElementById('displayTitle');
const displayName = document.getElementById('displayName');
const displayTheme = document.getElementById('displayTheme');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

// Audio Elements
const bgMusic = document.getElementById('bgMusic');
const toggleMusicBtn = document.getElementById('toggleMusicBtn');

// Set Volume Latar Lebih Perlahankan (30%)
if (bgMusic) bgMusic.volume = 0.3;

// 0. PENGURUSAN AUDIO BACKGROUND MUSIC
function startAudio() {
  if (bgMusic && bgMusic.paused) {
    bgMusic.play().catch(err => {
      console.log("Autoplay dihalang oleh browser, memerlukan klik user:", err);
    });
  }
}

// Cuba mainkan audio apabila pengguna klik di mana-mana skrin
document.addEventListener('click', startAudio, { once: true });

// Butang Mute / Unmute
if (toggleMusicBtn && bgMusic) {
  toggleMusicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bgMusic.paused) {
      bgMusic.play();
      toggleMusicBtn.innerHTML = "🔊 <span>Music On</span>";
    } else {
      bgMusic.pause();
      toggleMusicBtn.innerHTML = "🔇 <span>Music Off</span>";
    }
  });
}

// 1. DAPATKAN PIN DARI URL PARAMETER
const urlParams = new URLSearchParams(window.location.search);
const currentPin = urlParams.get('pin');

if (!currentPin) {
  alert("No Game PIN provided!");
  window.location.href = 'student-dashboard.html';
}

if (displayPin) displayPin.textContent = currentPin;

// 2. DAPATKAN DATA PELAJAR DARIPADA LOCALSTORAGE
const userString = localStorage.getItem('loggedInUser');
let currentUser = null;

if (userString) {
  currentUser = JSON.parse(userString);
  if (displayName) displayName.textContent = currentUser.name || "Student";
} else {
  alert("Sila log masuk terlebih dahulu!");
  window.location.href = "login.html";
}

// 3. LISTEN DATA SESI DARI FIREBASE REALTIME
const sessionRef = ref(database, `GAME_SESSIONS/${currentPin}`);

onValue(sessionRef, (snapshot) => {
  if (!snapshot.exists()) {
    alert("Sesi game ini telah dipadam atau tidak wujud!");
    if (bgMusic) bgMusic.pause();
    window.location.href = 'student-dashboard.html';
    return;
  }

  const sessionData = snapshot.val();

  if (displayTitle) displayTitle.textContent = sessionData.session_title || "Untitled Session";
  if (displayTheme) displayTheme.textContent = (sessionData.theme || "Standard").toUpperCase();

  // A. REDIRECT AUTOMATIK JIKA LECTURER MULA GAME
  if (sessionData.status === 'IN_GAME' || sessionData.status === 'IN_PROGRESS') {
    if (bgMusic) bgMusic.pause();
    window.location.href = `student-game.html?pin=${currentPin}`;
    return;
  }

  // B. REDIRECT JIKA MOD WHITEBOARD AKTIF
  if (sessionData.status === 'WHITEBOARD_ACTIVE') {
    if (bgMusic) bgMusic.pause();
    window.location.href = `student-whiteboard.html?pin=${currentPin}`;
    return;
  }

  // C. JIKA SESI TAMAT
  if (sessionData.status === "ENDED") {
    if (bgMusic) bgMusic.pause();
    alert("Sesi ini telah tamat.");
    window.location.href = 'student-dashboard.html';
    return;
  }

  console.log("Menunggu pensyarah memulakan sesi...");
});

// 4. LOGIK BUTANG LEAVE ROOM
if (leaveRoomBtn) {
  leaveRoomBtn.addEventListener('click', async () => {
    if (confirm("Adakah anda pasti mahu keluar dari room ini?")) {
      try {
        if (currentUser && currentPin) {
          const playerRef = ref(database, `GAME_SESSIONS/${currentPin}/players/${currentUser.user_id}`);
          await remove(playerRef);
        }
        if (bgMusic) bgMusic.pause();
        window.location.href = 'student-dashboard.html';
      } catch (error) {
        console.error("Ralat semasa keluar dari room:", error);
        window.location.href = 'student-dashboard.html';
      }
    }
  });
}

// 5. LOGIK DRAGGABLE FOR SPOTIFY WIDGET
const widget = document.getElementById("spotifyWidget");
const header = document.getElementById("spotifyWidgetHeader");

if (widget && header) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    widget.style.top = (widget.offsetTop - pos2) + "px";
    widget.style.left = (widget.offsetLeft - pos1) + "px";
    widget.style.right = "auto";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}