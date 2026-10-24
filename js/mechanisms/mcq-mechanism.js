export function renderMCQ(container, qData, onAnswerSubmit) {
  const options = qData.options || [];
  const html = `
    <div class="mcq-wrapper" style="position: relative;">
      <!-- MCQ Options Grid -->
      <div class="mcq-options-grid">
        ${options.map((opt, idx) => `
          <button class="mcq-option-btn" data-index="${idx}" data-val="${opt}">
            <span class="opt-label">${String.fromCharCode(65 + idx)}</span>
            <span class="opt-text">${opt}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  const buttons = container.querySelectorAll('.mcq-option-btn');

  // Event handler apabila butang pilihan ditekan
  buttons.forEach(btn => {
    btn.onclick = () => {
      const selectedIndex = parseInt(btn.dataset.index);
      const selectedText = btn.dataset.val;

      // Semakan fleksibel jawapan betul (string atau indeks)
      let isCorrect = false;
      if (qData.correct_answer !== undefined) {
        isCorrect = (selectedText.trim() === String(qData.correct_answer).trim());
      } else if (qData.correct_option_index !== undefined) {
        isCorrect = (selectedIndex === parseInt(qData.correct_option_index));
      }

      onAnswerSubmit(isCorrect, undefined, undefined, { selectedAnswer: selectedText });
    };
  });
}