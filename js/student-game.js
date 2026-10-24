import { database } from "./firebase-config.js";
import { ref, onValue, update, get, runTransaction, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// IMPORT MECHANISM FILES
import { renderMCQ } from "./mechanisms/mcq-mechanism.js";
import { renderBugSniper as renderFindBug } from "./mechanisms/bug-mechanism.js";
import { renderDragDrop as renderRearrange } from "./mechanisms/dragdrop-mechanism.js";
import { renderCatchCollect } from "./mechanisms/catch-mechanism.js";

const urlParams = new URLSearchParams(window.location.search);
const currentPin = urlParams.get('pin');
const userString = localStorage.getItem('loggedInUser');
const currentUser = userString ? JSON.parse(userString) : null;
const userId = currentUser ? (currentUser.user_id || currentUser.uid || currentUser.id) : null;

if (!currentPin || !currentUser || !userId) {
  alert("Sesi tidak sah.");
  window.location.href = 'student-dashboard.html';
}

// DOM ELEMENTS
const mechBadge = document.getElementById('mechBadge');
const questionProgress = document.getElementById('questionProgress');
const scoreDisplay = document.getElementById('scoreDisplay');
const questionTitle = document.getElementById('questionTitle');
const questionCodeBlock = document.getElementById('questionCodeBlock');
const mechanismContainer = document.getElementById('mechanismContainer');
const feedbackBox = document.getElementById('feedbackBox');
const questionTimerText = document.getElementById('questionTimerText');
const questionTimerBar = document.getElementById('questionTimerBar');

const MECHANISM_RULES = {
  mcq: { label: 'MCQ', minTime: 20, maxTime: 30, defaultTime: 25, basePoints: 100 },
  tf: { label: 'MCQ', minTime: 20, maxTime: 30, defaultTime: 25, basePoints: 100 },
  drag_drop: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  dragdrop: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  rearrange: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  parsons: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  blank: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  fitb: { label: 'DRAG & DROP', minTime: 45, maxTime: 60, defaultTime: 50, basePoints: 150 },
  bug: { label: 'BUG SNIPER', minTime: 60, maxTime: 90, defaultTime: 75, basePoints: 200 },
  bug_sniper: { label: 'BUG SNIPER', minTime: 60, maxTime: 90, defaultTime: 75, basePoints: 200 },
  catch: { label: 'CATCH & COLLECT', minTime: 30, maxTime: 45, defaultTime: 35, basePoints: 10, perItem: true },
  catch_collect: { label: 'CATCH & COLLECT', minTime: 30, maxTime: 45, defaultTime: 35, basePoints: 10, perItem: true }
};

// PEMBOLEHUBAH PERMAINAN
let compiledQuestions = [];
let currentIndex = 0;
let userScore = 0;
let currentStreak = 0; // Streak sedang berjalan
let maxStreak = 0; // Streak tertinggi dalam sesi ini
let isSessionLoaded = false; // Elak soalan di-reset setiap kali DB kemaskini
let currentMechanism = 'mcq';
let currentTimeLimit = 0;
let timeLeft = 0;
let timerInterval = null;
let resultLocked = false;
let currentQuestionObject = null;
let sessionStartedAt = Date.now();
let questionStartedAt = Date.now();
let currentSessionMeta = {};

// LISTEN DB
const sessionRef = ref(database, `GAME_SESSIONS/${currentPin}`);
onValue(sessionRef, async (snapshot) => {
  if (!snapshot.exists()) {
    alert("Sesi ditamatkan.");
    window.location.href = 'student-dashboard.html';
    return;
  }

  const sessionData = snapshot.val();
  if (sessionData.compiled_questions && sessionData.compiled_questions.length > 0) {
    compiledQuestions = sessionData.compiled_questions;
    currentSessionMeta = {
      owner_id: sessionData.owner_id || '',
      session_title: sessionData.session_title || ''
    };
    
    // Hanya muat sekali sahaja pada permulaan
    if (!isSessionLoaded) {
      isSessionLoaded = true;
      const player = sessionData.players?.[userId];
      userScore = Number(player?.score) || 0;
      currentStreak = Number(player?.streak) || 0;
      maxStreak = Number(player?.bestStreak || player?.maxStreak || 0);
      scoreDisplay.textContent = `Score: ${userScore}`;
      await initializeStudentProgress(player);
      scoreDisplay.textContent = `Score: ${userScore}`;
      loadQuestion(currentIndex);
    }
  }
});

function loadQuestion(index) {
  stopQuestionTimer();
  if (index >= compiledQuestions.length) {
    finishGame();
    return;
  }

  feedbackBox.style.display = 'none';
  mechanismContainer.innerHTML = '';

  const currentQObj = compiledQuestions[index];
  const qData = currentQObj.data || currentQObj;
  const mechanism = normalizeMechanism(qData.mechanism || qData.type || 'mcq');
  const rules = getMechanismRules(mechanism);
  currentMechanism = mechanism;
  currentQuestionObject = currentQObj;
  questionStartedAt = Date.now();
  currentTimeLimit = Math.min(rules.maxTime, Math.max(rules.minTime, Number(qData.time_limit) || rules.defaultTime));
  timeLeft = currentTimeLimit;
  resultLocked = false;

  questionProgress.textContent = `Soalan ${index + 1} / ${compiledQuestions.length}`;
  mechBadge.textContent = getMechanismLabel(mechanism);
  questionTitle.textContent = qData.question_text || qData.instruction || qData.question_template || "Selesaikan soalan di bawah:";

  if (qData.code_snippet) {
    questionCodeBlock.style.display = 'block';
    questionCodeBlock.textContent = qData.code_snippet;
  } else {
    questionCodeBlock.style.display = 'none';
  }

  // CALLBACK UNTUK HANDLE JAWAPAN
  const handleAnswerSubmit = (isCorrect, _timeLeft, _timeLimit, extra = {}) => {
    handleMechanismResult(isCorrect, extra);
  };

  startQuestionTimer();
  updateCurrentQuestionProgress(index);

  // ROUTER: CALL MECHANISM BERDASARKAN JENIS
  try {
    switch (mechanism) {
      case 'mcq':
      case 'tf':
        renderMCQ(mechanismContainer, qData, handleAnswerSubmit);
        break;

      case 'bug':
      case 'bug_sniper':
        renderFindBug(mechanismContainer, qData, handleAnswerSubmit);
        break;

      case 'drag_drop':
      case 'dragdrop':
      case 'rearrange':
      case 'parsons':
      case 'blank':
      case 'fitb':
        renderRearrange(mechanismContainer, qData, handleAnswerSubmit);
        break;

      case 'catch_collect':
      case 'catch':
        renderCatchCollect(mechanismContainer, qData, handleAnswerSubmit);
        break;

      default:
        renderMCQ(mechanismContainer, qData, handleAnswerSubmit);
    }
  } catch (err) {
    console.error("Ralat memuatkan mekanisme:", err);
    mechanismContainer.innerHTML = `<p style="color: #ef4444; text-align: center;">Gagal memuatkan komponen soalan ini.</p>`;
  }
}

// FORMAT BADGE
function getMechanismLabel(mech) {
  return getMechanismRules(normalizeMechanism(mech)).label;
}

function normalizeMechanism(mech) {
  return String(mech || 'mcq').toLowerCase().replace(/\s+/g, '_');
}

function getMechanismRules(mech) {
  return MECHANISM_RULES[mech] || MECHANISM_RULES.mcq;
}

function startQuestionTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateTimerDisplay();
    if (timeLeft === 0) {
      stopQuestionTimer();
      processResult(false, { timedOut: true });
    }
  }, 1000);
}

function stopQuestionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  questionTimerText.textContent = `${timeLeft}s`;
  const percentage = (timeLeft / currentTimeLimit) * 100;
  questionTimerBar.style.width = `${percentage}%`;
  questionTimerBar.style.backgroundColor = percentage <= 25 ? '#ef4444' : percentage <= 50 ? '#f59e0b' : '#10b981';
}

function handleMechanismResult(isCorrect, extra = {}) {
  if (resultLocked) return;

  if (extra.itemAttempt) {
    recordProgressAttempt(isCorrect, extra, { countAttempt: true });
    if (!isCorrect && !extra.noPenalty) applyWrongAnswerPenalty(extra, false);
    return;
  }

  if (extra.penaltyOnly) {
    applyWrongAnswerPenalty(extra);
    return;
  }

  if (extra.roundComplete) {
    processResult(isCorrect, extra);
    return;
  }

  if (!isCorrect) {
    applyWrongAnswerPenalty(extra);
    return;
  }

  processResult(true, extra);
}

function applyWrongAnswerPenalty(extra = {}, recordAttempt = true) {
  if (resultLocked) return;
  currentStreak = 0;
  if (recordAttempt) recordProgressAttempt(false, extra, { countAttempt: true });
  timeLeft = Math.max(0, timeLeft - 5);
  feedbackBox.style.display = 'block';
  feedbackBox.className = 'feedback-box feedback-wrong';
  feedbackBox.textContent = timeLeft > 0
    ? '❌ Jawapan salah! Masa ditolak 5 saat. Cuba lagi.'
    : '❌ Masa tamat. Markah untuk soalan ini: 0.';
  updateTimerDisplay();

  if (timeLeft === 0) {
    stopQuestionTimer();
    processResult(false, { timedOut: true });
  }
}

// PROSES MARKAH, STREAK, SPEED BONUS & PENYIMPANAN
async function processResult(isCorrect, extra = {}) {
  if (resultLocked) return;
  resultLocked = true;
  stopQuestionTimer();
  feedbackBox.style.display = 'block';

  const rules = getMechanismRules(currentMechanism);
  let earnedPoints = 0;
  let speedBonus = 0;

  const canEarnPoints = !extra.timedOut && (isCorrect || (rules.perItem && extra.roundComplete));
  if (canEarnPoints) {
    if (isCorrect) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    const correctCount = rules.perItem ? Math.max(0, Number(extra.correctCount) || 0) : 1;
    const basePoints = rules.basePoints * correctCount;
    const timeRatio = currentTimeLimit > 0 ? timeLeft / currentTimeLimit : 0;
    speedBonus = timeRatio >= 0.75 ? Math.round(basePoints * 0.5)
      : timeRatio >= 0.5 ? Math.round(basePoints * 0.25)
        : 0;
    const multiplier = currentStreak >= 5 ? 2 : currentStreak >= 3 ? 1.5 : currentStreak >= 2 ? 1.2 : 1;
    earnedPoints = Math.round((basePoints + speedBonus) * multiplier);
    userScore += earnedPoints;

    scoreDisplay.textContent = `Score: ${userScore}`;
    feedbackBox.className = isCorrect ? 'feedback-box feedback-correct' : 'feedback-box feedback-wrong';

    const streakText = currentStreak > 1 ? ` 🔥 ${currentStreak}x STREAK!` : '';
    const bonusText = speedBonus > 0 ? ` ⚡ +${speedBonus} Speed` : '';
    feedbackBox.textContent = isCorrect
      ? `✅ JAWAPAN BETUL! (+${earnedPoints} PTS)${bonusText}${streakText}`
      : `Pusingan tamat. ${correctCount} item betul (+${earnedPoints} PTS).`;
  } else {
    currentStreak = 0;
    feedbackBox.className = 'feedback-box feedback-wrong';
    feedbackBox.textContent = '⏱️ MASA TAMAT! 0 mata untuk soalan ini.';
  }

  recordProgressAttempt(isCorrect && !extra.timedOut, extra, {
    countAttempt: !extra.roundComplete,
    completeQuestion: true,
    timedOut: Boolean(extra.timedOut),
    earnedPoints
  });

  // Kemaskini data Realtime ke Firebase
  try {
    await update(ref(database, `GAME_SESSIONS/${currentPin}/players/${userId}`), {
      score: userScore,
      streak: currentStreak,
      bestStreak: maxStreak,
      last_updated: Date.now()
    });
  } catch (err) {
    console.error("Ralat simpan markah:", err);
  }

  setTimeout(() => {
    currentIndex++;
    loadQuestion(currentIndex);
  }, 1500);
}

async function initializeStudentProgress(player) {
  const progressRef = ref(database, `PLAYER_PROGRESS/${userId}`);
  const sessionProgressRef = ref(database, `PLAYER_PROGRESS/${userId}/sessions/${currentPin}`);
  const snapshot = await get(sessionProgressRef);
  const savedProgress = snapshot.val() || {};
  sessionStartedAt = Number(savedProgress.started_at) || Date.now();
  const completedQuestions = savedProgress.completed_question_ids || {};
  const firstIncompleteIndex = compiledQuestions.findIndex((question, index) => {
    const questionData = question.data || question;
    const questionId = question.itemKey || questionData.question_id || `question_${index + 1}`;
    return !completedQuestions[`${question.setId || 'set'}_${questionId}`];
  });
  currentIndex = firstIncompleteIndex === -1 ? compiledQuestions.length : firstIncompleteIndex;
  const playerScore = Number(player?.score);
  const playerStreak = Number(player?.streak);
  const playerBestStreak = Number(player?.bestStreak || player?.maxStreak || 0);
  userScore = Number.isFinite(playerScore) ? playerScore : Number(savedProgress.score) || 0;
  currentStreak = Number.isFinite(playerStreak) ? playerStreak : Number(savedProgress.streak) || 0;
  maxStreak = playerBestStreak > 0 ? playerBestStreak : maxStreak;
  scoreDisplay.textContent = `Score: ${userScore}`;

  await update(progressRef, {
    user_id: userId,
    name: currentUser.name || currentUser.username || 'Student',
    email: currentUser.email || '',
    [`sessions/${currentPin}/session_pin`]: currentPin,
    [`sessions/${currentPin}/owner_id`]: currentSessionMeta.owner_id,
    [`sessions/${currentPin}/session_title`]: currentSessionMeta.session_title,
    [`sessions/${currentPin}/status`]: 'IN_PROGRESS',
    [`sessions/${currentPin}/started_at`]: sessionStartedAt,
    [`sessions/${currentPin}/last_updated`]: Date.now(),
    [`sessions/${currentPin}/total_questions`]: compiledQuestions.length,
    [`sessions/${currentPin}/is_completed`]: false
  });
}

async function recordProgressAttempt(isCorrect, extra = {}, options = {}) {
  const eventId = createEventId();
  const qData = currentQuestionObject?.data || currentQuestionObject || {};
  const topic = qData.topic || 'General';
  const topicKey = topic.replace(/[^a-zA-Z0-9_-]/g, '_');
  const questionId = currentQuestionObject?.itemKey || qData.question_id || `question_${currentIndex + 1}`;
  const questionKey = `${currentQuestionObject?.setId || 'set'}_${questionId}`;
  const sessionProgressRef = ref(database, `PLAYER_PROGRESS/${userId}`);
  const now = Date.now();
  const countAttempt = options.countAttempt !== false;
  const event = {
    event_id: eventId,
    user_id: userId,
    session_pin: currentPin,
    set_id: currentQuestionObject?.setId || '',
    question_id: questionId,
    topic,
    mechanism: currentMechanism,
    is_correct: Boolean(isCorrect),
    answer: extra.submittedAnswer ?? extra.selectedAnswer ?? null,
    timed_out: Boolean(options.timedOut),
    elapsed_seconds: Math.max(0, Math.floor((now - questionStartedAt) / 1000)),
    timestamp: now
  };

  try {
    const transaction = await runTransaction(sessionProgressRef, (current) => {
      const progress = current || {};
      progress.user_id = userId;
      progress.name = currentUser.name || currentUser.username || 'Student';
      progress.email = currentUser.email || '';
      progress.sessions = progress.sessions || {};
      progress.topics = progress.topics || {};
      progress.totals = progress.totals || {};

      const session = progress.sessions[currentPin] || {
        session_pin: currentPin,
        owner_id: currentSessionMeta.owner_id,
        session_title: currentSessionMeta.session_title
      };
      session.events = session.events || {};
      if (session.events[eventId]) return;
      session.events[eventId] = event;
      session.status = 'IN_PROGRESS';
      session.current_question_index = currentIndex + 1;
      session.total_questions = compiledQuestions.length;
      session.last_updated = now;
      session.time_taken = Math.max(0, Math.floor((now - sessionStartedAt) / 1000));
      session.score = userScore;
      session.streak = currentStreak;
      session.xp = (Number(session.xp) || 0) + (Number(options.earnedPoints) || 0);

      const sessionTopic = session.topics?.[topicKey] || { topic, attempts: 0, correct: 0, wrong: 0 };
      const totalTopic = progress.topics[topicKey] || { topic, attempts: 0, correct: 0, wrong: 0 };
      if (countAttempt) {
        session.total_attempts = (Number(session.total_attempts) || 0) + 1;
        sessionTopic.attempts++;
        totalTopic.attempts++;
        if (isCorrect) {
          session.correct_attempts = (Number(session.correct_attempts) || 0) + 1;
          sessionTopic.correct++;
          progress.totals.correct_attempts = (Number(progress.totals.correct_attempts) || 0) + 1;
          totalTopic.correct++;
        } else {
          session.wrong_attempts = (Number(session.wrong_attempts) || 0) + 1;
          sessionTopic.wrong++;
          progress.totals.wrong_attempts = (Number(progress.totals.wrong_attempts) || 0) + 1;
          totalTopic.wrong++;
        }
        progress.totals.total_attempts = (Number(progress.totals.total_attempts) || 0) + 1;
      }

      session.topics = session.topics || {};
      session.topics[topicKey] = sessionTopic;
      progress.topics[topicKey] = totalTopic;
      if (options.completeQuestion) {
        session.completed_question_ids = session.completed_question_ids || {};
        if (!session.completed_question_ids[questionKey]) {
          session.completed_questions = (Number(session.completed_questions) || 0) + 1;
          session.completed_question_ids[questionKey] = true;
          progress.totals.completed_questions = (Number(progress.totals.completed_questions) || 0) + 1;
        }
      }
      progress.total_xp = (Number(progress.total_xp) || 0) + (Number(options.earnedPoints) || 0);
      session.is_completed = false;
      progress.sessions[currentPin] = session;
      return progress;
    });

    if (!transaction.committed) return;

    if (!isCorrect && countAttempt) {
      await set(ref(database, `MISCONCEPTION_LOGS/${eventId}`), {
        ...event,
        wrong_answer: event.answer ?? (options.timedOut ? 'TIMEOUT' : ''),
        failure_type: options.timedOut ? 'timeout' : 'incorrect_answer'
      });
    }

    const updatedProgress = transaction.snapshot.val();
    const session = updatedProgress.sessions?.[currentPin] || {};
    await update(ref(database, `GAME_SESSIONS/${currentPin}/players/${userId}`), {
      score: userScore,
      streak: currentStreak,
      bestStreak: maxStreak,
      progress: {
        status: session.status || 'IN_PROGRESS',
        current_question_index: session.current_question_index || currentIndex + 1,
        total_questions: session.total_questions || compiledQuestions.length,
        completed_questions: session.completed_questions || 0,
        total_attempts: session.total_attempts || 0,
        correct_attempts: session.correct_attempts || 0,
        wrong_attempts: session.wrong_attempts || 0,
        time_taken: session.time_taken || 0,
        topics: session.topics || {},
        is_completed: Boolean(session.is_completed)
      }
    });
  } catch (err) {
    console.error('Ralat menyimpan progress pelajar:', err);
  }
}

function updateCurrentQuestionProgress(index) {
  const questionIndex = index + 1;
  const timestamp = Date.now();
  const progress = {
    status: 'IN_PROGRESS',
    current_question_index: questionIndex,
    total_questions: compiledQuestions.length,
    is_completed: false,
    last_updated: timestamp
  };
  update(ref(database, `PLAYER_PROGRESS/${userId}/sessions/${currentPin}`), {
    status: progress.status,
    current_question_index: progress.current_question_index,
    total_questions: progress.total_questions,
    is_completed: progress.is_completed,
    last_updated: timestamp
  }).catch((err) => console.error('Ralat mengemaskini posisi progress:', err));
  update(ref(database, `GAME_SESSIONS/${currentPin}/players/${userId}/progress`), progress)
    .catch((err) => console.error('Ralat mengemaskini progress sesi:', err));
}

function createEventId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function markStudentProgressCompleted() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - sessionStartedAt) / 1000));
  const updates = {
    [`sessions/${currentPin}/status`]: 'COMPLETED',
    [`sessions/${currentPin}/is_completed`]: true,
    [`sessions/${currentPin}/completed_at`]: now,
    [`sessions/${currentPin}/time_taken`]: elapsed,
    [`sessions/${currentPin}/score`]: userScore,
    [`sessions/${currentPin}/streak`]: currentStreak,
    [`sessions/${currentPin}/bestStreak`]: maxStreak,
    [`sessions/${currentPin}/last_updated`]: now
  };

  try {
    await update(ref(database, `PLAYER_PROGRESS/${userId}`), updates);
    await update(ref(database, `GAME_SESSIONS/${currentPin}/players/${userId}/progress`), {
      status: 'COMPLETED',
      is_completed: true,
      completed_at: now,
      time_taken: elapsed
    });
  } catch (err) {
    console.error('Ralat menamatkan progress pelajar:', err);
  }
}

function finishGame() {
  markStudentProgressCompleted();
  mechanismContainer.innerHTML = `
    <div style="text-align: center; padding: 30px; background: #0f172a; border-radius: 12px; border: 1px solid #1e293b;">
      <h1 style="color: #10b981;">🎉 GAME COMPLETED!</h1>
      <p style="font-size: 20px; color: #cbd5e1; margin-top: 10px;">Markah Akhir: <strong style="color: #38bdf8;">${userScore} PTS</strong></p>
      <button onclick="window.location.href='student-dashboard.html'" class="btn btn-primary" style="margin-top: 20px; padding: 10px 24px; cursor: pointer;">Dashboard</button>
    </div>
  `;
  feedbackBox.style.display = 'none';
}