export function renderDragDrop(container, qData, onSubmit) {
  const options = qData.options || [];
  const correctOrder = qData.correct_order || options.slice().sort();
  const hint = qData.hint || '';

  let currentOrder = [...options];

  let html = `
    <div style="max-width: 600px; margin: 0 auto; text-align: left;">
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
        Sususkan perkataan/baris kod dalam urutan yang betul:
      </p>

      <div id="dragSource" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
        ${options.map((opt, idx) => `
          <div class="drag-item" draggable="true" data-index="${idx}" data-val="${opt}"
               style="background: #1e293b; border: 1px solid #334155; border-radius: 6px;
                      padding: 10px 14px; color: #f8fafc; font-family: monospace; font-size: 13px;
                      cursor: grab; user-select: none;">
            ${opt}
          </div>
        `).join('')}
      </div>

      <div id="dropZone" style="background: #0b1329; border: 2px dashed #334155; border-radius: 8px;
                min-height: 200px; display: flex; align-items: center; justify-content: center;
                color: #64748b; font-size: 14px; margin-bottom: 16px;">
        Seret item di sini
      </div>

      <div id="dropOrder" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;"></div>

      <button id="submitDragBtn" class="btn btn-primary" style="width: 100%; padding: 10px;" disabled>Serahkan Jawapan</button>
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
    if (!dropped.some(d => d.index === idx)) {
      dropped.push({ index: idx, val: item });
      renderDropped();
    }
    dropZone.style.borderColor = '#334155';
    dropZone.style.background = '#0b1329';
    updateSubmit();
  });

  function renderDropped() {
    dropOrder.innerHTML = dropped.map((d, i) => `
      <div class="dropped-item" data-pos="${i}" style="background: #1e293b; border: 1px solid #334155;
                border-radius: 6px; padding: 8px 12px; color: #f8fafc; font-family: monospace;
                font-size: 13px; cursor: grab; display: flex; align-items: center; gap: 8px;">
        ${d.val}
        <span style="cursor: pointer; color: #ef4444;" onclick="removeDrop(${i})">×</span>
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
