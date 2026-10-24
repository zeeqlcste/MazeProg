import { database } from "./firebase-config.js";
import { ref, get, update, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
const userId = currentUser ? (currentUser.user_id || currentUser.uid || currentUser.id) : null;

if (!currentUser || !userId || currentUser.role !== 'student') {
  window.location.href = 'login.html';
}

const backBtn = document.getElementById('backToDashboard');
const startBtn = document.getElementById('startSelfPractice');
const selectTopic = document.getElementById('selectTopic');
const selectDifficulty = document.getElementById('selectDifficulty');
const mechCards = document.querySelectorAll('.mech-card');

let selectedMech = 'mcq';

backBtn.addEventListener('click', () => {
  window.location.href = 'student-dashboard.html';
});

// Mechanism card selection UI
mechCards.forEach(card => {
  card.addEventListener('click', () => {
    mechCards.forEach(c => {
      c.classList.remove('selected');
      c.querySelector('input').checked = false;
    });
    card.classList.add('selected');
    card.querySelector('input').checked = true;
    selectedMech = card.dataset.mech;
  });
});

startBtn.addEventListener('click', () => {
  const topic = selectTopic.value;
  const difficulty = selectDifficulty.value;
  const mech = selectedMech;

  // Save selection to sessionStorage for the practice session page
  sessionStorage.setItem('selfPracticeTopic', topic);
  sessionStorage.setItem('selfPracticeDifficulty', difficulty);
  sessionStorage.setItem('selfPracticeMechanism', mech);

  window.location.href = 'student-self-practice-session.html';
});