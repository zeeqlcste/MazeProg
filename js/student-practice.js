import { database } from "./firebase-config.js";
import { ref, get, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderMCQ } from "./mechanisms/mcq-mechanism.js";
import { renderBugSniper } from "./mechanisms/bug-mechanism.js";
import { renderDragDrop } from "./mechanisms/dragdrop-mechanism.js";
import { renderCatchCollect } from "./mechanisms/catch-mechanism.js";

const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
const userId = currentUser ? (currentUser.user_id || currentUser.uid || currentUser.id) : null;
const assignmentId = new URLSearchParams(window.location.search).get('assignment');
if (!currentUser || !userId || currentUser.role !== 'student' || !assignmentId) {
  window.location.href = currentUser?.role === 'lecturer' ? 'lecturer-dashboard.html' : 'student-dashboard.html';
}

const topicLabel = document.getElementById('practiceTopic');
const title = document.getElementById('practiceTitle');
const evidence = document.getElementById('practiceEvidence');
const questionCounter = document.getElementById('questionCounter');
const difficultyLabel = document.getElementById('difficultyLabel');
const adaptiveTargetLabel = document.getElementById('adaptiveTargetLabel');
const practiceProgress = document.querySelector('.practice-progress');
const practiceProgressBar = document.getElementById('practiceProgressBar');
const practiceProgressText = document.getElementById('practiceProgressText');
const streakLabel = document.getElementById('streakLabel');
const questionTitle = document.getElementById('practiceQuestion');
const codeBlock = document.getElementById('practiceCode');
const mechanismContainer = document.getElementById('practiceMechanism');
const hintBox = document.getElementById('practiceHint');
const feedback = document.getElementById('practiceFeedback');
const adaptiveMessage = document.getElementById('adaptiveMessage');
const continueButton = document.getElementById('continuePractice');
const summary = document.getElementById('practiceSummary');

let assignment;
let topicName;
let topicKey;
let questionPool = [];
let usedQuestionKeys = {};
let baseline = { attempts: 0, correct: 0 };
let correctStreak = 0;
let difficultyTarget = 0;
let currentQuestion;
let currentMechanism = 'mcq';
let isAnswerLocked = false;
let practiceAttempts = 0;
let practiceCorrect = 0;
let practiceWrong = 0;
let totalPracticeQuestions = 0;

document.getElementById('backToStudentDashboard').addEventListener('click', () => {
  window.location.href = 'student-dashboard.html';
});
continueButton.addEventListener('click', loadNextQuestion);

initializePractice().catch((error) => {
  console.error('Unable to load adaptive practice:', error);
  showError(`Practice could not be loaded: ${error.message}`);
});

async function initializePractice() {
  const assignmentRef = ref(database, `PRACTICE_ASSIGNMENTS/${userId}/${assignmentId}`);
  const assignmentSnapshot = await get(assignmentRef);
  if (!assignmentSnapshot.exists()) throw new Error('Assignment not found.');
  assignment = assignmentSnapshot.val();
  if (assignment.student_id !== userId) throw new Error('This assignment belongs to another student.');

  topicName = assignment.topic || 'General';
  topicKey = topicName.replace(/[^a-zA-Z0-9_-]/g, '_');
  topicLabel.textContent = topicName.toUpperCase();
  title.textContent = 'Adaptive Practice';
  evidence.textContent = `${assignment.evidence?.wrong || 0} incorrect of ${assignment.evidence?.attempts || 0} attempts before this practice.`;

  const progressRef = ref(database, `PLAYER_PROGRESS/${userId}`);
  const progressSnapshot = await get(progressRef);
  const progress = progressSnapshot.val() || {};
  const topicProgress = progress.topics?.[topicKey] || { attempts: 0, correct: 0 };
  baseline = assignment.baseline || {
    attempts: Number(topicProgress.attempts) || 0,
    correct: Number(topicProgress.correct) || 0
  };
  difficultyTarget = getStartingDifficulty(baseline);
  adaptiveMessage.textContent = getStartingReason(baseline, difficultyTarget);
  const practiceProgress = progress.practice?.[assignmentId] || {};
  practiceAttempts = Number(practiceProgress.attempts) || 0;
  practiceCorrect = Number(practiceProgress.correct) || 0;
  practiceWrong = Number(practiceProgress.wrong) || 0;
  usedQuestionKeys = practiceProgress.completed_question_keys || {};

  if (assignment.status === 'completed') {
    showCompletedAssignment(assignment.result || practiceProgress.result || {});
    return;
  }

  if (!assignment.baseline) {
    await update(assignmentRef, {
      baseline,
      status: 'in_progress',
      started_at: Date.now()
    });
  } else if (assignment.status !== 'in_progress') {
    await update(assignmentRef, { status: 'in_progress', started_at: assignment.started_at || Date.now() });
  }

  const questionsSnapshot = await get(ref(database, 'QUESTIONS'));
  const questionSets = questionsSnapshot.val() || {};
  const assignedQuestions = (assignment.questions || []).map((questionRef) => {
    const setData = questionSets[questionRef.set_id];
    const data = setData?.items?.[questionRef.item_key];
    if (!data || (data.topic || 'General') !== topicName) return null;
    return {
      setId: questionRef.set_id,
      itemKey: questionRef.item_key,
      setTitle: setData.title || questionRef.set_id,
      data
    };
  }).filter(Boolean);
  totalPracticeQuestions = assignedQuestions.length;
  questionPool = assignedQuestions.filter((question) => !usedQuestionKeys[questionKey(question)]);

  if (!questionPool.length) {
    if (practiceAttempts) {
      await completePractice();
      return;
    }
    throw new Error(`No questions are available for ${topicName}.`);
  }

  await loadNextQuestion();
}

async function loadNextQuestion() {
  continueButton.hidden = true;
  feedback.textContent = '';
  feedback.className = 'practice-feedback';
  hintBox.hidden = true;
  hintBox.textContent = '';
  mechanismContainer.replaceChildren();

  if (!questionPool.length) {
    await completePractice();
    return;
  }

  const nextIndex = findAdaptiveQuestionIndex();
  currentQuestion = questionPool.splice(nextIndex, 1)[0];
  currentMechanism = String(currentQuestion.data.mechanism || currentQuestion.data.type || 'mcq').toLowerCase();
  isAnswerLocked = false;
  difficultyLabel.textContent = `Difficulty: ${currentQuestion.data.difficulty || 'Normal'}`;
  adaptiveTargetLabel.textContent = `Target level: ${difficultyName(difficultyTarget)}`;
  streakLabel.textContent = `Correct streak: ${correctStreak}`;
  questionCounter.textContent = `Question ${Math.min(practiceAttempts + 1, totalPracticeQuestions)} of ${totalPracticeQuestions}`;
  updatePracticeProgress();
  const actualDifficulty = difficultyRank(currentQuestion.data.difficulty);
  if (actualDifficulty !== difficultyTarget) {
    adaptiveMessage.textContent = `Target is ${difficultyName(difficultyTarget)}; closest available question is ${difficultyName(actualDifficulty)}.`;
  }
  questionTitle.textContent = currentQuestion.data.question_text || currentQuestion.data.instruction || currentQuestion.data.question_template || 'Solve the C++ question.';

  if (currentQuestion.data.code_snippet) {
    codeBlock.hidden = false;
    codeBlock.textContent = currentQuestion.data.code_snippet;
  } else {
    codeBlock.hidden = true;
    codeBlock.textContent = '';
  }

  const handleAnswer = (isCorrect, _timeLeft, _timeLimit, extra = {}) => {
    if (extra.itemAttempt && !extra.roundComplete) return;
    if (currentMechanism === 'catch_collect' || currentMechanism === 'catch') {
      if (!extra.roundComplete) return;
    }
    finishQuestion(Boolean(isCorrect), extra);
  };

  try {
    switch (currentMechanism) {
      case 'bug':
      case 'bug_sniper':
        renderBugSniper(mechanismContainer, currentQuestion.data, handleAnswer);
        break;
      case 'drag_drop':
      case 'dragdrop':
      case 'rearrange':
      case 'parsons':
      case 'blank':
      case 'fitb':
        renderDragDrop(mechanismContainer, currentQuestion.data, handleAnswer);
        break;
      case 'catch_collect':
      case 'catch':
        renderCatchCollect(mechanismContainer, currentQuestion.data, handleAnswer);
        break;
      default:
        renderMCQ(mechanismContainer, currentQuestion.data, handleAnswer);
    }
  } catch (error) {
    showError(`Unable to render this question: ${error.message}`);
  }
}

function findAdaptiveQuestionIndex() {
  return questionPool.reduce((bestIndex, question, index) => {
    const questionRank = difficultyRank(question.data.difficulty);
    const bestRank = difficultyRank(questionPool[bestIndex].data.difficulty);
    const candidateDistance = Math.abs(questionRank - difficultyTarget);
    const bestDistance = Math.abs(bestRank - difficultyTarget);
    return candidateDistance < bestDistance || (candidateDistance === bestDistance && questionRank < bestRank)
      ? index : bestIndex;
  }, 0);
}

async function finishQuestion(isCorrect, extra) {
  if (isAnswerLocked) return;
  isAnswerLocked = true;
  mechanismContainer.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  practiceAttempts++;
  if (isCorrect) {
    practiceCorrect++;
    correctStreak++;
    feedback.textContent = 'Correct. Keep building your streak.';
    feedback.className = 'practice-feedback correct';
    if (correctStreak >= 2) {
      const oldTarget = difficultyTarget;
      difficultyTarget = Math.min(2, difficultyTarget + 1);
      correctStreak = 0;
      adaptiveMessage.textContent = difficultyTarget > oldTarget
        ? `Two correct in a row: target increased to ${difficultyName(difficultyTarget)}.`
        : 'Two correct in a row: target remains at Hard.';
    } else {
      adaptiveMessage.textContent = `One more consecutive correct answer raises the target from ${difficultyName(difficultyTarget)}.`;
    }
  } else {
    practiceWrong++;
    correctStreak = 0;
    const oldTarget = difficultyTarget;
    difficultyTarget = Math.max(0, difficultyTarget - 1);
    const hint = currentQuestion.data.hint || 'Break the question into smaller steps, then compare each part with the topic requirements.';
    hintBox.textContent = `Hint: ${hint}`;
    hintBox.hidden = false;
    adaptiveMessage.textContent = difficultyTarget < oldTarget
      ? `Target lowered to ${difficultyName(difficultyTarget)} after an incorrect answer.`
      : 'Target stays at Easy after an incorrect answer.';
    feedback.textContent = 'Not quite. Review the hint, then continue.';
    feedback.className = 'practice-feedback incorrect';
  }

  streakLabel.textContent = `Correct streak: ${correctStreak}`;
  adaptiveTargetLabel.textContent = `Target level: ${difficultyName(difficultyTarget)}`;
  await savePracticeAttempt(isCorrect, extra);
  continueButton.textContent = questionPool.length ? 'Continue' : 'View learning gain';
  continueButton.hidden = false;
}

async function savePracticeAttempt(isCorrect, extra) {
  const now = Date.now();
  const eventId = `practice_${now}_${Math.random().toString(36).slice(2)}`;
  const data = currentQuestion.data;
  const answer = extra.submittedAnswer ?? extra.selectedAnswer ?? (extra.correctCount !== undefined ? `${extra.correctCount} correct items caught` : null);
  const event = {
    event_id: eventId,
    assignment_id: assignmentId,
    user_id: userId,
    lecturer_id: assignment.lecturer_id || '',
    set_id: currentQuestion.setId,
    question_id: currentQuestion.itemKey,
    topic: topicName,
    mechanism: currentMechanism,
    difficulty: data.difficulty || 'Normal',
    is_correct: isCorrect,
    answer,
    timestamp: now
  };

  try {
    const progressRef = ref(database, `PLAYER_PROGRESS/${userId}`);
    await runTransaction(progressRef, (current) => {
      const progress = current || {};
      progress.topics = progress.topics || {};
      progress.totals = progress.totals || {};
      progress.practice = progress.practice || {};

      const topic = progress.topics[topicKey] || { topic: topicName, attempts: 0, correct: 0, wrong: 0 };
      topic.attempts = (Number(topic.attempts) || 0) + 1;
      if (isCorrect) topic.correct = (Number(topic.correct) || 0) + 1;
      else topic.wrong = (Number(topic.wrong) || 0) + 1;
      progress.topics[topicKey] = topic;

      progress.totals.total_attempts = (Number(progress.totals.total_attempts) || 0) + 1;
      progress.totals[isCorrect ? 'correct_attempts' : 'wrong_attempts'] =
        (Number(progress.totals[isCorrect ? 'correct_attempts' : 'wrong_attempts']) || 0) + 1;

      const practice = progress.practice[assignmentId] || {
        assignment_id: assignmentId,
        topic: topicName,
        baseline,
        attempts: 0,
        correct: 0,
        wrong: 0,
        completed_questions: 0,
        completed_question_keys: {},
        events: {}
      };
      practice.events = practice.events || {};
      practice.completed_question_keys = practice.completed_question_keys || {};
      if (practice.events[eventId]) return;
      practice.events[eventId] = event;
      const completedKey = questionKey(currentQuestion);
      if (!practice.completed_question_keys[completedKey]) {
        practice.completed_question_keys[completedKey] = true;
        practice.completed_questions = (Number(practice.completed_questions) || 0) + 1;
      }
      practice.attempts = (Number(practice.attempts) || 0) + 1;
      practice[isCorrect ? 'correct' : 'wrong'] = (Number(practice[isCorrect ? 'correct' : 'wrong']) || 0) + 1;
      practice.status = 'in_progress';
      practice.last_updated = now;
      progress.practice[assignmentId] = practice;
      return progress;
    });

    if (!isCorrect) {
      await update(ref(database, `MISCONCEPTION_LOGS/${eventId}`), {
        ...event,
        source: 'adaptive_practice',
        wrong_answer: answer || 'Incorrect response',
        failure_type: 'practice_incorrect_answer'
      });
    }
  } catch (error) {
    console.error('Unable to save practice attempt:', error);
    feedback.textContent += ' Progress could not be saved.';
  }
}

async function completePractice() {
  const progressRef = ref(database, `PLAYER_PROGRESS/${userId}`);
  const progressSnapshot = await get(progressRef);
  const progress = progressSnapshot.val() || {};
  const topicProgress = progress.topics?.[topicKey] || { attempts: 0, correct: 0 };
  const beforeAccuracy = baseline.attempts ? baseline.correct / baseline.attempts : 0;
  const afterAccuracy = topicProgress.attempts ? topicProgress.correct / topicProgress.attempts : 0;
  const accuracyGain = Math.round((afterAccuracy - beforeAccuracy) * 100);
  const result = {
    attempts: practiceAttempts,
    correct: practiceCorrect,
    wrong: practiceWrong,
    accuracy_before: Math.round(beforeAccuracy * 100),
    accuracy_after: Math.round(afterAccuracy * 100),
    accuracy_gain: accuracyGain,
    completed_at: Date.now()
  };

  await update(progressRef, {
    [`practice/${assignmentId}/status`]: 'completed',
    [`practice/${assignmentId}/completed_at`]: result.completed_at,
    [`practice/${assignmentId}/result`]: result
  });
  await update(ref(database, `PRACTICE_ASSIGNMENTS/${userId}/${assignmentId}`), {
    status: 'completed',
    completed_at: result.completed_at,
    result
  });

  mechanismContainer.replaceChildren();
  continueButton.hidden = true;
  hintBox.hidden = true;
  questionCounter.textContent = `${practiceAttempts} questions practiced`;
  difficultyLabel.textContent = 'Practice complete';
  adaptiveTargetLabel.textContent = `Target level reached: ${difficultyName(difficultyTarget)}`;
  updatePracticeProgress();
  feedback.textContent = '';
  adaptiveMessage.textContent = '';
  summary.hidden = false;
  summary.innerHTML = `<h2>Practice complete</h2><p>${practiceCorrect} correct · ${practiceWrong} incorrect</p><p>Topic accuracy before: <strong>${result.accuracy_before}%</strong></p><p>Current topic accuracy: <strong>${result.accuracy_after}%</strong></p><p>Learning gain: <strong>${accuracyGain >= 0 ? '+' : ''}${accuracyGain} percentage points</strong></p>`;
}

function showCompletedAssignment(result) {
  practiceAttempts = Number(result.attempts) || practiceAttempts;
  totalPracticeQuestions = Math.max(practiceAttempts, totalPracticeQuestions);
  topicCounterForCompleted();
  mechanismContainer.replaceChildren();
  continueButton.hidden = true;
  summary.hidden = false;
  adaptiveTargetLabel.textContent = `Target level reached: ${difficultyName(difficultyTarget)}`;
  updatePracticeProgress();
  summary.innerHTML = `<h2>Practice already completed</h2><p>Accuracy before: <strong>${Number(result.accuracy_before) || 0}%</strong></p><p>Accuracy after: <strong>${Number(result.accuracy_after) || 0}%</strong></p><p>Learning gain: <strong>${Number(result.accuracy_gain) >= 0 ? '+' : ''}${Number(result.accuracy_gain) || 0} percentage points</strong></p>`;
}

function topicCounterForCompleted() {
  questionCounter.textContent = 'Assignment completed';
  difficultyLabel.textContent = 'Practice complete';
  evidence.textContent = `Assigned by ${assignment.lecturer_name || 'your lecturer'}.`;
}

function questionKey(question) {
  return `${question.setId}_${question.itemKey}`;
}

function difficultyRank(value) {
  const rank = { easy: 0, medium: 1, hard: 2 };
  return rank[String(value || 'medium').toLowerCase()] ?? 1;
}

function difficultyName(rank) {
  return ['Easy', 'Medium', 'Hard'][Math.max(0, Math.min(2, rank))];
}

function getStartingDifficulty(topicBaseline) {
  if (topicBaseline.attempts < 3) return 0;
  const accuracy = topicBaseline.correct / topicBaseline.attempts;
  if (accuracy < 0.6) return 0;
  if (accuracy < 0.8) return 1;
  return 2;
}

function getStartingReason(topicBaseline, target) {
  if (topicBaseline.attempts < 3) return 'Starting at Easy because there is not enough topic history yet.';
  const accuracy = Math.round((topicBaseline.correct / topicBaseline.attempts) * 100);
  return `Starting at ${difficultyName(target)} based on ${accuracy}% accuracy across ${topicBaseline.attempts} previous attempts.`;
}

function updatePracticeProgress() {
  const percent = totalPracticeQuestions
    ? Math.min(100, Math.round((practiceAttempts / totalPracticeQuestions) * 100))
    : 0;
  practiceProgressBar.style.width = `${percent}%`;
  practiceProgress.setAttribute('aria-valuenow', String(percent));
  practiceProgressText.textContent = `${practiceAttempts} of ${totalPracticeQuestions} questions completed`;
}

function showError(message) {
  questionCounter.textContent = 'Unable to start practice';
  questionTitle.textContent = message;
  mechanismContainer.replaceChildren();
  continueButton.hidden = true;
}