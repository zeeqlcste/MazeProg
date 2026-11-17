import { database } from "./firebase-config.js";
import { ref, get, update, child, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderMCQ } from "./mechanisms/mcq-mechanism.js";
import { renderBugSniper } from "./mechanisms/bug-mechanism.js";
import { renderDragDrop } from "./mechanisms/dragdrop-mechanism.js";
import { renderCatchCollect } from "./mechanisms/catch-mechanism.js";

// DOM Elements
const sessionPinInput = document.getElementById('sessionPinInput');
const joinSessionBtn = document.getElementById('joinSessionBtn');
const profileBtn = document.getElementById('profileBtn');
const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const topicMasteryList = document.getElementById('topicMasteryList');
const questionHistoryList = document.getElementById('questionHistoryList');
const topicProgressTab = document.getElementById('topicProgressTab');
const questionHistoryTab = document.getElementById('question-history');
const topicProgressPanel = document.getElementById('topicProgressPanel');
const questionHistoryPanel = document.getElementById('questionHistoryPanel');
const welcomeTitle = document.getElementById('studentWelcomeTitle');
const topicsPracticed = document.getElementById('topicsPracticed');
const averageAccuracy = document.getElementById('averageAccuracy');
const recommendedHeading = document.getElementById('recommendedHeading');
const recommendedReason = document.getElementById('recommendedReason');
const recommendedPracticeBtn = document.getElementById('recommendedPracticeBtn');

const userString = localStorage.getItem('loggedInUser');
let currentUser = null;
let currentUserId = '';
let currentTopicRows = [];
let questionBankPromise = null;
let historyRenderVersion = 0;

if (userString) {
  currentUser = JSON.parse(userString);
  const userId = currentUser.user_id || currentUser.uid || currentUser.id;
  currentUserId = userId || '';
  if (!userId) {
    alert('Your session is invalid. Please log in again.');
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  }

  const displayName = currentUser.name || currentUser.username || currentUser.email || 'Student';
  if (userNameDisplay) userNameDisplay.textContent = displayName;
  if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${displayName.split(' ')[0]}`;

  if (userAvatar && currentUser.profile_picture) {
    userAvatar.src = currentUser.profile_picture;
    userAvatar.hidden = false;
  }
} else {
  alert('Please log in to continue.');
  window.location.href = 'login.html';
}

if (profileBtn) {
  profileBtn.addEventListener('click', () => {
    window.location.href = 'student-profile.html';
  });
}

if (joinSessionBtn) {
  joinSessionBtn.addEventListener('click', async () => {
    const inputPin = sessionPinInput.value.trim();

    if (!inputPin) {
      alert('Please enter a session PIN first.');
      return;
    }

    const userId = currentUser.user_id || currentUser.uid || currentUser.id;

    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `GAME_SESSIONS/${inputPin}`));

      if (snapshot.exists()) {
        const sessionData = snapshot.val();

        if (sessionData.status === 'ENDED') {
          alert('This game session has ended.');
          return;
        }

        const playerRef = ref(database, `GAME_SESSIONS/${inputPin}/players/${userId}`);
        await update(playerRef, {
          user_id: userId,
          name: currentUser.name || currentUser.username || "Student",
          email: currentUser.email || "",
          joined_at: new Date().toISOString(),
          last_seen_at: Date.now()
        });

        window.location.href = `student-waiting-room.html?pin=${inputPin}`;
      } else {
        alert('Session PIN not found. Please check the PIN from your lecturer and try again.');
      }
    } catch (error) {
      console.error('Unable to join game session:', error);
      alert(`Could not join the session: ${error.message}`);
    }
  });
}

if (topicProgressTab && questionHistoryTab) {
  const progressTabs = [topicProgressTab, questionHistoryTab];
  const selectProgressTab = (selectedTab, updateHash = false) => {
    const showHistory = selectedTab === questionHistoryTab;
    topicProgressTab.setAttribute('aria-selected', String(!showHistory));
    topicProgressTab.tabIndex = showHistory ? -1 : 0;
    questionHistoryTab.setAttribute('aria-selected', String(showHistory));
    questionHistoryTab.tabIndex = showHistory ? 0 : -1;
    topicProgressPanel.hidden = showHistory;
    questionHistoryPanel.hidden = !showHistory;
    if (updateHash) {
      window.location.hash = showHistory ? '#question-history' : '#my-progress';
    }
  };

  if (window.location.hash === '#question-history') {
    selectProgressTab(questionHistoryTab);
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#question-history') {
      selectProgressTab(questionHistoryTab);
    } else if (window.location.hash === '#my-progress') {
      selectProgressTab(topicProgressTab);
    }
  });

  progressTabs.forEach((tab) => {
    tab.addEventListener('click', () => selectProgressTab(tab, true));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const selectedIndex = progressTabs.indexOf(tab);
      const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? progressTabs.length - 1
          : (selectedIndex + (event.key === 'ArrowRight' ? 1 : -1) + progressTabs.length) % progressTabs.length;
      progressTabs[nextIndex].focus();
      selectProgressTab(progressTabs[nextIndex], true);
    });
  });
}

if (currentUserId && topicMasteryList && questionHistoryList) {
  onValue(ref(database, `PLAYER_PROGRESS/${currentUserId}`), (snapshot) => {
    const progress = snapshot.val() || {};
    const topics = progress.topics || {};
    currentTopicRows = buildTopicRows(topics);
    renderTopicMastery(currentTopicRows);
    loadQuestionHistory(progress).catch((error) => {
      console.error('Unable to load question history:', error);
      questionHistoryList.replaceChildren(createEmptyMessage('Your question history could not be loaded. Please try again later.'));
    });
    updateDashboardSummary();
  }, (error) => {
    console.error('Unable to load student progress:', error);
    topicMasteryList.replaceChildren(createEmptyMessage('Your topic progress could not be loaded. Please try again later.'));
    questionHistoryList.replaceChildren(createEmptyMessage('Your question history could not be loaded. Please try again later.'));
  });
}

function buildTopicRows(topics) {
  return Object.values(topics).filter((stats) => stats && typeof stats === 'object').map((stats) => {
    const attempts = Number(stats.attempts) || 0;
    const correct = Number(stats.correct) || 0;
    const accuracy = attempts ? correct / attempts : 0;
    const status = attempts < 3 ? 'Building a baseline'
      : attempts >= 5 && accuracy >= 0.8 ? 'Strong progress'
        : accuracy < 0.6 ? 'Worth reviewing' : 'In progress';
    return { topic: stats.topic || 'General', attempts, correct, accuracy, status };
  }).sort((a, b) => a.accuracy - b.accuracy);
}

function updateDashboardSummary() {
  const practicedRows = currentTopicRows.filter((item) => item.attempts > 0);
  const totalAttempts = practicedRows.reduce((total, item) => total + item.attempts, 0);
  const totalCorrect = practicedRows.reduce((total, item) => total + item.correct, 0);

  if (topicsPracticed) topicsPracticed.textContent = String(practicedRows.length);
  if (averageAccuracy) averageAccuracy.textContent = totalAttempts
    ? `${Math.round((totalCorrect / totalAttempts) * 100)}%`
    : '—';

  const reviewTopic = practicedRows.find((item) => item.attempts >= 3 && item.accuracy < 0.75);
  if (reviewTopic) {
    recommendedHeading.textContent = `Review ${reviewTopic.topic}`;
    recommendedReason.textContent = `${Math.round(reviewTopic.accuracy * 100)}% accuracy across ${reviewTopic.attempts} questions so far. A short review and a few more questions can help strengthen this topic.`;

    recommendedPracticeBtn.href = `student-learn.html?topic=${encodeURIComponent(reviewTopic.topic)}`;
    recommendedPracticeBtn.textContent = 'Review this topic';
  } else if (practicedRows.length) {
    recommendedHeading.textContent = 'Keep building your skills';
    recommendedReason.textContent = 'Your current topic results look steady. Try a new practice set or explore a lesson in another area.';
    recommendedPracticeBtn.href = 'student-learn.html';
    recommendedPracticeBtn.textContent = 'Explore C++ lessons';
  } else {
    recommendedHeading.textContent = 'Your learning journey starts here';
    recommendedReason.textContent = 'Complete a few practice questions to see topic progress and get a helpful review suggestion here.';
    recommendedPracticeBtn.href = 'student-learn.html';
    recommendedPracticeBtn.textContent = 'Start learning';
  }
}

function renderTopicMastery(rows) {
  topicMasteryList.replaceChildren();

  if (!rows.length) {
    const emptyMessage = createEmptyMessage('Your topic progress will appear here after you complete a game or practice questions.');
    const learnLink = document.createElement('a');
    learnLink.className = 'empty-state-link';
    learnLink.href = 'student-learn.html';
    learnLink.textContent = 'Explore learning resources';
    emptyMessage.append(' ', learnLink);
    topicMasteryList.appendChild(emptyMessage);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'topic-mastery-row';
    const title = document.createElement('strong');
    title.textContent = item.topic;
    const details = document.createElement('span');
    details.className = 'mastery-state';
    details.textContent = `${item.status} · ${Math.round(item.accuracy * 100)}% accuracy · ${item.attempts} questions`;
    row.append(title, details);
    topicMasteryList.appendChild(row);
  });
}

async function loadQuestionHistory(progress) {
  const renderVersion = ++historyRenderVersion;
  const sessions = Object.entries(progress.sessions || {})
    .filter(([, session]) => session && typeof session === 'object')
    .map(([sessionPin, session]) => {
      const questions = new Map();
      Object.values(session.events || {}).forEach((event) => {
        if (!event || typeof event !== 'object' || event.question_id === undefined) return;
        const setId = String(event.set_id || '');
        const questionId = String(event.question_id);
        const questionKey = JSON.stringify([setId, questionId]);
        let question = questions.get(questionKey);
        if (!question) {
          question = { setId, questionId, attempts: 0, questionData: null, latest: null };
          questions.set(questionKey, question);
        }

        question.attempts++;
        if (event.question_data) question.questionData = event.question_data;
        if (!question.latest || Number(event.timestamp) >= Number(question.latest.timestamp)) {
          question.latest = event;
        }
      });
      return {
        sessionPin: session.session_pin || sessionPin,
        title: session.session_title || `Game session ${session.session_pin || sessionPin}`,
        status: session.status || 'IN_PROGRESS',
        isCompleted: Boolean(session.is_completed),
        score: Number(session.score) || 0,
        startedAt: Number(session.started_at) || 0,
        lastUpdated: Number(session.completed_at || session.last_updated) || 0,
        completedAt: Number(session.completed_at) || 0,
        timeTaken: Number(session.time_taken) || 0,
        totalQuestions: Number(session.total_questions) || 0,
        completedQuestions: Number(session.completed_questions) || questions.size,
        questions: [...questions.values()]
      };
    })
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  if (!sessions.length) {
    if (renderVersion === historyRenderVersion) {
      questionHistoryList.replaceChildren(createEmptyMessage('Sessions you join will appear here after you start answering questions.'));
    }
    return;
  }

  if (sessions.some((session) => session.questions.some((question) => !question.questionData && question.setId))) {
    questionBankPromise = questionBankPromise || get(ref(database, 'QUESTIONS'))
      .then((snapshot) => snapshot.val() || {})
      .catch((error) => {
        questionBankPromise = null;
        throw error;
      });
    const questionBank = await questionBankPromise;
    sessions.forEach((session) => {
      session.questions.forEach((question) => {
        question.questionData = question.questionData || questionBank[question.setId]?.items?.[question.questionId] || null;
      });
    });
  }

  if (renderVersion === historyRenderVersion) {
    renderQuestionHistory(sessions);
  }
}

function renderQuestionHistory(sessions) {
  questionHistoryList.querySelectorAll('.history-session-card').forEach((card) => {
    card.disposeSessionDetails?.();
  });
  questionHistoryList.replaceChildren();

  sessions.forEach((session) => {
    const card = document.createElement('article');
    card.className = 'history-session-card';

    const details = document.createElement('div');
    details.className = 'history-details';
    const title = document.createElement('strong');
    title.className = 'history-question';
    title.textContent = session.title;
    details.appendChild(title);

    const metadata = document.createElement('p');
    metadata.className = 'history-meta';
    const status = session.isCompleted ? 'Completed' : 'In progress';
    const questionCount = session.totalQuestions
      ? `${session.completedQuestions} / ${session.totalQuestions} questions`
      : `${session.questions.length} ${session.questions.length === 1 ? 'question' : 'questions'} answered`;
    const sessionDate = session.lastUpdated || session.startedAt;
    metadata.textContent = `PIN ${session.sessionPin} · ${status} · ${questionCount} · ${session.score} points · ${formatHistoryDate(sessionDate)}`;
    details.appendChild(metadata);

    const actions = document.createElement('div');
    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'btn btn-outline';
    detailsButton.textContent = 'View details';
    detailsButton.setAttribute('aria-expanded', 'false');
    actions.appendChild(detailsButton);
    card.append(details, actions);
    questionHistoryList.appendChild(card);

    let sessionDetails = null;
    card.disposeSessionDetails = () => {
      sessionDetails?.querySelectorAll('.question-history-card').forEach((questionCard) => {
        questionCard.disposeRevision?.();
      });
      sessionDetails?.remove();
      sessionDetails = null;
    };
    detailsButton.addEventListener('click', () => {
      if (sessionDetails) {
        card.disposeSessionDetails();
        detailsButton.textContent = 'View details';
        detailsButton.setAttribute('aria-expanded', 'false');
        return;
      }

      sessionDetails = renderSessionDetails(session);
      card.appendChild(sessionDetails);
      detailsButton.textContent = 'Hide details';
      detailsButton.setAttribute('aria-expanded', 'true');
    });
  });
}

function renderSessionDetails(session) {
  const panel = document.createElement('section');
  panel.className = 'history-session-details';
  const heading = document.createElement('div');
  heading.className = 'history-session-heading';
  const title = document.createElement('h3');
  title.textContent = 'Session details';
  const summary = document.createElement('p');
  summary.className = 'history-session-summary';
  summary.textContent = `Started ${formatHistoryDate(session.startedAt)} · ${session.timeTaken} seconds · ${session.questions.length} unique questions answered`;
  heading.append(title, summary);
  panel.appendChild(heading);

  if (!session.questions.length) {
    panel.appendChild(createEmptyMessage('No question answers have been recorded for this session yet.'));
    return panel;
  }

  session.questions
    .sort((a, b) => Number(b.latest.timestamp) - Number(a.latest.timestamp))
    .forEach((question, index) => {
      panel.appendChild(renderSessionQuestion(question, index));
    });
  return panel;
}

function renderSessionQuestion(entry, index) {
  const card = document.createElement('article');
  card.className = 'question-history-card';
  const details = document.createElement('div');
  details.className = 'history-details';
  const title = document.createElement('strong');
  title.className = 'history-question';
  title.textContent = `${index + 1}. ${getQuestionTitle(entry.questionData, entry.questionId)}`;

  const metadata = document.createElement('p');
  metadata.className = 'history-meta';
  const mechanism = entry.latest.mechanism || entry.questionData?.mechanism || 'question';
  metadata.textContent = `${entry.latest.topic || entry.questionData?.topic || 'General'} · ${formatMechanismName(mechanism)} · ${entry.attempts} ${entry.attempts === 1 ? 'attempt' : 'attempts'} · ${formatHistoryDate(entry.latest.timestamp)}`;

  const result = document.createElement('span');
  result.className = `history-result${entry.latest.is_correct ? '' : ' needs-review'}`;
  result.textContent = entry.latest.is_correct ? 'Last attempt: Correct' : 'Last attempt: Keep reviewing';
  details.append(title, metadata, result);

  if (entry.latest.answer !== undefined && entry.latest.answer !== null && String(entry.latest.answer).trim() !== '') {
    const previousAnswer = document.createElement('p');
    previousAnswer.className = 'history-meta';
    previousAnswer.textContent = `Your answer: ${String(entry.latest.answer)}`;
    details.appendChild(previousAnswer);
  }
  if (entry.questionData?.code_snippet) {
    const code = document.createElement('pre');
    code.className = 'history-code';
    code.textContent = entry.questionData.code_snippet;
    details.appendChild(code);
  }

  const actions = document.createElement('div');
  const reviseButton = document.createElement('button');
  reviseButton.type = 'button';
  reviseButton.className = 'btn btn-outline';
  reviseButton.textContent = entry.questionData ? 'Revise question' : 'Question unavailable';
  reviseButton.disabled = !entry.questionData;
  reviseButton.setAttribute('aria-expanded', 'false');
  actions.appendChild(reviseButton);
  card.append(details, actions);

  let revisionPanel = null;
  let revisionCleanup = null;
  card.disposeRevision = () => {
    if (revisionCleanup) revisionCleanup();
    revisionPanel?.remove();
    revisionPanel = null;
    revisionCleanup = null;
    reviseButton.textContent = 'Revise question';
    reviseButton.setAttribute('aria-expanded', 'false');
  };
  reviseButton.addEventListener('click', () => {
    if (revisionPanel) {
      card.disposeRevision();
      return;
    }

    revisionPanel = createRevisionPanel(entry, (cleanup) => {
      revisionCleanup = cleanup;
    });
    card.appendChild(revisionPanel);
    reviseButton.textContent = 'Close revision';
    reviseButton.setAttribute('aria-expanded', 'true');
  });
  return card;
}

function createRevisionPanel(entry, setCleanup) {
  let revisionCleanup = null;
  const panel = document.createElement('div');
  panel.className = 'history-revision';
  const prompt = document.createElement('p');
  prompt.className = 'history-question';
  prompt.textContent = getQuestionTitle(entry.questionData, entry.questionId);
  const feedback = document.createElement('p');
  feedback.className = 'history-revision-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  const mechanismContainer = document.createElement('div');
  const actions = document.createElement('div');
  actions.className = 'history-revision-actions';
  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'btn btn-primary';
  retryButton.textContent = 'Try again';
  retryButton.hidden = true;
  actions.appendChild(retryButton);
  panel.append(prompt, mechanismContainer, feedback, actions);

  const mountQuestion = () => {
    if (revisionCleanup) {
      revisionCleanup();
      revisionCleanup = null;
    }
    mechanismContainer.replaceChildren();
    feedback.textContent = '';
    feedback.className = 'history-revision-feedback';
    retryButton.hidden = true;

    const onAnswer = (isCorrect, _timeLeft, _timeLimit, extra = {}) => {
      if (revisionCleanup) {
        revisionCleanup();
        revisionCleanup = null;
        setCleanup(null);
      }
      mechanismContainer.querySelectorAll('button, input').forEach((control) => {
        control.disabled = true;
      });
      feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
      feedback.textContent = isCorrect
        ? 'Correct! Great work. You can try it again or keep reviewing.'
        : `Not quite. ${getRevisionAnswer(entry.questionData)} Select “Try again” to have another go.`;
      retryButton.hidden = false;
    };

    try {
      const question = entry.questionData;
      const mechanism = String(question.mechanism || question.type || 'mcq').toLowerCase().replace(/\s+/g, '_');
      let cleanup;
      switch (mechanism) {
        case 'bug':
        case 'bug_sniper':
          renderBugSniper(mechanismContainer, question, onAnswer);
          break;
        case 'drag_drop':
        case 'dragdrop':
        case 'rearrange':
        case 'parsons':
        case 'blank':
        case 'fitb':
          renderDragDrop(mechanismContainer, question, onAnswer);
          break;
        case 'catch':
        case 'catch_collect':
          cleanup = renderCatchCollect(mechanismContainer, question, onAnswer);
          break;
        default:
          renderMCQ(mechanismContainer, question, onAnswer);
      }
      if (typeof cleanup === 'function') {
        revisionCleanup = cleanup;
        setCleanup(cleanup);
      }
    } catch (error) {
      console.error('Unable to render a revision question:', error);
      feedback.classList.add('incorrect');
      feedback.textContent = 'This question could not be opened for revision. Please try again later.';
    }
  };

  retryButton.addEventListener('click', mountQuestion);

  mountQuestion();
  return panel;
}

function getQuestionTitle(question, questionId) {
  return question?.question_text || question?.instruction || question?.question_template || `Question ${questionId}`;
}

function getRevisionAnswer(question) {
  if (question.correct_answer) return `Correct answer: ${question.correct_answer}.`;
  if (question.correct_option_index !== undefined && question.options?.[question.correct_option_index] !== undefined) {
    return `Correct answer: ${question.options[question.correct_option_index]}.`;
  }
  if (question.correct_fix) return `The fix is: ${question.correct_fix}.`;
  if (Array.isArray(question.correct_order)) return `Correct order: ${question.correct_order.join(' → ')}.`;
  if (Array.isArray(question.correct_items)) return `Correct items: ${question.correct_items.join(', ')}.`;
  return 'Review the question and give it another try.';
}

function formatMechanismName(mechanism) {
  return String(mechanism).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatHistoryDate(timestamp) {
  const date = Number(timestamp);
  return date && Number.isFinite(date) ? new Date(date).toLocaleString() : 'Date unavailable';
}

function createEmptyMessage(message) {
  const element = document.createElement('p');
  element.className = 'empty-state';
  element.style.color = '#94a3b8';
  element.textContent = message;
  return element;
}
