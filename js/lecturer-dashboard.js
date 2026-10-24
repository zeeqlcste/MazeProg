import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Navigasi ke Question Bank
const manageQuestionsBtn = document.getElementById('manageQuestionsBtn');
if (manageQuestionsBtn) {
  manageQuestionsBtn.addEventListener('click', () => {
    window.location.href = 'lecturer-question-bank.html';
  });
}

// Navigasi ke Create Game Session (jika ada)
const createSessionBtn = document.getElementById('createSessionBtn');
if (createSessionBtn) {
  createSessionBtn.addEventListener('click', () => {
    window.location.href = 'create-game-session.html';
  });
}

// Navigasi ke Analytics (jika ada)
const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
if (viewAnalyticsBtn) {
  viewAnalyticsBtn.addEventListener('click', () => {
    window.location.href = 'analytics.html';
  });
}

const openDetailedAnalyticsBtn = document.getElementById('openDetailedAnalyticsBtn');
if (openDetailedAnalyticsBtn) {
  openDetailedAnalyticsBtn.addEventListener('click', () => {
    window.location.href = 'analytics.html';
  });
}

const profileBtn = document.getElementById('profileBtn');
const lecturerAvatar = document.getElementById('lecturerAvatar');
const lecturerAvatarFallback = document.getElementById('lecturerAvatarFallback');
const lecturerNameDisplay = document.getElementById('lecturerNameDisplay');
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

if (loggedInUser) {
  const lecturerName = loggedInUser.name || loggedInUser.username || loggedInUser.email || 'Lecturer';
  lecturerNameDisplay.textContent = lecturerName;
  lecturerAvatarFallback.textContent = lecturerName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  if (loggedInUser.profile_picture) {
    lecturerAvatar.src = loggedInUser.profile_picture;
    lecturerAvatar.hidden = false;
    lecturerAvatarFallback.hidden = true;
  }
}

if (profileBtn) {
  profileBtn.addEventListener('click', () => {
    window.location.href = 'lecturer-profile.html';
  });
}

const progressSummary = document.getElementById('progressSummary');
const progressStudentsBody = document.getElementById('progressStudentsBody');
let sessionsData = {};
let progressData = {};

if (loggedInUser && progressSummary && progressStudentsBody) {
  onValue(ref(database, 'GAME_SESSIONS'), (snapshot) => {
    sessionsData = snapshot.val() || {};
    renderProgressOverview();
  }, (error) => showProgressError(error));

  onValue(ref(database, 'PLAYER_PROGRESS'), (snapshot) => {
    progressData = snapshot.val() || {};
    renderProgressOverview();
  }, (error) => showProgressError(error));
}

function renderProgressOverview() {
  const ownedSessions = getOwnedSessionsWithProgress();
  const students = new Map();

  ownedSessions.forEach(([pin, session]) => {
    Object.entries(session.players || {}).forEach(([studentId, player]) => {
      const playerData = player || {};
      const savedProgress = progressData[studentId]?.sessions?.[pin] || playerData.progress;
      const hasProgressData = Boolean(savedProgress);
      const progress = savedProgress || {};
      const student = students.get(studentId) || {
        id: studentId,
        name: playerData.name || progressData[studentId]?.name || studentId,
        attempts: 0,
        correct: 0,
        wrong: 0,
        completed: 0,
        totalQuestions: 0,
        trackedSessionCount: 0,
        sessionCount: 0,
        score: 0,
        lastActivity: 0,
        topics: {}
      };

      student.sessionCount++;
      const activityTimestamp = parseTimestamp(progress.last_updated || progress.started_at || playerData.last_seen_at || session.created_at);
      student.lastActivity = Math.max(student.lastActivity, activityTimestamp);
      if (hasProgressData) {
        student.trackedSessionCount++;
        student.attempts += Number(progress.total_attempts) || 0;
        student.correct += Number(progress.correct_attempts) || 0;
        student.wrong += Number(progress.wrong_attempts) || 0;
        student.completed += Number(progress.completed_questions) || 0;
        student.totalQuestions += Number(progress.total_questions) || (session.compiled_questions || []).length;
      }
      student.score += Number(session.players?.[studentId]?.score ?? progress.score) || 0;
      Object.values(progress.topics || {}).forEach((topicProgress) => {
        const topicName = topicProgress.topic || 'General';
        const topic = student.topics[topicName] || { attempts: 0, correct: 0, wrong: 0 };
        topic.attempts += Number(topicProgress.attempts) || 0;
        topic.correct += Number(topicProgress.correct) || 0;
        topic.wrong += Number(topicProgress.wrong) || 0;
        student.topics[topicName] = topic;
      });

      students.set(studentId, student);
    });
  });

  const rows = [...students.values()].map((student) => {
    const weakTopic = Object.entries(student.topics)
      .map(([topic, stats]) => ({ topic, ...stats, accuracy: stats.attempts ? stats.correct / stats.attempts : 0 }))
      .filter((topic) => topic.attempts >= 3 && topic.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy)[0];
    return { ...student, weakTopic };
  }).sort((a, b) => Number(Boolean(b.weakTopic)) - Number(Boolean(a.weakTopic)) || a.name.localeCompare(b.name));

  const studentsNeedingAttention = rows.filter((student) => student.weakTopic).length;
  progressSummary.textContent = `${rows.length} students · ${studentsNeedingAttention} need attention · ${ownedSessions.length} game sessions`;
  progressStudentsBody.replaceChildren();

  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No student progress yet. Progress appears after students join and answer questions.';
    row.appendChild(cell);
    progressStudentsBody.appendChild(row);
    return;
  }

  rows.slice(0, 8).forEach((student) => {
    const row = document.createElement('tr');
    const studentCell = document.createElement('td');
    studentCell.textContent = student.name;
    const progressCell = document.createElement('td');
    progressCell.textContent = student.trackedSessionCount
      ? `${student.completed}/${student.totalQuestions} questions · ${student.attempts} attempts${student.trackedSessionCount < student.sessionCount ? ` · tracked in ${student.trackedSessionCount}/${student.sessionCount} sessions` : ''}`
      : 'Question-level details not tracked';
    const scoreCell = document.createElement('td');
    scoreCell.textContent = `${student.score} pts`;
    const activityCell = document.createElement('td');
    activityCell.textContent = formatDate(student.lastActivity);
    const recommendationCell = document.createElement('td');
    recommendationCell.className = student.weakTopic ? 'progress-attention' : 'progress-ok';
    recommendationCell.textContent = student.weakTopic
      ? `Review ${student.weakTopic.topic}: ${student.weakTopic.wrong}/${student.weakTopic.attempts} incorrect`
      : !student.trackedSessionCount ? 'No question-level data' : student.attempts >= 3 ? 'No topic flagged' : 'Insufficient data';
    row.append(studentCell, progressCell, scoreCell, activityCell, recommendationCell);
    progressStudentsBody.appendChild(row);
  });
}

function parseTimestamp(value) {
  if (typeof value === 'number') return value;
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }) : 'No date recorded';
}

function showProgressError(error) {
  console.error('Unable to load student progress:', error);
  progressSummary.textContent = 'Progress is unavailable right now.';
}

function getOwnedSessionsWithProgress() {
  const ownedSessions = new Map(Object.entries(sessionsData).filter(([, session]) =>
    session && session.owner_id === loggedInUser.user_id && session.session_type !== 'whiteboard'
  ));

  Object.entries(progressData).forEach(([studentId, studentProgress]) => {
    Object.entries(studentProgress.sessions || {}).forEach(([pin, progress]) => {
      if (progress.owner_id !== loggedInUser.user_id) return;
      if (!ownedSessions.has(pin)) {
        ownedSessions.set(pin, {
          owner_id: progress.owner_id,
          session_title: progress.session_title || `Game ${pin}`,
          session_type: 'game',
          compiled_questions: [],
          players: {}
        });
      }
      const session = ownedSessions.get(pin);
      session.players = session.players || {};
      if (!session.players[studentId]) {
        session.players[studentId] = {
          name: studentProgress.name || studentId,
          score: progress.score || 0,
          progress
        };
      }
    });
  });

  return [...ownedSessions.entries()];
}