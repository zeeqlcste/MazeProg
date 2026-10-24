export function renderBugSniper(container, qData, onSubmit) {
  const snippet = qData.code_snippet || "";
  const targetLine = qData.bug_line || 1;
  const correctFix = qData.correct_fix || "";

  const lines = snippet.split('\n');

  let html = `
    <div style="max-width: 550px; margin: 0 auto; text-align: left;">
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">Klik pada baris kod yang mengandungi ralat (Bug):</p>
      
      <div class="code-editor-box" style="background: #030712; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; margin-bottom: 16px;">
  `;

  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    html += `
      <div class="code-line" data-line="${lineNum}" style="padding: 4px 8px; border-radius: 4px; cursor: pointer; display: flex; gap: 12px;">
        <span style="color: #475569; width: 20px; text-align: right; user-select: none;">${lineNum}</span>
        <span style="color: #f8fafc;">${lineText}</span>
      </div>
    `;
  });

  html += `
      </div>

      <!-- INPUT FIX APABILA LINE DIPILIH -->
      <div id="fixArea" style="display: none; margin-bottom: 16px;">
        <label style="font-size: 12px; color: #38bdf8; display: block; margin-bottom: 4px;">Masukkan pembetulan kod untuk Baris <span id="selectedLineNum"></span>:</label>
        <input type="text" id="fixInput" placeholder="Taip kod pembetulan di sini..." style="width: 100%; padding: 8px 12px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 6px; outline: none; font-family: monospace;">
      </div>

      <button id="submitBugBtn" class="btn btn-primary" style="width: 100%; padding: 10px;" disabled>Tembak Bug!</button>
    </div>
  `;

  container.innerHTML = html;

  let selectedLine = null;
  const fixArea = container.querySelector('#fixArea');
  const selectedLineNum = container.querySelector('#selectedLineNum');
  const fixInput = container.querySelector('#fixInput');
  const submitBtn = container.querySelector('#submitBugBtn');

  // Highlight line bila diklik
  container.querySelectorAll('.code-line').forEach(lineEl => {
    lineEl.onclick = () => {
      container.querySelectorAll('.code-line').forEach(l => l.style.background = 'transparent');
      lineEl.style.background = '#374151';
      
      selectedLine = parseInt(lineEl.getAttribute('data-line'));
      selectedLineNum.textContent = selectedLine;
      fixArea.style.display = 'block';
      submitBtn.disabled = false;
    };
  });

  submitBtn.onclick = () => {
    const userFix = fixInput.value.trim();
    // Semak sama ada baris betul DAN jawapan pembetulan betul
    const isCorrect = (selectedLine === targetLine) && (userFix === correctFix.trim());
    onSubmit(isCorrect, undefined, undefined, {
      submittedAnswer: `Line ${selectedLine}: ${userFix}`,
      selectedLine
    });
  };
}