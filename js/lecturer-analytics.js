import { database } from "./firebase-config.js";
import { ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
if (!currentUser || currentUser.role !== 'lecturer') {
  window.location.href = 'login.html';
}

const sessionFilter = document.getElementById('sessionFilter');
const studentFilter = document.getElementById('studentFilter');
const masteryFilter = document.getElementById('masteryFilter');
const metrics = document.getElementById('analyticsMetrics');
const studentProgressBody = document.getElementById('studentProgressBody');
const topicPerformanceBody = document.getElementById('topicPerformanceBody');
const recommendations = document.getElementById('recommendations');
const wrongAnswersBody = document.getElementById('wrongAnswersBody');

let sessionsData = {};
let progressData = {};
let misconceptionLogs = {};
let questionBankData = {};
let topicChart = null;
let masteryPieChart = null;

sessionFilter.addEventListener('change', renderAnalytics);
studentFilter.addEventListener('change', renderAnalytics);
if (masteryFilter) {
  masteryFilter.addEventListener('change', renderAnalytics);
}

onValue(ref(database, 'GAME_SESSIONS'), (snapshot) => {
  sessionsData = snapshot.val() || {};
  renderAnalytics();
}, showAnalyticsError);

onValue(ref(database, 'PLAYER_PROGRESS'), (snapshot) => {
  progressData = snapshot.val() || {};
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
  replaceOptions(sessionFilter, [
    { value: 'all', label: 'All my game sessions' },
    ...ownedSessions.map(([pin, session]) => ({ value: pin, label: `${session.session_title || 'Game'} · ${pin}` }))
  ], selectedPin);
  replaceOptions(studentFilter, [
    { value: 'all', label: 'All students' },
    ...[...new Map(rows.map((row) => [row.userId, row.name])).entries()]
      .map(([value, label]) => ({ value, label }))
  ], selectedStudent);
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
    (studentFilter.value === 'all' || row.userId === studentFilter.value)
  );

  // Render Charts based on session & student context
  renderMetrics(baseFiltered, ownedSessions);
  renderMasteryPieChart(baseFiltered);
  renderTopicChart(baseFiltered);
  renderTopics(baseFiltered);
  renderRecommendations(baseFiltered);
  renderWrongAnswers(baseFiltered, ownedSessions);

  // Apply tier filter to the student list
  const selectedMastery = masteryFilter ? masteryFilter.value : 'all';
  const visibleRows = baseFiltered.filter((row) => 
    selectedMastery === 'all' || row.tier === selectedMastery
  );

  renderStudentProgress(visibleRows);
}

function renderMetrics(rows, sessions) {
  const students = new Set(rows.map((row) => row.userId));
  const completed = rows.filter((row) => row.progress.is_completed).length;
  const strugglingCount = rows.filter((row) => row.tier === 'struggling').length;

  metrics.replaceChildren();
  [
    [`${students.size}`, 'students'],
    [`${new Set(rows.map((row) => row.pin)).size}`, 'sessions in view'],
    [`${completed}`, 'completed sessions'],
    [`${strugglingCount}`, 'needing support (<50%)']
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
  if (countLabel) countLabel.textContent = `${validRows.length} Active Records`;

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
    tr.addEventListener('click', () => openStudentDetailModal(row));

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
    const topicStats = sessionFilter.value === 'all'
      ? Object.values(progressData[row.userId]?.topics || {})
      : Object.values(row.progress.topics || {});
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

/* ================= STUDENT DETAIL POPUP ================= */
function openStudentDetailModal(row) {
  const modal = document.getElementById('studentDetailModal');
  const nameEl = document.getElementById('studentModalName');
  const sessionEl = document.getElementById('studentModalSession');
  const statsEl = document.getElementById('studentModalStats');
  const listEl = document.getElementById('studentModalTopicsList');
  const assignBtn = document.getElementById('studentModalAssignBtn');

  if (!modal || !nameEl) return;

  nameEl.textContent = row.name;
  sessionEl.textContent = `${row.title} · Session PIN: ${row.pin}`;

  const progress = row.progress;
  const attempts = Number(progress.total_attempts) || 0;
  const correct = Number(progress.correct_attempts) || 0;
  const acc = attempts ? Math.round((correct / attempts) * 100) : 0;

  statsEl.innerHTML = `
    <strong>Score:</strong> ${row.score} pts &nbsp;|&nbsp;
    <strong>Attempts:</strong> ${attempts} &nbsp;|&nbsp;
    <strong>Overall Accuracy:</strong> ${acc}%
  `;

  const studentTopics = sessionFilter.value === 'all'
    ? Object.values(progressData[row.userId]?.topics || {})
    : Object.values(row.progress.topics || {});

  listEl.innerHTML = '';
  if (!studentTopics.length) {
    listEl.innerHTML = '<p style="color:#94a3b8; padding: 10px;">No detailed topic records captured for this student.</p>';
    if (assignBtn) assignBtn.style.display = 'none';
  } else {
    let weakestTopic = null;
    let highestWrong = -1;

    studentTopics.forEach((st) => {
      const a = Number(st.attempts) || 0;
      const c = Number(st.correct) || 0;
      const w = Number(st.wrong) || 0;
      const accuracy = a ? Math.round((c / a) * 100) : 0;

      if (w > highestWrong && a >= 2) {
        highestWrong = w;
        weakestTopic = st.topic;
      }

      const div = document.createElement('div');
      div.style.cssText = 'display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #334155; font-size:12px;';
      div.innerHTML = `
        <span style="color:#f8fafc;">${escapeHtml(st.topic || 'General')}</span>
        <span style="color:${accuracy < 60 ? '#fca5a5' : '#6ee7b7'}; font-weight:600;">
          ${c}/${a} correct (${accuracy}%)
        </span>
      `;
      listEl.appendChild(div);
    });

    if (weakestTopic && assignBtn) {
      assignBtn.style.display = 'block';
      assignBtn.textContent = `Assign Adaptive Practice on '${weakestTopic}'`;
      assignBtn.onclick = () => {
        assignAdaptivePractice({ userId: row.userId, name: row.name, topic: weakestTopic, attempts: 3, wrong: highestWrong }, assignBtn);
      };
    } else if (assignBtn) {
      assignBtn.style.display = 'none';
    }
  }

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
  const assignBtn = document.getElementById('detailModalAssign');

  if (!modal || !title || !stats || !studentsList) return;

  title.textContent = topicName;

  let attempts = 0, correct = 0, wrong = 0;
  const studentRows = [];

  rows.forEach((row) => {
    const topicStats = sessionFilter.value === 'all'
      ? Object.values(progressData[row.userId]?.topics || {})
      : Object.values(row.progress.topics || {});
    const stat = topicStats.find((s) => (s.topic || 'General') === topicName);
    if (!stat) return;
    const a = Number(stat.attempts) || 0;
    const c = Number(stat.correct) || 0;
    const w = Number(stat.wrong) || 0;
    attempts += a; correct += c; wrong += w;
    studentRows.push({ name: row.name, userId: row.userId, attempts: a, correct: c, wrong: w });
  });

  const acc = attempts ? Math.round((correct / attempts) * 100) : 0;
  stats.innerHTML = `
    <strong>Attempts:</strong> ${attempts} &nbsp;|&nbsp;
    <strong>Correct:</strong> ${correct} &nbsp;|&nbsp;
    <strong>Wrong:</strong> ${wrong} &nbsp;|&nbsp;
    <strong>Accuracy:</strong> ${acc}%
  `;

  const needAttention = studentRows.filter((s) => s.attempts >= 2 && (s.wrong / s.attempts) > 0.4);

  studentsList.innerHTML = '';
  if (!needAttention.length) {
    studentsList.innerHTML = '<p style="color:#94a3b8; padding: 10px;">No students meet the attention threshold for this topic.</p>';
    assignBtn.style.display = 'none';
  } else {
    needAttention.forEach((s) => {
      const accS = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 13px;';
      row.innerHTML = `
        <span style="color: #f8fafc;"><strong>${escapeHtml(s.name)}</strong> · ${s.wrong}/${s.attempts} wrong · ${accS}%</span>
        <button class="btn btn-outline" style="font-size: 11px; padding: 4px 10px;">Assign</button>
      `;
      row.querySelector('button').addEventListener('click', () => assignAdaptivePractice({ ...s, topic: topicName }, row.querySelector('button')));
      studentsList.appendChild(row);
    });
    assignBtn.style.display = 'block';
    assignBtn.onclick = () => {
      needAttention.forEach((s) => {
        assignAdaptivePractice({ ...s, topic: topicName }, assignBtn);
      });
      assignBtn.textContent = `Assigning to ${needAttention.length} students...`;
      assignBtn.disabled = true;
      setTimeout(() => { assignBtn.textContent = 'Assigned'; }, 1500);
    };
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
  const studentTopics = new Map();
  const recommendationRows = sessionFilter.value === 'all'
    ? [...new Map(rows.map((row) => [row.userId, row])).values()]
    : rows;
  recommendationRows.forEach((row) => {
    const topicStats = sessionFilter.value === 'all'
      ? Object.values(progressData[row.userId]?.topics || {})
      : Object.values(row.progress.topics || {});
    topicStats.forEach((stats) => {
      const attempts = Number(stats.attempts) || 0;
      const wrong = Number(stats.wrong) || 0;
      if (attempts < 2 || wrong / attempts <= 0.4) return;
      const key = `${row.userId}:${stats.topic || 'General'}`;
      const item = studentTopics.get(key) || { userId: row.userId, name: row.name, topic: stats.topic || 'General', attempts: 0, wrong: 0 };
      item.attempts += attempts;
      item.wrong += wrong;
      studentTopics.set(key, item);
    });
  });

  const items = [...studentTopics.values()].sort((a, b) => b.wrong / b.attempts - a.wrong / a.attempts);
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = rows.length ? 'No topic currently meets the attention threshold. Well done!' : 'Recommendations appear when student attempts are available.';
    recommendations.appendChild(empty);
    return;
  }

  items.slice(0, 12).forEach((item) => {
    const recommendation = document.createElement('div');
    recommendation.className = 'recommendation-row';
    const message = document.createElement('span');
    message.textContent = `Review ${item.topic} with ${item.name}: ${item.wrong} of ${item.attempts} attempts were incorrect.`;
    const assignButton = document.createElement('button');
    assignButton.type = 'button';
    assignButton.className = 'btn btn-outline';
    assignButton.style.marginTop = '8px';
    assignButton.textContent = 'Assign adaptive practice';
    assignButton.addEventListener('click', () => assignAdaptivePractice(item, assignButton));
    recommendation.append(message, document.createElement('br'), assignButton);
    recommendations.appendChild(recommendation);
  });
}

async function assignAdaptivePractice(item, button) {
  const questions = [];
  Object.entries(questionBankData).forEach(([setId, setData]) => {
    Object.entries(setData.items || {}).forEach(([itemKey, question]) => {
      if ((question.topic || 'General') === item.topic) {
        questions.push({ set_id: setId, item_key: itemKey });
      }
    });
  });

  if (!questions.length) {
    button.textContent = 'No questions for this topic';
    button.disabled = true;
    return;
  }

  button.disabled = true;
  button.textContent = 'Assigning...';
  try {
    const assignmentRef = push(ref(database, `PRACTICE_ASSIGNMENTS/${item.userId}`));
    await set(assignmentRef, {
      assignment_id: assignmentRef.key,
      student_id: item.userId,
      student_name: item.name,
      lecturer_id: currentUser.user_id,
      lecturer_name: currentUser.name || 'Lecturer',
      topic: item.topic,
      created_at: Date.now(),
      status: 'assigned',
      evidence: {
        attempts: item.attempts,
        wrong: item.wrong,
        accuracy: Math.round(((item.attempts - item.wrong) / item.attempts) * 100)
      },
      questions
    });
    button.textContent = 'Practice assigned';
  } catch (error) {
    console.error('Unable to assign adaptive practice:', error);
    button.disabled = false;
    button.textContent = 'Retry assignment';
  }
}

function renderWrongAnswers(rows, ownedSessions) {
  const allowedPins = new Set(ownedSessions.map(([pin]) => pin));
  const visibleUsers = new Set(rows.map((row) => row.userId));
  const logs = Object.values(misconceptionLogs)
    .filter((log) => (allowedPins.has(log.session_pin) || (log.source === 'adaptive_practice' && log.lecturer_id === currentUser.user_id)) && (studentFilter.value === 'all' || visibleUsers.has(log.user_id)))
    .filter((log) => sessionFilter.value === 'all' || log.session_pin === sessionFilter.value)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 30);

  wrongAnswersBody.replaceChildren();
  if (!logs.length) return appendEmptyRow(wrongAnswersBody, 6, 'No incorrect answer records for these filters.');
  logs.forEach((log) => {
    const tr = document.createElement('tr');
    appendCell(tr, log.student_name || progressData[log.user_id]?.name || log.user_id || 'Student');
    appendCell(tr, log.session_pin || '');
    appendCell(tr, log.topic || 'General');
    appendCell(tr, `${log.set_id || ''} / ${log.question_id || ''}`);
    appendCell(tr, log.wrong_answer || log.failure_type || 'No answer captured');
    appendCell(tr, log.timestamp ? new Date(Number(log.timestamp)).toLocaleString() : '');
    wrongAnswersBody.appendChild(tr);
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text === undefined || text === null ? '' : String(text);
  return div.innerHTML;
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
