import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
if (!currentUser || currentUser.role !== 'lecturer') {
  window.location.href = 'login.html';
}

const sessionFilter = document.getElementById('sessionFilter');
const studentFilter = document.getElementById('studentFilter');
const masteryFilter = document.getElementById('masteryFilter');
const classFilter = document.getElementById('classFilter');
const topicFilter = document.getElementById('topicFilter');
const semesterFilter = document.getElementById('semesterFilter');
const metrics = document.getElementById('analyticsMetrics');
const studentProgressBody = document.getElementById('studentProgressBody');
const topicPerformanceBody = document.getElementById('topicPerformanceBody');
const recommendations = document.getElementById('recommendations');

let sessionsData = {};
let progressData = {};
let studentProfiles = {};
let misconceptionLogs = {};
let questionBankData = {};
let topicChart = null;
let masteryPieChart = null;

sessionFilter.addEventListener('change', renderAnalytics);
studentFilter.addEventListener('change', renderAnalytics);
[masteryFilter, classFilter, topicFilter, semesterFilter].forEach((filter) => {
  filter?.addEventListener('change', renderAnalytics);
});

onValue(ref(database, 'GAME_SESSIONS'), (snapshot) => {
  sessionsData = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

onValue(ref(database, 'PLAYER_PROGRESS'), (snapshot) => {
  progressData = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

onValue(ref(database, 'STUDENT'), (snapshot) => {
  studentProfiles = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

onValue(ref(database, 'MISCONCEPTION_LOGS'), (snapshot) => {
  misconceptionLogs = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

onValue(ref(database, 'QUESTIONS'), (snapshot) => {
  questionBankData = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

function getOwnedSessions() {
  const ownedSessions = new Map(Object.entries(sessionsData).filter(([, session]) =>
    session && session.owner_id === currentUser.user_id && session.session_type !== 'whiteboard'
  ));

  Object.entries(progressData).forEach(([studentId, studentProgress]) => {
    Object.entries(studentProgress.sessions || {}).forEach(([pin, progress]) => {
      if (progress.owner_id !== currentUser.user_id) return;
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

function getStudentSessionRows(ownedSessions) {
  const rows = [];
  ownedSessions.forEach(([pin, session]) => {
    Object.entries(session.players || {}).forEach(([userId, player]) => {
      const playerData = player || {};
      const savedProgress = progressData[userId]?.sessions?.[pin] || playerData.progress;
      const sessionProgress = savedProgress || {};
      
      const totalAttempts = Number(sessionProgress.total_attempts) || 0;
      const correctAttempts = Number(sessionProgress.correct_attempts) || 0;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;

      let tier = 'unranked';
      if (accuracy !== null) {
        if (accuracy >= 75) tier = 'mastered';
        else if (accuracy >= 50) tier = 'progress';
        else tier = 'struggling';
      }

      rows.push({
        userId,
        name: playerData.name || progressData[userId]?.name || userId,
        className: String(studentProfiles[userId]?.class || studentProfiles[userId]?.class_name || studentProfiles[userId]?.class_id || progressData[userId]?.class || 'Unassigned'),
        semester: String(studentProfiles[userId]?.semester || progressData[userId]?.semester || 'Unassigned'),
        pin,
        title: session.session_title || `Session ${pin}`,
        progress: sessionProgress,
        hasProgressData: Boolean(savedProgress),
        sessionDate: session.created_at || sessionProgress.started_at || null,
        score: Number(playerData.score ?? sessionProgress.score) || 0,
        accuracy,
        tier
      });
    });
  });
  return rows;
}

function updateFilters(rows, ownedSessions) {
  const selectedPin = sessionFilter.value;
  const selectedStudent = studentFilter.value;
  const selectedClass = classFilter.value;
  const selectedTopic = topicFilter.value;
  const selectedSemester = semesterFilter.value;
  replaceOptions(sessionFilter, [
    { value: 'all', label: 'All my game sessions' },
    ...ownedSessions.map(([pin, session]) => ({ value: pin, label: `${session.session_title || 'Game'} · ${pin}` }))
  ], selectedPin);
  replaceOptions(studentFilter, [
    { value: 'all', label: 'All students' },
    ...[...new Map(rows.map((row) => [row.userId, row.name])).entries()]
      .map(([value, label]) => ({ value, label }))
  ], selectedStudent);
  replaceOptions(classFilter, [
    { value: 'all', label: 'All classes' },
    ...[...new Set(rows.map((row) => row.className))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  ], selectedClass);
  replaceOptions(topicFilter, [
    { value: 'all', label: 'All topics' },
    ...[...new Set(rows.flatMap((row) => Object.values(row.progress.topics || {}).map((stats) => stats.topic || 'General')))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  ], selectedTopic);
  replaceOptions(semesterFilter, [
    { value: 'all', label: 'All semesters' },
    ...[...new Set(rows.map((row) => row.semester))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((value) => ({ value, label: value }))
  ], selectedSemester);
}

function replaceOptions(select, options, selectedValue) {
  select.replaceChildren();
  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = options.some((option) => option.value === selectedValue) ? selectedValue : 'all';
}

function renderAnalytics() {
  const ownedSessions = getOwnedSessions();
  const allRows = getStudentSessionRows(ownedSessions);
  updateFilters(allRows, ownedSessions);

  // Filter based on session and student dropdown
  const baseFiltered = allRows.filter((row) =>
    (sessionFilter.value === 'all' || row.pin === sessionFilter.value) &&
    (studentFilter.value === 'all' || row.userId === studentFilter.value) &&
    (classFilter.value === 'all' || row.className === classFilter.value) &&
    (semesterFilter.value === 'all' || row.semester === semesterFilter.value) &&
    (masteryFilter.value === 'all' || row.tier === masteryFilter.value) &&
    (topicFilter.value === 'all' || Object.values(row.progress.topics || {}).some((stats) =>
      (stats.topic || 'General') === topicFilter.value
    ))
  );
  const filteredRows = topicFilter.value === 'all'
    ? baseFiltered
    : baseFiltered.map((row) => ({
      ...row,
      progress: {
        ...row.progress,
        topics: Object.fromEntries(Object.entries(row.progress.topics || {}).filter(([, stats]) =>
          (stats.topic || 'General') === topicFilter.value
        ))
      }
    }));

  // Render Charts based on session & student context
  renderMetrics(filteredRows, ownedSessions);
  renderMasteryPieChart(filteredRows);
  renderTopicChart(filteredRows);
  renderTopics(filteredRows);
  renderRecommendations(filteredRows);
  renderStudentProgress(filteredRows);
}

function renderMetrics(rows, sessions) {
  const students = new Set(rows.map((row) => row.userId));
  const completed = rows.filter((row) => row.progress.is_completed).length;
  const strugglingCount = new Set(rows.filter((row) => row.tier === 'struggling').map((row) => row.userId)).size;

  metrics.replaceChildren();
  [
    [`${students.size}`, 'students'],
    [`${new Set(rows.map((row) => row.pin)).size}`, 'sessions in view'],
    [`${completed}`, 'completed sessions'],
    [`${strugglingCount}`, 'students needing support (<50%)']
  ].forEach(([value, label], index) => {
    const item = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = value;
    if (index === 3 && strugglingCount > 0) {
      strong.style.color = '#fca5a5';
    }
    item.append(strong, document.createTextNode(label));
    metrics.appendChild(item);
  });
  if (!rows.length && sessions.length) metrics.firstChild?.setAttribute('title', 'Students appear here after joining a game session.');
}

/* ================= PIE / DONUT MASTERY CHART ================= */
function renderMasteryPieChart(rows) {
  const canvas = document.getElementById('masteryPieChart');
  const countLabel = document.getElementById('pieCountLabel');
  if (!canvas) return;

  if (masteryPieChart) {
    masteryPieChart.destroy();
    masteryPieChart = null;
  }

  const validRows = rows.filter((r) => r.accuracy !== null);
  if (countLabel) countLabel.textContent = `${validRows.length} game records`;

  if (!validRows.length) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';

  const tiers = {
    mastered: validRows.filter((r) => r.tier === 'mastered').length,
    progress: validRows.filter((r) => r.tier === 'progress').length,
    struggling: validRows.filter((r) => r.tier === 'struggling').length
  };

  masteryPieChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Mastered (≥75%)', 'In Progress (50–74%)', 'Needs Attention (<50%)'],
      datasets: [{
        data: [tiers.mastered, tiers.progress, tiers.struggling],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderColor: '#161522',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              const total = validRows.length;
              const pct = total ? Math.round((val / total) * 100) : 0;
              return ` ${ctx.label}: ${val} students (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%',
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        const tierKeys = ['mastered', 'progress', 'struggling'];
        if (masteryFilter) {
          masteryFilter.value = tierKeys[index];
          renderAnalytics();
        }
      }
    }
  });
}

/* ================= STUDENT PROGRESS LIST ================= */
function renderStudentProgress(rows) {
  studentProgressBody.replaceChildren();
  if (!rows.length) return appendEmptyRow(studentProgressBody, 7, 'No student progress matches these filters.');

  rows.forEach((row) => {
    const progress = row.progress;
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.title = 'Click to view individual student breakdown';
    tr.tabIndex = 0;
    tr.setAttribute('role', 'button');
    tr.addEventListener('click', () => openStudentDetailModal(row));
    tr.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openStudentDetailModal(row);
    });

    appendCell(tr, row.name);
    appendCell(tr, `${row.title} (${row.pin})`);
    appendCell(tr, formatDate(row.sessionDate));
    appendCell(tr, row.hasProgressData ? `${Number(progress.completed_questions) || 0}/${Number(progress.total_questions) || 0}` : 'Not tracked');
    appendCell(tr, row.hasProgressData
      ? `${Number(progress.total_attempts) || 0} (${Number(progress.correct_attempts) || 0} correct, ${Number(progress.wrong_attempts) || 0} wrong)`
      : 'Unavailable');
    appendCell(tr, `${row.score} pts`);

    // Tier badge formatting
    const tierCell = document.createElement('td');
    if (row.accuracy === null) {
      tierCell.innerHTML = '<span style="color:#64748b;">Joined</span>';
    } else if (row.tier === 'mastered') {
      tierCell.innerHTML = `<span class="badge-tag badge-mastered">${row.accuracy}% · Mastered</span>`;
    } else if (row.tier === 'progress') {
      tierCell.innerHTML = `<span class="badge-tag badge-progress">${row.accuracy}% · Progress</span>`;
    } else {
      tierCell.innerHTML = `<span class="badge-tag badge-struggling">${row.accuracy}% · Attention</span>`;
    }
    tr.appendChild(tierCell);

    studentProgressBody.appendChild(tr);
  });
}

function formatDate(value) {
  const timestamp = typeof value === 'number' ? value : Date.parse(value || '');
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'No date recorded';
}

function computeTopicTotals(rows) {
  const topicTotals = new Map();
  rows.forEach((row) => {
    const topicStats = Object.values(row.progress.topics || {});
    topicStats.forEach((stats) => {
      addTopicTotals(topicTotals, stats);
    });
  });
  return topicTotals;
}

function renderTopics(rows) {
  const topicTotals = computeTopicTotals(rows);

  topicPerformanceBody.replaceChildren();
  if (!topicTotals.size) return appendEmptyRow(topicPerformanceBody, 6, 'Topic results will appear after students answer questions.');

  [...topicTotals.entries()].map(([topic, stats]) => ({
    topic,
    ...stats,
    accuracy: stats.attempts ? stats.correct / stats.attempts : 0
  })).sort((a, b) => a.accuracy - b.accuracy).forEach((topic) => {
    const tr = document.createElement('tr');
    appendCell(tr, topic.topic);
    appendCell(tr, topic.attempts);
    appendCell(tr, topic.correct);
    appendCell(tr, topic.wrong);
    appendCell(tr, `${Math.round(topic.accuracy * 100)}%`);
    const signal = topic.attempts < 3 ? 'Insufficient data' : topic.accuracy < 0.6 ? 'Needs attention' : 'On track';
    appendCell(tr, signal, topic.attempts >= 3 && topic.accuracy < 0.6 ? 'attention-text' : 'positive-text');
    topicPerformanceBody.appendChild(tr);
  });
}

function addTopicTotals(topicTotals, stats) {
  const topicName = stats.topic || 'General';
  const total = topicTotals.get(topicName) || { attempts: 0, correct: 0, wrong: 0 };
  total.attempts += Number(stats.attempts) || 0;
  total.correct += Number(stats.correct) || 0;
  total.wrong += Number(stats.wrong) || 0;
  topicTotals.set(topicName, total);
}

/* ================= HORIZONTAL TOPIC BAR CHART ================= */
function renderTopicChart(rows) {
  const ctx = document.getElementById('topicChart');
  if (!ctx) return;
  if (topicChart) {
    topicChart.destroy();
    topicChart = null;
  }

  const topicTotals = computeTopicTotals(rows);
  if (!topicTotals.size) {
    ctx.style.display = 'none';
    return;
  }
  ctx.style.display = 'block';

  const topics = [...topicTotals.entries()].map(([topic, stats]) => ({
    topic,
    ...stats,
    accuracy: stats.attempts ? stats.correct / stats.attempts : 0
  })).sort((a, b) => a.accuracy - b.accuracy);

  topicChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: topics.map((t) => t.topic),
      datasets: [{
        label: 'Accuracy %',
        data: topics.map((t) => Math.round(t.accuracy * 100)),
        backgroundColor: topics.map((t) => (t.accuracy < 0.6 ? '#f87171' : '#a855f7')),
        borderRadius: 5,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const t = topics[c.dataIndex];
              const acc = t.attempts ? Math.round((t.correct / t.attempts) * 100) : 0;
              return [`Accuracy: ${acc}%`, `Correct: ${t.correct} / ${t.attempts}`, `Wrong: ${t.wrong}`];
            }
          }
        }
      },
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: false }, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      },
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        openTopicDetailModal(topics[idx].topic, rows);
      }
    }
  });
}

/* ================= GAME OVERVIEW POPUP ================= */
function openStudentDetailModal(row) {
  const modal = document.getElementById('studentDetailModal');
  const nameEl = document.getElementById('studentModalName');
  const sessionEl = document.getElementById('studentModalSession');
  const listEl = document.getElementById('studentModalTopicsList');
  const topicBreakdown = document.getElementById('studentModalTopicBreakdown');
  const answersList = document.getElementById('studentModalAnswersList');

  if (!modal || !nameEl) return;

  nameEl.textContent = `Game Overview · ${row.name}`;
  sessionEl.textContent = `${row.title} · Session PIN: ${row.pin}`;

  const progress = row.progress;
  const attempts = Number(progress.total_attempts) || 0;
  const correct = Number(progress.correct_attempts) || 0;
  const acc = attempts ? `${Math.round((correct / attempts) * 100)}%` : 'Not available';
  const completedQuestions = Number(progress.completed_questions) || 0;
  const totalQuestions = Number(progress.total_questions) || 0;
  const duration = Number(progress.time_taken) || 0;
  const durationLabel = duration >= 60
    ? `${Math.floor(duration / 60)}m ${duration % 60}s`
    : `${duration}s`;

  listEl.innerHTML = '';
  const summaryStats = [
    ['Questions completed', `${completedQuestions}/${totalQuestions}`],
    ['Correct answers', `${correct}/${attempts}`],
    ['Incorrect answers', Number(progress.wrong_attempts) || 0],
    ['Accuracy', acc],
    ['Score', `${row.score} pts`],
    ['Game time', durationLabel],
    ['Status', progress.is_completed ? 'Completed' : 'In progress']
  ];
  summaryStats.forEach(([label, value]) => {
    const stat = document.createElement('div');
    stat.className = 'game-overview-stat';
    const statLabel = document.createElement('span');
    statLabel.textContent = label;
    const statValue = document.createElement('strong');
    statValue.textContent = value;
    stat.append(statLabel, statValue);
    listEl.appendChild(stat);
  });

  topicBreakdown.replaceChildren();
  const studentTopics = Object.values(progress.topics || {});
  if (!studentTopics.length) {
    topicBreakdown.appendChild(createTextElement('p', 'empty-state', 'No topic-specific results were recorded.'));
  } else {
    studentTopics.forEach((topic) => {
      const topicAttempts = Number(topic.attempts) || 0;
      const topicCorrect = Number(topic.correct) || 0;
      const topicWrong = Number(topic.wrong) || 0;
      const accuracy = topicAttempts ? Math.round((topicCorrect / topicAttempts) * 100) : 0;
      const line = createTextElement('div', 'game-topic-outcome');
      line.append(
        createTextElement('span', '', topic.topic || 'General'),
        createTextElement('strong', accuracy < 60 ? 'attention-text' : 'positive-text', `${topicCorrect} correct · ${topicWrong} incorrect · ${accuracy}%`)
      );
      topicBreakdown.appendChild(line);
    });
  }

  renderStudentGameQuestions(row, answersList);
  modal.style.display = 'flex';
}

function closeStudentDetailModal() {
  const modal = document.getElementById('studentDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ================= TOPIC DETAIL POPUP ================= */
function openTopicDetailModal(topicName, rows) {
  const modal = document.getElementById('topicDetailModal');
  const title = document.getElementById('detailModalTopic');
  const stats = document.getElementById('detailModalStats');
  const studentsList = document.getElementById('detailModalStudents');

  if (!modal || !title || !stats || !studentsList) return;

  title.textContent = topicName;

  let attempts = 0, correct = 0, wrong = 0;
  const studentRows = [];

  rows.forEach((row) => {
    const topicStats = Object.values(row.progress.topics || {});
    const stat = topicStats.find((s) => (s.topic || 'General') === topicName);
    if (!stat) return;
    const a = Number(stat.attempts) || 0;
    const c = Number(stat.correct) || 0;
    const w = Number(stat.wrong) || 0;
    attempts += a; correct += c; wrong += w;
    studentRows.push({ name: row.name, userId: row.userId, pin: row.pin, attempts: a, correct: c, wrong: w });
  });

  const acc = attempts ? Math.round((correct / attempts) * 100) : 0;
  stats.innerHTML = `
    <strong>Attempts:</strong> ${attempts} &nbsp;|&nbsp;
    <strong>Correct:</strong> ${correct} &nbsp;|&nbsp;
    <strong>Wrong:</strong> ${wrong} &nbsp;|&nbsp;
    <strong>Accuracy:</strong> ${acc}%
  `;

  studentsList.innerHTML = '';
  if (!studentRows.length) {
    studentsList.innerHTML = '<p style="color:#94a3b8; padding: 10px;">No student results are recorded for this topic.</p>';
  } else {
    studentRows.sort((a, b) => (a.attempts ? a.correct / a.attempts : 1) - (b.attempts ? b.correct / b.attempts : 1));
    studentRows.forEach((s) => {
      const accS = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 13px;';
      const summary = document.createElement('span');
      summary.style.color = accS < 60 ? '#fca5a5' : '#f8fafc';
      summary.textContent = `${s.name} · ${s.correct} correct · ${s.wrong} incorrect · ${accS}%`;
      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'btn btn-outline';
      viewButton.style.cssText = 'font-size: 11px; padding: 4px 10px;';
      viewButton.textContent = 'View activity';
      viewButton.addEventListener('click', () => {
        closeTopicDetailModal();
        const studentRow = rows.find((item) => item.userId === s.userId && item.pin === s.pin);
        if (studentRow) openStudentDetailModal(studentRow);
      });
      row.append(summary, viewButton);
      studentsList.appendChild(row);
    });
  }

  modal.style.display = 'flex';
}

function closeTopicDetailModal() {
  const modal = document.getElementById('topicDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ================= RECOMMENDATIONS ================= */
function renderRecommendations(rows) {
  recommendations.replaceChildren();
  const concerns = [];
  rows.forEach((row) => {
    const topicStats = Object.values(row.progress.topics || {});
    const repeatedIssues = topicStats
      .map((stats) => {
        const attempts = Number(stats.attempts) || 0;
        const wrong = Number(stats.wrong) || 0;
        return { topic: stats.topic || 'General', attempts, wrong, accuracy: attempts ? Math.round(((attempts - wrong) / attempts) * 100) : 100 };
      })
      .filter((stats) => stats.attempts >= 2 && stats.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy);

    if (row.tier === 'struggling' && !repeatedIssues.length) {
      concerns.push({ row, topic: 'Overall game accuracy', accuracy: row.accuracy, wrong: Number(row.progress.wrong_attempts) || 0, attempts: Number(row.progress.total_attempts) || 0 });
    } else {
      repeatedIssues.slice(0, 2).forEach((issue) => concerns.push({ row, ...issue }));
    }
  });

  concerns.sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);
  if (!concerns.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = rows.length ? 'No students currently meet the support indicators. Well done!' : 'Student support indicators appear after game answers are recorded.';
    recommendations.appendChild(empty);
    return;
  }

  concerns.slice(0, 12).forEach(({ row, topic, accuracy, wrong, attempts }) => {
    const recommendation = document.createElement('div');
    recommendation.className = 'recommendation-row';
    const name = document.createElement('strong');
    name.textContent = row.name;
    const message = document.createElement('span');
    message.textContent = `${topic} · ${accuracy}% accuracy · ${wrong} incorrect of ${attempts} attempts`;
    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'btn btn-outline';
    viewButton.textContent = 'View game details';
    viewButton.addEventListener('click', () => openStudentDetailModal(row));
    recommendation.append(name, message, viewButton);
    recommendations.appendChild(recommendation);
  });
}

function getAttemptRecords(row) {
  const records = new Map(
    Object.entries(row.progress.events || {})
      .filter(([, event]) => Boolean(event))
      .map(([key, event]) => [event.event_id || key, event])
  );

  Object.entries(misconceptionLogs).forEach(([key, log]) => {
    if (!log || log.user_id !== row.userId || log.session_pin !== row.pin) return;
    const eventKey = log.event_id || key;
    if (!records.has(eventKey)) records.set(eventKey, log);
  });

  return [...records.values()].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
}

function formatAnswerValue(value, fallback = 'Not recorded') {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join(' → ') : fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getQuestionData(setId, questionId, questionObject) {
  const savedQuestion = questionObject?.data || questionObject || {};
  return Object.keys(savedQuestion).length
    ? savedQuestion
    : questionBankData[setId]?.items?.[questionId] || {};
}

function getQuestionIdentity(questionObject, index = 0) {
  const question = questionObject?.data || questionObject || {};
  return {
    setId: String(questionObject?.setId || ''),
    questionId: String(questionObject?.itemKey || question.question_id || `question_${index + 1}`)
  };
}

function getAnswerDetails(question, event) {
  const correctAnswer = event?.correct_answer
    ?? event?.expected_answer
    ?? question.correct_answer
    ?? question.correct_order
    ?? question.correct_items
    ?? (question.correct_fix
      ? `Line ${question.bug_line || 'unknown'}: ${question.correct_fix}`
      : undefined)
    ?? question.options?.[Number(question.correct_option_index)];
  const prompt = question.question_text || question.instruction || question.question_template || '';
  return {
    prompt: prompt || 'Question details unavailable',
    mechanism: event?.mechanism || question.mechanism || question.type || 'Question',
    studentAnswer: event
      ? formatAnswerValue(event.answer ?? event.wrong_answer, event.timed_out ? 'Timed out' : 'Not recorded')
      : 'Not answered',
    correctAnswer: formatAnswerValue(correctAnswer, 'Correct answer unavailable')
  };
}

function createOutcomeTag(event) {
  const badge = document.createElement('span');
  if (!event) {
    badge.className = 'result-tag result-unanswered';
    badge.textContent = 'Not answered';
    return badge;
  }
  const isCorrect = event.is_correct === true || event.is_correct === 'true';
  badge.className = `result-tag ${isCorrect ? 'result-correct' : 'result-incorrect'}`;
  badge.textContent = isCorrect ? 'Correct' : event.timed_out ? 'Timed out' : 'Incorrect';
  return badge;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function createAnswerPanel(label, value, tone = '') {
  const panel = createTextElement('div', `game-answer-panel${tone ? ` ${tone}` : ''}`);
  panel.append(
    createTextElement('span', '', label),
    createTextElement('strong', '', value)
  );
  return panel;
}

function appendCodeLines(parent, snippet, targetLine = 0) {
  const lines = String(snippet || '').split('\n');
  const code = createTextElement('div', 'game-code-lines');
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const lineElement = createTextElement('div', `game-code-line${lineNumber === targetLine ? ' is-target' : ''}`);
    lineElement.append(
      createTextElement('span', 'game-code-line-number', lineNumber),
      createTextElement('span', '', line)
    );
    code.appendChild(lineElement);
  });
  parent.appendChild(code);
}

function normalizeMechanism(value, question) {
  const mechanism = String(value || question.mechanism || question.type || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (['mcq', 'multiple_choice', 'multiplechoice'].includes(mechanism)) return 'multiple-choice';
  if (['bug', 'bug_sniper', 'find_bug'].includes(mechanism)) return 'bug-sniper';
  if (['catch', 'catch_collect', 'catch_and_collect'].includes(mechanism)) return 'catch-and-collect';
  if (['drag_drop', 'dragdrop', 'fitb', 'rearrange', 'parsons'].includes(mechanism)) {
    return question.question_template || question.correct_answer ? 'fill-in-the-blank' : 'code-order';
  }
  return mechanism.replace(/_/g, ' ') || 'game question';
}

function appendQuestionMechanic(card, question, event, details, mechanism) {
  const content = createTextElement('div', 'game-question-content');
  if (mechanism !== 'fill-in-the-blank' || details.prompt !== question.question_template) {
    content.appendChild(createTextElement('div', 'game-question-prompt', details.prompt));
  }

  if (question.code_snippet && mechanism !== 'bug-sniper') {
    content.appendChild(createTextElement('div', 'game-question-code-label', 'Code snippet'));
    content.appendChild(createTextElement('pre', 'game-question-code', question.code_snippet));
  }

  if (mechanism === 'multiple-choice') {
    const options = Array.isArray(question.options) ? question.options : [];
    const selected = event ? formatAnswerValue(event.answer ?? event.wrong_answer, '') : '';
    const correct = question.correct_answer !== undefined
      ? String(question.correct_answer)
      : question.options?.[Number(question.correct_option_index)];
    const choices = createTextElement('div', 'game-choice-list');
    options.forEach((option, index) => {
      const optionText = String(option);
      const isCorrect = optionText === String(correct);
      const isSelected = optionText === selected;
      const choice = createTextElement('div', `game-choice${isCorrect ? ' is-correct' : ''}${isSelected && !isCorrect ? ' is-selected-wrong' : ''}`);
      choice.append(
        createTextElement('span', 'game-choice-marker', String.fromCharCode(65 + index)),
        createTextElement('span', '', optionText)
      );
      choices.appendChild(choice);
    });
    content.appendChild(choices);
  } else if (mechanism === 'bug-sniper') {
    if (question.code_snippet) appendCodeLines(content, question.code_snippet, Number(question.bug_line) || 0);
    const correctFix = question.correct_fix
      ? `Line ${question.bug_line || 'unknown'}: ${question.correct_fix}`
      : details.correctAnswer;
    const studentFix = event ? details.studentAnswer : 'Not answered';
    const answerPanels = createTextElement('div', 'game-answer-grid');
    answerPanels.append(
      createAnswerPanel('Student selection / fix', studentFix, event && !(event.is_correct === true || event.is_correct === 'true') ? 'is-wrong' : ''),
      createAnswerPanel('Expected bug line', question.bug_line ? `Line ${question.bug_line}` : 'Not specified'),
      createAnswerPanel('Correct fix', correctFix, 'is-correct')
    );
    content.appendChild(answerPanels);
  } else if (mechanism === 'fill-in-the-blank') {
    const template = String(question.question_template || question.question_text || '');
    const templatePanel = createTextElement('div', 'game-question-code');
    const blankIndex = template.indexOf('[BLANK]');
    if (blankIndex >= 0) {
      templatePanel.append(
        document.createTextNode(template.slice(0, blankIndex)),
        createTextElement('strong', '', event ? details.studentAnswer : '[BLANK]'),
        document.createTextNode(template.slice(blankIndex + '[BLANK]'.length))
      );
    } else {
      templatePanel.textContent = template || details.prompt;
    }
    content.appendChild(templatePanel);
    content.appendChild(createAnswerPanel('Correct block', details.correctAnswer, 'is-correct'));
  } else if (mechanism === 'code-order') {
    const correctOrder = Array.isArray(question.correct_order)
      ? question.correct_order
      : Array.isArray(question.options) ? question.options.slice().sort() : [];
    const orderPanel = createTextElement('div', 'game-answer-grid');
    const studentSequence = createTextElement('div', 'game-answer-panel');
    studentSequence.appendChild(createTextElement('span', '', 'Student order'));
    studentSequence.appendChild(createTextElement('strong', '', event ? details.studentAnswer : 'Not answered'));
    const correctSequence = createTextElement('div', 'game-answer-panel is-correct');
    correctSequence.appendChild(createTextElement('span', '', 'Correct order'));
    correctSequence.appendChild(createTextElement('strong', '', formatAnswerValue(correctOrder, 'Correct order unavailable')));
    orderPanel.append(studentSequence, correctSequence);
    content.appendChild(orderPanel);
  } else if (mechanism === 'catch-and-collect') {
    const targets = Array.isArray(question.correct_items) ? question.correct_items : [];
    const targetPanel = createTextElement('div', 'game-answer-panel is-correct');
    targetPanel.append(
      createTextElement('span', '', 'Target items'),
      createTextElement('strong', '', formatAnswerValue(targets, 'Target items unavailable'))
    );
    content.appendChild(targetPanel);
  }

  const answerPanels = createTextElement('div', 'game-answer-grid');
  const isCorrect = event && (event.is_correct === true || event.is_correct === 'true');
  answerPanels.append(
    createAnswerPanel('Student answer', details.studentAnswer, event ? (isCorrect ? 'is-correct' : 'is-wrong') : ''),
    createAnswerPanel('Correct answer', details.correctAnswer, 'is-correct')
  );
  content.appendChild(answerPanels);

  if (event && Number(event.elapsed_seconds) > 0) {
    content.appendChild(createTextElement('p', 'game-history-label', `Time spent: ${Number(event.elapsed_seconds)} seconds`));
  }
  card.appendChild(content);
}

function appendPreviousAttempts(card, attempts) {
  if (attempts.length < 2) return;
  const history = createTextElement('div', '');
  attempts.slice(0, -1).forEach((event, index) => {
    const entry = createTextElement('div', 'game-history-entry');
    const header = createTextElement('div', 'game-question-meta');
    header.append(
      createTextElement('span', 'game-history-label', `Attempt ${index + 1}`),
      createOutcomeTag(event),
      createTextElement('span', 'game-history-label', formatDate(event.timestamp))
    );
    entry.append(
      header,
      createTextElement('p', '', `Student answer: ${formatAnswerValue(event.answer ?? event.wrong_answer, event.timed_out ? 'Timed out' : 'Not recorded')}`)
    );
    history.appendChild(entry);
  });
  card.appendChild(history);
}

function renderStudentGameQuestions(row, container) {
  if (!container) return;
  container.replaceChildren();

  const session = sessionsData[row.pin] || {};
  const questions = Array.isArray(session.compiled_questions)
    ? session.compiled_questions
    : Array.isArray(session.custom_questions) ? session.custom_questions : [];
  const events = getAttemptRecords(row).reverse();
  const questionRecords = questions.map((questionObject, index) => {
    const identity = getQuestionIdentity(questionObject, index);
    const matchingEvents = events.filter((event) =>
      String(event.question_id || '') === identity.questionId &&
      (!event.set_id || !identity.setId || String(event.set_id) === identity.setId)
    );
    return { questionObject, identity, matchingEvents };
  });

  const matchedEvents = new Set(questionRecords.flatMap(({ matchingEvents }) => matchingEvents));
  const unlistedEvents = events.filter((event) => !matchedEvents.has(event));
  const unlistedGroups = new Map();
  unlistedEvents.forEach((event) => {
    const key = `${event.set_id || 'set'}:${event.question_id || event.event_id}`;
    const group = unlistedGroups.get(key) || { event, matchingEvents: [] };
    group.matchingEvents.push(event);
    unlistedGroups.set(key, group);
  });
  unlistedGroups.forEach(({ event, matchingEvents }) => {
    const identity = { setId: String(event.set_id || ''), questionId: String(event.question_id || event.event_id || '') };
    const question = getQuestionData(identity.setId, identity.questionId);
    questionRecords.push({ questionObject: { ...question, setId: identity.setId, itemKey: identity.questionId, data: question }, identity, matchingEvents });
  });

  if (!questionRecords.length) {
    container.appendChild(createTextElement('p', 'empty-state', 'No game questions or answer records are available for this session.'));
    return;
  }

  questionRecords.forEach(({ questionObject, identity, matchingEvents }, index) => {
    const question = getQuestionData(identity.setId, identity.questionId, questionObject);
    const latestEvent = matchingEvents[matchingEvents.length - 1] || null;
    const details = getAnswerDetails(question, latestEvent);
    const mechanism = normalizeMechanism(latestEvent?.mechanism, question);
    const card = createTextElement('article', `game-question-card mechanism-${mechanism.replace(/[^a-z0-9-]/g, '-')}`);
    const header = createTextElement('header', 'game-question-header');
    const heading = createTextElement('strong', '', `Question ${index + 1}`);
    const metadata = createTextElement('div', 'game-question-meta');
    metadata.append(
      createTextElement('span', 'game-question-topic', question.topic || latestEvent?.topic || 'General'),
      createTextElement('span', 'game-mechanic-tag', mechanism),
      createOutcomeTag(latestEvent)
    );
    header.append(heading, metadata);
    card.appendChild(header);
    appendQuestionMechanic(card, question, latestEvent, details, mechanism);
    appendPreviousAttempts(card, matchingEvents);
    container.appendChild(card);
  });
}

function appendCell(row, value, className = '') {
  const cell = document.createElement('td');
  cell.textContent = String(value ?? '');
  if (className) cell.className = className;
  row.appendChild(cell);
}

function appendEmptyRow(body, columnCount, text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = 'empty-state';
  cell.textContent = text;
  row.appendChild(cell);
  body.appendChild(row);
}

// Modal closing event listeners
document.getElementById('closeTopicDetailModal')?.addEventListener('click', closeTopicDetailModal);
document.getElementById('closeStudentDetailModal')?.addEventListener('click', closeStudentDetailModal);
window.addEventListener('click', (e) => {
  const topicModal = document.getElementById('topicDetailModal');
  const studentModal = document.getElementById('studentDetailModal');
  if (topicModal && e.target === topicModal) closeTopicDetailModal();
  if (studentModal && e.target === studentModal) closeStudentDetailModal();
});

function showAnalyticsError(error) {
  console.error('Unable to load lecturer analytics:', error);
  metrics.textContent = 'Analytics could not be loaded.';
}