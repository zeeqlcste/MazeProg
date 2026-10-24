import { database } from "./firebase-config.js";
import { ref, get, update, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderMCQ } from "./mechanisms/mcq-mechanism.js";
import { renderBugSniper } from "./mechanisms/bug-mechanism.js";
import { renderDragDrop } from "./mechanisms/dragdrop-mechanism.js";
import { renderCatchCollect } from "./mechanisms/catch-mechanism.js";

const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
const userId = currentUser ? (currentUser.user_id || currentUser.uid || currentUser.id) : null;

if (!currentUser || !userId || currentUser.role !== 'student') {
  window.location.href = 'login.html';
}

const TOPIC = sessionStorage.getItem('selfPracticeTopic') || 'C++';
const DIFFICULTY = sessionStorage.getItem('selfPracticeDifficulty') || 'easy';
const MECHANISM = sessionStorage.getItem('selfPracticeMechanism') || 'mcq';
const TOTAL_QUESTIONS = 10;

const QUESTION_BANK = {
  'C++': {
    easy: [
      { id: 'cpp_e_1', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'What is the output of `cout << 5 + 3;`?', options: ['53', '8', '5+3', 'Error'], correct_answer: '8', hint: 'The + operator performs arithmetic addition on numbers.' },
      { id: 'cpp_e_2', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'Which header is needed for `cout` and `cin`?', options: ['<iostream>', '<string>', '<vector>', '<algorithm>'], correct_answer: '<iostream>', hint: 'Input-output stream operations live in this header.' },
      { id: 'cpp_e_3', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'What is the correct way to declare an integer variable x?', options: ['int x;', 'integer x;', 'var x;', 'number x;'], correct_answer: 'int x;', hint: 'C++ uses int for integer variables.' },
      { id: 'cpp_e_4', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'Which symbol starts a single-line comment in C++?', options: ['//', '/*', '#', '--'], correct_answer: '//', hint: 'Two forward slashes comment out the rest of the line.' },
      { id: 'cpp_e_5', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'What is the size of an `int` on most modern systems?', options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'], correct_answer: '4 bytes', hint: 'A typical int is 32 bits.' },
      { id: 'cpp_e_6', topic: 'C++', difficulty: 'easy', type: 'mcq', question: 'Which loop runs at least once?', options: ['for', 'while', 'do-while', 'foreach'], correct_answer: 'do-while', hint: 'The condition is checked after the body executes.' }
    ],
    medium: [
      { id: 'cpp_m_1', topic: 'C++', difficulty: 'medium', type: 'mcq', question: 'What does `std::vector` provide?', options: ['Fixed-size array', 'Dynamic array', 'Linked list', 'Hash map'], correct_answer: 'Dynamic array', hint: 'It can grow and shrink at runtime.' },
      { id: 'cpp_m_2', topic: 'C++', difficulty: 'medium', type: 'mcq', question: 'Which keyword is used for inheritance?', options: ['extends', 'inherits', ':', '->'], correct_answer: ':', hint: 'The colon introduces the base class in the class head.' },
      { id: 'cpp_m_3', topic: 'C++', difficulty: 'medium', type: 'mcq', question: 'What is a pointer?', options: ['A variable that stores a memory address', 'A function', 'A class', 'A constant'], correct_answer: 'A variable that stores a memory address', hint: 'It points to where data lives in memory.' },
      { id: 'cpp_m_4', topic: 'C++', difficulty: 'medium', type: 'bug', question: 'Find and fix the bug in this code:', code_snippet: 'int x = 10;\nif (x = 5) {\n  cout << "Hello";\n}', bug_line: 2, correct_fix: 'if (x == 5)', hint: 'A single = assigns; == compares.' },
      { id: 'cpp_m_5', topic: 'C++', difficulty: 'medium', type: 'dragdrop', question: 'Arrange the lines to swap two variables a and b using temp:', options: ['int temp = a;', 'a = b;', 'b = temp;'], correct_order: ['int temp = a;', 'a = b;', 'b = temp;'], hint: 'Save a first, then copy b to a, then temp to b.' },
      { id: 'cpp_m_6', topic: 'C++', difficulty: 'medium', type: 'catch', question: 'Catch only the valid C++ keywords:', correct_items: ['int', 'return', 'while', 'class'], wrong_items: ['print', 'console', 'main', 'function'], hint: 'Print, console, and function are not C++ keywords.' }
    ],
    hard: [
      { id: 'cpp_h_1', topic: 'C++', difficulty: 'hard', type: 'mcq', question: 'What is RAII?', options: ['Resource Acquisition Is Initialization', 'Run All Instances Immediately', 'Random Access Iterator', 'None'], correct_answer: 'Resource Acquisition Is Initialization', hint: 'Resources are tied to object lifetime.' },
      { id: 'cpp_h_2', topic: 'C++', difficulty: 'hard', type: 'mcq', question: 'What does `std::move` do?', options: ['Copies an object', 'Casts to an rvalue reference', 'Deletes an object', 'Sorts a container'], correct_answer: 'Casts to an rvalue reference', hint: 'It enables move semantics.' },
      { id: 'cpp_h_3', topic: 'C++', difficulty: 'hard', type: 'bug', question: 'Find and fix the bug:', code_snippet: 'int* ptr = new int(5);\ndelete ptr;\ncout << *ptr;', bug_line: 4, correct_fix: 'cout << *ptr; // use before delete, or set ptr = nullptr', hint: 'Accessing memory after delete is undefined behavior.' },
      { id: 'cpp_h_4', topic: 'C++', difficulty: 'hard', type: 'dragdrop', question: 'Order the steps of a constructor call:', options: ['Allocate memory', 'Initialize members', 'Run constructor body'], correct_order: ['Allocate memory', 'Initialize members', 'Run constructor body'], hint: 'Memory must exist before members can be initialized.' }
    ]
  },
  'Python': {
    easy: [
      { id: 'py_e_1', topic: 'Python', difficulty: 'easy', type: 'mcq', question: 'What is the output of `print(3 + 2 * 2)`?', options: ['10', '7', '9', 'Error'], correct_answer: '7', hint: 'Multiplication happens before addition.' },
      { id: 'py_e_2', topic: 'Python', difficulty: 'easy', type: 'mcq', question: 'Which keyword defines a function in Python?', options: ['func', 'def', 'function', 'define'], correct_answer: 'def', hint: 'Short for define.' }
    ],
    medium: [
      { id: 'py_m_1', topic: 'Python', difficulty: 'medium', type: 'mcq', question: 'Which of these is a mutable type?', options: ['tuple', 'string', 'list', 'int'], correct_answer: 'list', hint: 'Lists can be changed after creation.' },
      { id: 'py_m_2', topic: 'Python', difficulty: 'medium', type: 'bug', question: 'Find and fix the bug:', code_snippet: 'for i in range(5)\n    print(i)', bug_line: 1, correct_fix: 'for i in range(5):', hint: 'Python for loops need a colon at the end.' }
    ],
    hard: []
  },
  'JavaScript': {
    easy: [
      { id: 'js_e_1', topic: 'JavaScript', difficulty: 'easy', type: 'mcq', question: 'What is `typeof []` in JavaScript?', options: ['array', 'object', 'null', 'function'], correct_answer: 'object', hint: 'Arrays are objects in JS.' }
    ],
    medium: [],
    hard: []
  },
  'Java': { easy: [], medium: [], hard: [] }
};

let questionPool = [];
let currentIndex = 0;
let userScore = 0;
let correctStreak = 0;
let difficultyTarget = { easy: 0, medium: 1, hard: 2 }[DIFFICULTY] || 0;
let currentQuestion = null;
let isAnswerLocked = false;
let attempts = 0;
let correct = 0;
let wrong = 0;

const topicLabel = document.getElementById('practiceTopic');
const title = document.getElementById('practiceTitle');
const evidence = document.getElementById('practiceEvidence');
const questionCounter = document.getElementById('questionCounter');
const difficultyLabel = document.getElementById('difficultyLabel');
const streakLabel = document.getElementById('streakLabel');
const practiceProgress = document.querySelector('.practice-progress');
const practiceProgressBar = document.getElementById('practiceProgressBar');
const practiceProgressText = document.getElementById('practiceProgressText');
const questionTitle = document.getElementById('practiceQuestion');
const codeBlock = document.getElementById('practiceCode');
const mechanismContainer = document.getElementById('practiceMechanism');
const hintBox = document.getElementById('practiceHint');
const feedback = document.getElementById('practiceFeedback');
const adaptiveMessage = document.getElementById('adaptiveMessage');
const continueButton = document.getElementById('continuePractice');
const summary = document.getElementById('practiceSummary');
const backBtn = document.getElementById('backToDashboard');

topicLabel.textContent = TOPIC.toUpperCase();
title.textContent = `Self Practice — ${TOPIC}`;
evidence.textContent = `Topic: ${TOPIC} · Level: ${DIFFICULTY.charAt(0).toUpperCase() + DIFFICULTY.slice(1)} · Mechanism: ${MECHANISM.toUpperCase()}`;

backBtn.addEventListener('click', () => {
  window.location.href = 'student-dashboard.html';
});
continueButton.addEventListener('click', loadNextQuestion);

function difficultyName(rank) {
  return ['Easy', 'Medium', 'Hard'][Math.max(0, Math.min(2, rank))];
}

function getQuestionsFor(topic, difficulty, mech, count) {
  const levels = difficulty === 'mixed' ? ['easy', 'medium', 'hard'] : [difficulty];
  let pool = [];
  levels.forEach(lvl => {
    (QUESTION_BANK[topic]?.[lvl] || []).forEach(q => {
      if (!mech || q.type === mech) pool.push({ ...q });
    });
  });
  pool.sort(() => Math.random() - 0.5);
  return pool.slice(0, count);
}

function updateProgress() {
  const percent = TOTAL_QUESTIONS ? Math.round((attempts / TOTAL_QUESTIONS) * 100) : 0;
  practiceProgressBar.style.width = `${percent}%`;
  practiceProgress.setAttribute('aria-valuenow', String(percent));
  practiceProgressText.textContent = `${attempts} of ${TOTAL_QUESTIONS} questions completed`;
  questionCounter.textContent = `Question ${Math.min(attempts + 1, TOTAL_QUESTIONS)} of ${TOTAL_QUESTIONS}`;
  difficultyLabel.textContent = `Difficulty: ${difficultyName(difficultyTarget)}`;
  streakLabel.textContent = `Correct streak: ${correctStreak}`;
}

function renderMechanism(q) {
  mechanismContainer.replaceChildren();
  hintBox.hidden = true;
  hintBox.textContent = '';
  feedback.textContent = '';
  isAnswerLocked = false;
  if (q.hint) {
    hintBox.textContent = '💡 Hint: ' + q.hint;
    hintBox.hidden = false;
  }
  if (q.type === 'mcq') {
    renderMCQ(mechanismContainer, q, onAnswer);
  } else if (q.type === 'bug') {
    renderBugSniper(mechanismContainer, q, onAnswer);
  } else if (q.type === 'dragdrop') {
    renderDragDrop(mechanismContainer, q, onAnswer);
  } else if (q.type === 'catch') {
    renderCatchCollect(mechanismContainer, q, onAnswer);
  }
}

function onAnswer(isCorrect, selectedLine, selectedFix, extra) {
  if (isAnswerLocked) return;
  isAnswerLocked = true;
  attempts++;
  if (isCorrect) {
    correct++;
    correctStreak++;
    feedback.textContent = 'Correct. Well done!';
    feedback.className = 'practice-feedback correct';
  } else {
    wrong++;
    correctStreak = 0;
    feedback.textContent = 'Not quite. Review the hint and continue.';
    feedback.className = 'practice-feedback incorrect';
  }
  if (correctStreak >= 2 && difficultyTarget < 2) {
    difficultyTarget++;
    adaptiveMessage.textContent = `Level up! Now targeting ${difficultyName(difficultyTarget)}.`;
    correctStreak = 0;
  } else if (!isCorrect && difficultyTarget > 0) {
    difficultyTarget--;
    adaptiveMessage.textContent = `Reviewing ${difficultyName(difficultyTarget)} concepts.`;
  }
  updateProgress();
  continueButton.hidden = false;
  continueButton.textContent = attempts < TOTAL_QUESTIONS ? 'Next Question' : 'View Results';
  mechanismContainer.querySelectorAll('button').forEach(b => b.disabled = true);
}

async function saveFinalResult() {
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const now = Date.now();
  const sessionId = `self_${now}`;
  try {
    await set(ref(database, `SELF_PRACTICE/${userId}/${sessionId}`), {
      topic: TOPIC, difficulty: DIFFICULTY, mechanism: MECHANISM,
      attempts, correct, wrong, accuracy, score: userScore,
      completed_at: now, created_at: now
    });
    const topicRef = ref(database, `SELF_PRACTICE_TOPICS/${userId}/${TOPIC}`);
    const snap = await get(topicRef);
    const prev = snap.exists() ? snap.val() : { attempts: 0, correct: 0 };
    await set(topicRef, {
      topic: TOPIC,
      attempts: Number(prev.attempts) + attempts,
      correct: Number(prev.correct) + correct,
      last_practiced: now
    });
  } catch (err) {
    console.error('Ralat simpan self-practice:', err);
  }
}

function showSummary() {
  mechanismContainer.replaceChildren();
  continueButton.hidden = true;
  hintBox.hidden = true;
  feedback.textContent = '';
  adaptiveMessage.textContent = '';
  summary.hidden = false;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  summary.innerHTML = `
    <h2 style="color:#10b981;">✅ Latihan Selesai</h2>
    <p><strong>Topik:</strong> ${TOPIC}</p>
    <p><strong>Tingkat:</strong> ${difficultyName(difficultyTarget)}</p>
    <p><strong>Betul:</strong> ${correct} &nbsp;|&nbsp; <strong>Salah:</strong> ${wrong}</p>
    <p><strong>Kepersamaan:</strong> ${accuracy}%</p>
    <p style="margin-top:12px;">Progress telah disimpan kepada profil anda.</p>
    <button onclick="window.location.href='student-dashboard.html'" class="btn btn-primary" style="margin-top:10px;">Kembali Dashboard</button>
  `;
}

function loadNextQuestion() {
  if (attempts >= TOTAL_QUESTIONS) {
    showSummary();
    saveFinalResult();
    return;
  }
  if (questionPool.length === 0) {
    questionPool = getQuestionsFor(TOPIC, DIFFICULTY, MECHANISM, TOTAL_QUESTIONS);
  }
  currentQuestion = questionPool.shift();
  codeBlock.hidden = true;
  codeBlock.textContent = '';
  if (currentQuestion.code_snippet) {
    codeBlock.hidden = false;
    codeBlock.textContent = currentQuestion.code_snippet;
  }
  questionTitle.textContent = currentQuestion.question;
  isAnswerLocked = false;
  feedback.textContent = '';
  adaptiveMessage.textContent = '';
  continueButton.hidden = true;
  renderMechanism(currentQuestion);
  updateProgress();
}

questionPool = getQuestionsFor(TOPIC, DIFFICULTY, MECHANISM, TOTAL_QUESTIONS);
loadNextQuestion();