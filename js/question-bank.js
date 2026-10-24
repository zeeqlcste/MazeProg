import { database } from "./firebase-config.js";
import {
  ref,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ELEMENTS
const questionGrid = document.getElementById("questionGrid");
const modal = document.getElementById("questionModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addQuestionForm = document.getElementById("addQuestionForm");
const questionsContainer = document.getElementById("questionsContainer");
const addQuestionBlockBtn = document.getElementById("addQuestionBlockBtn");

// DETAIL MODAL
const viewDetailModal = document.getElementById("viewDetailModal");
const closeDetailModalBtn = document.getElementById("closeDetailModalBtn");
const detailTitle = document.getElementById("detailTitle");
const detailQuestionCount = document.getElementById("detailQuestionCount");
const detailPublisher = document.getElementById("detailPublisher");
const detailQuestionsList = document.getElementById("detailQuestionsList");

let questionCount = 0;
let cachedQuestions = {};

// MODAL CONTROLS
if (openModalBtn) {
  openModalBtn.onclick = () => {
    modal.style.display = "flex";
    if (questionsContainer.children.length === 0) {
      addNewQuestionBlock();
    }
  };
}

if (closeModalBtn) closeModalBtn.onclick = () => modal.style.display = "none";
if (closeDetailModalBtn) closeDetailModalBtn.onclick = () => viewDetailModal.style.display = "none";

window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
  if (e.target === viewDetailModal) viewDetailModal.style.display = "none";
};

// ADD NEW QUESTION BLOCK
function addNewQuestionBlock() {
  questionCount++;
  const blockIndex = questionCount;

  const qBlock = document.createElement("div");
  qBlock.className = "question-item-block";
  qBlock.style.cssText = `
    background: #0f172a;
    padding: 14px;
    border-radius: 8px;
    margin-bottom: 14px;
    border: 1px solid #334155;
  `;

  qBlock.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <strong style="color: #38bdf8;">Question #${blockIndex}</strong>
      ${blockIndex > 1 ? `<button type="button" class="remove-q-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold;">Delete</button>` : ""}
    </div>

    <div style="display: flex; gap: 10px; margin-bottom: 12px;">
      <div style="flex: 1;">
        <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">C++ Topic Category</label>
        <select class="item-topic-select" required style="width: 100%; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 4px;">
          <optgroup label="Syntax">
            <option value="Basic Syntax Rules">Basic Syntax Rules</option>
            <option value="Data Type and Operators">Data Type and Operators</option>
          </optgroup>
          <optgroup label="Control Structure">
            <option value="Sequential Control">Sequential Control</option>
            <option value="Selection Control">Selection Control</option>
            <option value="Iteration Control">Iteration Control</option>
          </optgroup>
        </select>
      </div>

      <div style="flex: 1;">
        <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Difficulty Level</label>
        <select class="item-difficulty-select" required style="width: 100%; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 4px;">
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>
    </div>

    <div style="margin-bottom: 10px;">
      <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Mechanism for this question:</label>
      <select class="item-mechanism-select" style="width: 100%; padding: 7px; background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; border-radius: 4px; font-weight: bold;">
        <option value="mcq">Multiple Choice Questions (MCQ)</option>
        <option value="drag_drop">Drag & Drop (Fill-in-the-Blank Slot)</option>
        <option value="bug_sniper">Bug Sniper (Debugging)</option>
        <option value="catch_collect">Catch & Collect (Raindrop)</option>
      </select>
    </div>

    <div class="mechanism-fields-container"></div>
  `;

  const mechSelect = qBlock.querySelector(".item-mechanism-select");
  const fieldsContainer = qBlock.querySelector(".mechanism-fields-container");

  const renderFields = () => {
    const selectedMech = mechSelect.value;
    fieldsContainer.innerHTML = "";

    // MCQ
    if (selectedMech === "mcq") {
      fieldsContainer.innerHTML = `
        <input type="text" class="q-text-input" placeholder="Enter C++ question..." required style="width: 100%; padding: 7px; margin-bottom: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
        <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">Answer Options (Check ✔️ for correct answer):</label>
        <div class="answers-container"></div>
        <button type="button" class="add-ans-btn btn btn-outline" style="font-size: 11px; padding: 4px 8px; margin-top: 8px;">+ Add Option</button>
      `;
      const answersContainer = fieldsContainer.querySelector(".answers-container");
      addMcqOptionInput(answersContainer, blockIndex);
      addMcqOptionInput(answersContainer, blockIndex);

      fieldsContainer.querySelector(".add-ans-btn").onclick = () => {
        addMcqOptionInput(answersContainer, blockIndex);
      };
    }

    // DRAG & DROP (FILL IN THE BLANK)
    else if (selectedMech === "drag_drop") {
      fieldsContainer.innerHTML = `
        <div style="margin-bottom: 10px;">
          <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">
            Question / Code Template (Guna <b style="color:#38bdf8;">[BLANK]</b> untuk tempat kosong):
          </label>
          <input type="text" class="q-blank-template" placeholder="Contoh: Abu suka [BLANK] nasi. ATAU cout << [BLANK] << endl;" required style="width: 100%; padding: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 10px;">
          <label style="font-size: 12px; color: #10b981; font-weight: bold; display: block; margin-bottom: 4px;">
            ✔️ Correct Answer for [BLANK]:
          </label>
          <input type="text" class="q-blank-correct" placeholder="Contoh: makan ATAU 'Hello World'" required style="width: 100%; padding: 8px; background: #1e293b; color: #10b981; border: 1px solid #10b981; border-radius: 4px; font-weight: bold;">
        </div>

        <div style="margin-bottom: 10px;">
          <label style="font-size: 12px; color: #ef4444; font-weight: bold; display: block; margin-bottom: 4px;">
            ✖️ Wrong Options / Distractors (Blok perangkap di bawah):
          </label>
          <div class="distractor-blocks-list"></div>
          <button type="button" class="add-distractor-btn btn btn-outline" style="font-size: 11px; padding: 4px 8px; margin-top: 6px; border-color: #ef4444; color: #ef4444;">+ Add Wrong Option</button>
        </div>
      `;

      const distractorContainer = fieldsContainer.querySelector(".distractor-blocks-list");
      addDistractorBlockInput(distractorContainer);
      addDistractorBlockInput(distractorContainer);

      fieldsContainer.querySelector(".add-distractor-btn").onclick = () => {
        addDistractorBlockInput(distractorContainer);
      };
    }

    // BUG SNIPER
    else if (selectedMech === "bug_sniper") {
      fieldsContainer.innerHTML = `
        <textarea class="code-snippet-input" placeholder="Enter C++ code snippet containing a bug..." required style="width: 100%; height: 90px; padding: 7px; margin-bottom: 8px; font-family: monospace; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;"></textarea>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="number" class="bug-line-input" placeholder="Bug Line Number (e.g., 2)" required style="flex: 1; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
          <input type="text" class="bug-fix-input" placeholder="Correct Code Replacement" required style="flex: 2; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
        </div>
      `;
    }

    // CATCH & COLLECT
    else if (selectedMech === "catch_collect") {
      fieldsContainer.innerHTML = `
        <input type="text" class="q-text-input" placeholder="Target Task (e.g., Catch all valid C++ Data Types!)..." required style="width: 100%; padding: 7px; margin-bottom: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <label style="font-size: 11px; color: #10b981;">Correct Items (comma separated):</label>
            <input type="text" class="correct-items-input" placeholder="int, float, char" required style="width: 100%; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
          </div>
          <div style="flex: 1;">
            <label style="font-size: 11px; color: #ef4444;">Wrong Items (comma separated):</label>
            <input type="text" class="wrong-items-input" placeholder="integer, Decimal, String" required style="width: 100%; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
          </div>
        </div>
      `;
    }

    fieldsContainer.insertAdjacentHTML("beforeend", `
      <div style="margin-top: 10px;">
        <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Practice hint (optional)</label>
        <textarea class="q-hint-input" rows="2" placeholder="A small clue that guides thinking without revealing the answer" style="width: 100%; padding: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;"></textarea>
      </div>
    `);
  };

  mechSelect.onchange = renderFields;
  renderFields();

  const removeBtn = qBlock.querySelector(".remove-q-btn");
  if (removeBtn) removeBtn.onclick = () => qBlock.remove();

  questionsContainer.appendChild(qBlock);
}

// INPUT BUILDERS
function addMcqOptionInput(container, qIndex) {
  const ansDiv = document.createElement("div");
  ansDiv.style.cssText = "display: flex; gap: 8px; margin-top: 6px; align-items: center;";
  ansDiv.innerHTML = `
    <label title="Mark as correct answer" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; color: #10b981;">
      <input type="radio" name="correct_ans_${qIndex}" class="correct-radio" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;">
      ✔️
    </label>
    <input type="text" class="ans-text-input" placeholder="Option text..." required style="flex: 1; padding: 7px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 4px;">
    <button type="button" style="background: none; border: none; color: #ef4444; cursor: pointer;" onclick="this.parentElement.remove()">&times;</button>
  `;
  if (container.querySelectorAll(".correct-radio").length === 0) {
    ansDiv.querySelector(".correct-radio").checked = true;
  }
  container.appendChild(ansDiv);
}

function addDistractorBlockInput(container) {
  const blockDiv = document.createElement("div");
  blockDiv.style.cssText = "display: flex; gap: 8px; margin-top: 6px; align-items: center;";
  blockDiv.innerHTML = `
    <span style="color: #ef4444; font-size: 12px; width: 50px;">Wrong:</span>
    <input type="text" class="distractor-text-input" placeholder="Distractor option (e.g. minum)" required style="flex: 1; padding: 7px; font-family: monospace; background: #1e293b; color: #fff; border: 1px solid #ef4444; border-radius: 4px;">
    <button type="button" style="background: none; border: none; color: #ef4444; cursor: pointer;" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(blockDiv);
}

if (addQuestionBlockBtn) addQuestionBlockBtn.onclick = () => addNewQuestionBlock();

// READ FIREBASE DATA
const questionsRef = ref(database, "QUESTIONS");

onValue(questionsRef, (snapshot) => {
  if (!questionGrid) return;
  questionGrid.innerHTML = "";

  if (snapshot.exists()) {
    cachedQuestions = snapshot.val();
    Object.keys(cachedQuestions).forEach((key) => renderCard(cachedQuestions[key]));
  } else {
    questionGrid.innerHTML = `<p style="color: #94a3b8; grid-column: 1/-1;">No questions found. Click "+ Add New Question Set" to create one.</p>`;
  }
});

// RENDER CARD
function renderCard(q) {
  const card = document.createElement("div");
  card.className = "question-card";
  card.style.cssText = "background: #1e293b; border: 1px solid #334155; padding: 16px; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 150px;";

  const totalSubQ = q.items ? Object.keys(q.items).length : 0;
  let easyCount = 0, mediumCount = 0, hardCount = 0;

  if (q.items) {
    Object.values(q.items).forEach((item) => {
      if (item.difficulty === "Easy") easyCount++;
      else if (item.difficulty === "Medium") mediumCount++;
      else if (item.difficulty === "Hard") hardCount++;
    });
  }

  card.innerHTML = `
    <div>
      <span class="card-badge" style="background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">C++ Question Set</span>
      <div class="card-title" style="font-weight: bold; color: #f8fafc; margin: 8px 0 6px 0;">${q.title || "Untitled Set"}</div>
      <small style="color: #cbd5e1; line-height: 1.8;">
        <strong>${totalSubQ}</strong> Questions <br>
        <span style="color:#22c55e;">Easy: ${easyCount}</span> &nbsp;|&nbsp;
        <span style="color:#f59e0b;">Medium: ${mediumCount}</span> &nbsp;|&nbsp;
        <span style="color:#ef4444;">Hard: ${hardCount}</span>
      </small>
    </div>
    <div class="card-publisher" style="font-size: 12px; color: #64748b; margin-top: 10px;">
      Published by: <strong style="color: #94a3b8;">${q.publisher || "MazeProg System"}</strong>
    </div>
  `;

  card.onclick = () => showQuestionDetails(q.question_id);
  questionGrid.appendChild(card);
}

// SHOW QUESTION DETAILS
function showQuestionDetails(questionId) {
  const q = cachedQuestions[questionId];
  if (!q) return;

  detailTitle.textContent = q.title || "Untitled Set";
  detailPublisher.textContent = q.publisher || "MazeProg System";
  const totalQuestions = q.items ? Object.keys(q.items).length : 0;
  detailQuestionCount.textContent = `${totalQuestions} Questions`;

  detailQuestionsList.innerHTML = "";

  if (q.items) {
    Object.keys(q.items).forEach((itemKey, index) => {
      const item = q.items[itemKey];
      const qDiv = document.createElement("div");
      qDiv.style.cssText = "background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #334155;";

      const topic = item.topic || "General";
      const difficulty = item.difficulty || "Easy";
      let difficultyColor = difficulty === "Easy" ? "#22c55e" : difficulty === "Medium" ? "#f59e0b" : "#ef4444";
      let contentHTML = "";
      const mech = item.mechanism || "mcq";

      if (mech === "mcq") {
        const opts = (item.options || []).map(opt => {
          const isCorrect = opt === item.correct_answer;
          return `<li style="color: ${isCorrect ? "#10b981" : "#cbd5e1"}; font-weight: ${isCorrect ? "bold" : "normal"};">${isCorrect ? "✔️ " : "⚪ "}${opt}</li>`;
        }).join("");

        contentHTML = `
          <div style="display:flex; gap:6px; margin-bottom:7px;">
            <span style="font-size:10px; background:#0284c7; padding:2px 6px; border-radius:3px; color:#fff;">MCQ</span>
            <span style="font-size:10px; background:#334155; padding:2px 6px; border-radius:3px; color:#38bdf8;">${topic}</span>
            <span style="font-size:10px; background:${difficultyColor}; padding:2px 6px; border-radius:3px; color:#fff;">${difficulty}</span>
          </div>
          <strong>${index + 1}. ${item.question_text || ""}</strong>
          <ul style="margin: 5px 0 0 15px; list-style: none;">${opts}</ul>
        `;
      } else if (mech === "drag_drop") {
        const distractStr = (item.distractors || []).join(", ");
        contentHTML = `
          <div style="display:flex; gap:6px; margin-bottom:7px;">
            <span style="font-size:10px; background:#eab308; padding:2px 6px; border-radius:3px; color:#000;">DRAG & DROP (BLANK)</span>
            <span style="font-size:10px; background:#334155; padding:2px 6px; border-radius:3px; color:#38bdf8;">${topic}</span>
            <span style="font-size:10px; background:${difficultyColor}; padding:2px 6px; border-radius:3px; color:#fff;">${difficulty}</span>
          </div>
          <strong>${index + 1}. ${item.question_template || ""}</strong>
          <div style="margin-top:6px; font-size:12px;">
            <span style="color:#10b981; font-weight:bold;">Correct Answer: [ ${item.correct_answer || ""} ]</span><br>
            <span style="color:#ef4444;">Wrong Options: ${distractStr || "None"}</span>
          </div>
        `;
      } else if (mech === "bug_sniper") {
        contentHTML = `
          <div style="display:flex; gap:6px; margin-bottom:7px;">
            <span style="font-size:10px; background:#ef4444; padding:2px 6px; border-radius:3px; color:#fff;">BUG SNIPER</span>
            <span style="font-size:10px; background:#334155; padding:2px 6px; border-radius:3px; color:#38bdf8;">${topic}</span>
            <span style="font-size:10px; background:${difficultyColor}; padding:2px 6px; border-radius:3px; color:#fff;">${difficulty}</span>
          </div>
          <strong>${index + 1}. Bug Snippet:</strong>
          <pre style="background:#1e293b; padding:6px; color:#f87171; border-radius:4px; margin:4px 0;">${item.code_snippet || ""}</pre>
          <small style="color:#94a3b8;">Bug Line: <strong>${item.bug_line || "-"}</strong> | Fix: <code style="color:#10b981;">${item.correct_fix || ""}</code></small>
        `;
      } else if (mech === "catch_collect") {
        const correctList = Array.isArray(item.correct_items) ? item.correct_items.join(", ") : "";
        const wrongList = Array.isArray(item.wrong_items) ? item.wrong_items.join(", ") : "";

        contentHTML = `
          <div style="display:flex; gap:6px; margin-bottom:7px;">
            <span style="font-size:10px; background:#10b981; padding:2px 6px; border-radius:3px; color:#fff;">CATCH & COLLECT</span>
            <span style="font-size:10px; background:#334155; padding:2px 6px; border-radius:3px; color:#38bdf8;">${topic}</span>
            <span style="font-size:10px; background:${difficultyColor}; padding:2px 6px; border-radius:3px; color:#fff;">${difficulty}</span>
          </div>
          <strong>${index + 1}. ${item.question_text || ""}</strong>
          <div style="font-size:12px; margin-top:4px;">
            <span style="color:#10b981;">Catch: ${correctList}</span><br>
            <span style="color:#ef4444;">Avoid: ${wrongList}</span>
          </div>
        `;
      }

      qDiv.innerHTML = contentHTML;
      detailQuestionsList.appendChild(qDiv);
    });
  }

  viewDetailModal.style.display = "flex";
}

// SAVE QUESTION SET
if (addQuestionForm) {
  addQuestionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const qId = "q_" + Date.now();
    const title = document.getElementById("qTitle").value.trim();
    const publisherInput = document.getElementById("qPublisher").value.trim();
    const publisher = publisherInput !== "" ? publisherInput : "MazeProg System";

    const items = {};
    const qBlocks = questionsContainer.querySelectorAll(".question-item-block");

    qBlocks.forEach((block, idx) => {
      const topic = block.querySelector(".item-topic-select").value;
      const difficulty = block.querySelector(".item-difficulty-select").value;
      const mechanism = block.querySelector(".item-mechanism-select").value;

      // MCQ
      if (mechanism === "mcq") {
        const qText = block.querySelector(".q-text-input").value.trim();
        const ansInputs = block.querySelectorAll(".ans-text-input");
        const radios = block.querySelectorAll(".correct-radio");

        const options = [];
        let correctAns = "";

        ansInputs.forEach((inp, i) => {
          const val = inp.value.trim();
          if (val !== "") {
            options.push(val);
            if (radios[i] && radios[i].checked) correctAns = val;
          }
        });

        items[`item_${idx + 1}`] = {
          topic: topic,
          difficulty: difficulty,
          mechanism: "mcq",
          question_text: qText,
          options: options,
          correct_answer: correctAns
        };
      }

      // DRAG & DROP (FILL IN THE BLANK)
      else if (mechanism === "drag_drop") {
        const template = block.querySelector(".q-blank-template").value.trim();
        const correctAnswer = block.querySelector(".q-blank-correct").value.trim();
        const distractorInputs = block.querySelectorAll(".distractor-text-input");

        const distractors = [];
        distractorInputs.forEach((inp) => {
          if (inp.value.trim() !== "") distractors.push(inp.value.trim());
        });

        items[`item_${idx + 1}`] = {
          topic: topic,
          difficulty: difficulty,
          mechanism: "drag_drop",
          question_template: template,
          correct_answer: correctAnswer,
          distractors: distractors
        };
      }

      // BUG SNIPER
      else if (mechanism === "bug_sniper") {
        const snippet = block.querySelector(".code-snippet-input").value.trim();
        const line = parseInt(block.querySelector(".bug-line-input").value);
        const fix = block.querySelector(".bug-fix-input").value.trim();

        items[`item_${idx + 1}`] = {
          topic: topic,
          difficulty: difficulty,
          mechanism: "bug_sniper",
          code_snippet: snippet,
          bug_line: line,
          correct_fix: fix
        };
      }

      // CATCH & COLLECT
      else if (mechanism === "catch_collect") {
        const qText = block.querySelector(".q-text-input").value.trim();
        const correctStr = block.querySelector(".correct-items-input").value.trim();
        const wrongStr = block.querySelector(".wrong-items-input").value.trim();

        const correctItems = correctStr.split(",").map(i => i.trim()).filter(i => i !== "");
        const wrongItems = wrongStr.split(",").map(i => i.trim()).filter(i => i !== "");

        items[`item_${idx + 1}`] = {
          topic: topic,
          difficulty: difficulty,
          mechanism: "catch_collect",
          question_text: qText,
          correct_items: correctItems,
          wrong_items: wrongItems
        };
      }

      const savedItem = items[`item_${idx + 1}`];
      if (savedItem) savedItem.hint = block.querySelector(".q-hint-input")?.value.trim() || "";
    });

    try {
      await set(ref(database, `QUESTIONS/${qId}`), {
        question_id: qId,
        title: title,
        publisher: publisher,
        created_at: new Date().toISOString(),
        items: items
      });

      alert("Question set saved successfully!");
      addQuestionForm.reset();
      questionsContainer.innerHTML = "";
      questionCount = 0;
      modal.style.display = "none";
    } catch (error) {
      console.error("Error saving question set:", error);
      alert("Failed to save: " + error.message);
    }
  });
}