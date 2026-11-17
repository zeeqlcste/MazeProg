export function renderMCQ(container, qData, onAnswerSubmit) {
  const options = qData.options || [];
  const html = `
    <div class="mcq-wrapper" style="position: relative;">
      <!-- MCQ Options Grid -->
      <div class="mcq-options-grid">
        ${options.map((opt, idx) => `
          <button class="mcq-option-btn" type="button" data-index="${idx}" data-val="${opt}" aria-pressed="false">
            <span class="opt-label">${String.fromCharCode(65 + idx)}</span>
            <span class="opt-text">${opt}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  const buttons = container.querySelectorAll('.mcq-option-btn');
  let answered = false;

  // Event handler apabila butang pilihan ditekan
  buttons.forEach(btn => {
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      const selectedIndex = parseInt(btn.dataset.index);
      const selectedText = btn.dataset.val;
      buttons.forEach((optionButton) => {
        optionButton.disabled = true;
      });

      // Semakan fleksibel jawapan betul (string atau indeks)
      let isCorrect = false;
      if (qData.correct_answer !== undefined) {
        isCorrect = (selectedText.trim() === String(qData.correct_answer).trim());
      } else if (qData.correct_option_index !== undefined) {
        isCorrect = (selectedIndex === parseInt(qData.correct_option_index));
      }

      buttons.forEach((optionButton, index) => {
        optionButton.setAttribute('aria-pressed', String(index === selectedIndex));
        const isCorrectOption = qData.correct_answer !== undefined
          ? optionButton.dataset.val.trim() === String(qData.correct_answer).trim()
          : qData.correct_option_index !== undefined && index === parseInt(qData.correct_option_index);
        if (isCorrectOption) optionButton.classList.add('is-correct');
      });
      if (!isCorrect) btn.classList.add('is-incorrect');
      onAnswerSubmit(isCorrect, undefined, undefined, { selectedAnswer: selectedText });
    };
  });
}