export function renderDragDrop(container, qData, onSubmit) {
  const template = qData.question_template || "Abu suka [BLANK] nasi.";
  const correctAnswer = qData.correct_answer || "";
  const distractors = qData.distractors || [];

  // Gabungkan jawapan betul & distractors, kemudian shuffle
  const allBlocks = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

  // Gantikan [BLANK] dengan slot drop zone
  const templateHTML = template.replace("[BLANK]", `<span id="dropZone" class="drop-target" style="display: inline-block; min-width: 100px; padding: 4px 12px; border: 2px dashed #38bdf8; border-radius: 6px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; text-align: center; font-weight: bold; margin: 0 4px;">???</span>`);

  let html = `
    <div style="text-align: center; max-width: 550px; margin: 0 auto;">
      <!-- TEMPLATE AYAT -->
      <div style="font-size: 18px; color: #fff; margin-bottom: 24px; line-height: 1.8;">
        ${templateHTML}
      </div>

      <!-- KUMPULAN BLOK JAWAPAN (DRAGGABLE) -->
      <div id="blocksPool" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
  `;

  allBlocks.forEach((text, i) => {
    html += `
      <div class="drag-block" draggable="true" id="block_${i}" data-val="${text}" style="padding: 8px 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: bold; cursor: grab; user-select: none;">
        ${text}
      </div>
    `;
  });

  html += `
      </div>

      <button id="submitDragBtn" class="btn btn-primary" style="padding: 10px 24px; font-size: 14px;" disabled>Hantar Jawapan</button>
    </div>
  `;

  container.innerHTML = html;

  let currentSelectedValue = "";
  const dropZone = container.querySelector('#dropZone');
  const submitBtn = container.querySelector('#submitDragBtn');

  // Drag & Drop Handlers
  container.querySelectorAll('.drag-block').forEach(block => {
    block.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData("text/plain", block.getAttribute('data-val'));
      e.dataTransfer.setData("block_id", block.id);
    });

    // Pilihan Klik (Fallback untuk touch/mobile)
    block.addEventListener('click', () => {
      currentSelectedValue = block.getAttribute('data-val');
      dropZone.textContent = currentSelectedValue;
      submitBtn.disabled = false;
    });
  });

  dropZone.addEventListener('dragover', (e) => e.preventDefault());
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const val = e.dataTransfer.getData("text/plain");
    currentSelectedValue = val;
    dropZone.textContent = val;
    submitBtn.disabled = false;
  });

  submitBtn.onclick = () => {
    const isCorrect = currentSelectedValue.trim() === correctAnswer.trim();
    onSubmit(isCorrect, undefined, undefined, { submittedAnswer: currentSelectedValue });
  };
}