export function renderDragDrop(container, qData, onSubmit) {
  // 1. SEMAK SAMA ADA INI ADALAH SOALAN FILL-IN-THE-BLANK (BLANK SLOT)
  if (qData.question_template || qData.correct_answer) {
    const template = qData.question_template || "Code: [BLANK]";
    const correctAnswer = qData.correct_answer || "";
    const distractors = qData.distractors || [];

    // Gabungkan jawapan betul dan pengacau (distractors), kemudian rawakkan (shuffle)
    const allBlocks = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

    // Gantikan penanda [BLANK] dengan slot zon drop yang interaktif
    const templateHTML = template.replace("[BLANK]", `
      <span id="dropZone" class="drop-target" style="
        display: inline-block;
        min-width: 120px;
        padding: 6px 16px;
        border: 2px dashed #a855f7;
        border-radius: 8px;
        background: rgba(168, 85, 247, 0.1);
        color: #c084fc;
        text-align: center;
        font-weight: bold;
        margin: 0 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">???</span>
    `);

    let html = `
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <!-- PAPARAN TEMPLATE KOD DENGAN SLOT KOSONG -->
        <div style="font-size: 18px; color: #f8fafc; margin-bottom: 24px; line-height: 1.8; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
          ${templateHTML}
        </div>

        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
          Seret blok kod yang betul atau klik pada blok di bawah untuk mengisi tempat kosong [BLANK]:
        </p>

        <!-- PILIHAN BLOK JAWAPAN (DRAGGABLE POOL) -->
        <div id="blocksPool" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
          ${allBlocks.map((text, i) => `
            <div class="drag-block" draggable="true" id="block_${i}" data-val="${text}" style="
              padding: 10px 20px;
              background: #7e22ce;
              color: #fff;
              border-radius: 8px;
              font-weight: bold;
              font-family: monospace;
              cursor: grab;
              user-select: none;
              border: 1px solid #a855f7;
              box-shadow: 0 4px 10px rgba(168, 85, 247, 0.2);
              transition: all 0.2s;
            ">
              ${text}
            </div>
          `).join('')}
        </div>

        <button id="submitDragBtn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: bold;" disabled>Hantar Jawapan</button>
      </div>
    `;

    container.innerHTML = html;

    let currentSelectedValue = "";
    const dropZone = container.querySelector('#dropZone');
    const submitBtn = container.querySelector('#submitDragBtn');
    const dragBlocks = container.querySelectorAll('.drag-block');

    dragBlocks.forEach(block => {
      block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData("text/plain", block.getAttribute('data-val'));
        block.style.opacity = '0.5';
      });

      block.addEventListener('dragend', () => {
        block.style.opacity = '1';
      });

      // Klik alternatif (Sangat berguna & responsif untuk peranti mudah alih/touch screen)
      block.addEventListener('click', () => {
        currentSelectedValue = block.getAttribute('data-val');
        dropZone.textContent = currentSelectedValue;
        dropZone.style.borderColor = '#10b981';
        dropZone.style.background = 'rgba(16, 185, 129, 0.15)';
        dropZone.style.color = '#6ee7b7';
        submitBtn.disabled = false;
      });
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#38bdf8';
      dropZone.style.background = 'rgba(56, 189, 248, 0.15)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = currentSelectedValue ? '#10b981' : '#a855f7';
      dropZone.style.background = currentSelectedValue ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.1)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const val = e.dataTransfer.getData("text/plain");
      if (val) {
        currentSelectedValue = val;
        dropZone.textContent = val;
        dropZone.style.borderColor = '#10b981';
        dropZone.style.background = 'rgba(16, 185, 129, 0.15)';
        dropZone.style.color = '#6ee7b7';
        submitBtn.disabled = false;
      }
    });

    submitBtn.onclick = () => {
      const isCorrect = currentSelectedValue.trim() === correctAnswer.trim();
      onSubmit(isCorrect, undefined, undefined, { 
        submittedAnswer: currentSelectedValue,
        correctAnswer: correctAnswer
      });
    };

  } else {
    // 2. JIKA BUKAN TEMPLATE, GUNAKAN MOD SUSUNAN KOD BIASA (PARSONS)
    const options = qData.options || [];
    const correctOrder = qData.correct_order || options.slice().sort();

    let html = `
      <div style="max-width: 600px; margin: 0 auto; text-align: left;">
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
          Susun perkataan/baris kod di bawah mengikut urutan yang betul:
        </p>

        <div id="dragSource" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          ${options.map((opt, idx) => `
            <div class="drag-item" draggable="true" data-index="${idx}" data-val="${opt}" style="
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 6px;
              padding: 10px 14px;
              color: #f8fafc;
              font-family: monospace;
              font-size: 13px;
              cursor: grab;
              user-select: none;
            ">
              ${opt}
            </div>
          `).join('')}
        </div>

        <div id="dropZone" style="
          background: #0b1329;
          border: 2px dashed #334155;
          border-radius: 8px;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 16px;
          transition: all 0.2s;
        ">
          Seret item di sini
        </div>

        <div id="dropOrder" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;"></div>

        <button id="submitDragBtn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: bold;" disabled>Serahkan Jawapan</button>
      </div>
    `;

    container.innerHTML = html;

    const dragItems = container.querySelectorAll('.drag-item');
    const dropZone = container.querySelector('#dropZone');
    const dropOrder = container.querySelector('#dropOrder');
    const submitBtn = container.querySelector('#submitDragBtn');

    let dropped = []; // { index, val }

    dragItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text', item.dataset.index);
        item.style.opacity = '0.5';
      });
      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
      });
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#38bdf8';
      dropZone.style.background = '#111827';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#334155';
      dropZone.style.background = '#0b1329';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const idx = e.dataTransfer.getData('text');
      const item = options[idx];
      if (item !== undefined && !dropped.some(d => d.index === idx)) {
        dropped.push({ index: idx, val: item });
        renderDropped();
      }
      dropZone.style.borderColor = '#334155';
      dropZone.style.background = '#0b1329';
      updateSubmit();
    });

    function renderDropped() {
      dropOrder.innerHTML = dropped.map((d, i) => `
        <div class="dropped-item" data-pos="${i}" style="
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 10px 14px;
          color: #f8fafc;
          font-family: monospace;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        ">
          <span>${d.val}</span>
          <span style="cursor: pointer; color: #ef4444; font-weight: bold; font-size: 16px;" onclick="removeDrop(${i})">×</span>
        </div>
      `).join('');
    }

    window.removeDrop = (pos) => {
      dropped.splice(pos, 1);
      renderDropped();
      updateSubmit();
    };

    function updateSubmit() {
      submitBtn.disabled = dropped.length === 0;
    }

    submitBtn.onclick = () => {
      const userOrder = dropped.map(d => d.val);
      const isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
      onSubmit(isCorrect, undefined, undefined, {
        submittedAnswer: userOrder.join(' → '),
        correctAnswer: correctOrder.join(' → ')
      });
    };
  }
}
