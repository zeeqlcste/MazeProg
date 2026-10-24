export function renderCatchCollect(container, qData, onSubmit) {
  const correctItems = qData.correct_items || [];
  const wrongItems = qData.wrong_items || [];
  const hint = qData.hint || '';

  let caughtCorrectCount = 0;
  let totalAttempts = 0;
  let isFinished = false;

  let html = `
    <div style="text-align: center; max-width: 500px; margin: 0 auto;">
      <p style="font-size: 13px; color: #10b981; margin-bottom: 8px;">
        Tangkap sasaran: <strong>${correctItems.join(', ')}</strong>
      </p>
      <p id="catchScore" style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
        Betul: 0 / ${correctItems.length}
      </p>

      <!-- CANVAS / GAME ARENA -->
      <div id="catchArena" style="position: relative; width: 100%; height: 260px; background: #030712; border: 2px solid #1f2937; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
        <!-- BASKET / NET -->
        <div id="basket" style="position: absolute; bottom: 10px; left: 40%; width: 70px; height: 16px; background: #10b981; border-radius: 8px; box-shadow: 0 0 10px #10b981;"></div>
      </div>

      <button id="finishCatchBtn" class="btn btn-primary" style="width: 100%; padding: 10px;" disabled>Tamatkan &amp; Serahkan</button>
    </div>
  `;

  container.innerHTML = html;

  const arena = container.querySelector('#catchArena');
  const basket = container.querySelector('#basket');
  const catchScore = container.querySelector('#catchScore');
  const finishBtn = container.querySelector('#finishCatchBtn');

  // Kawalan Basket Pergerakan Tetikus / Touch
  arena.addEventListener('mousemove', (e) => {
    const rect = arena.getBoundingClientRect();
    let x = e.clientX - rect.left - 35;
    if (x < 0) x = 0;
    if (x > rect.width - 70) x = rect.width - 70;
    basket.style.left = `${x}px`;
  });

  // Gabungkan item & Mula Hujan Item
  const allFallingItems = [
    ...correctItems.map(val => ({ text: val, isCorrect: true })),
    ...wrongItems.map(val => ({ text: val, isCorrect: false }))
  ].sort(() => Math.random() - 0.5);

  let currentItemIdx = 0;

  function updateScore() {
    catchScore.textContent = `Betul: ${caughtCorrectCount} / ${correctItems.length}`;
    if (currentItemIdx >= allFallingItems.length) {
      finishBtn.disabled = false;
    }
  }

  function spawnItem() {
    if (isFinished) return;

    if (currentItemIdx >= allFallingItems.length) {
      isFinished = true;
      finishBtn.disabled = false;
      return;
    }

    const itemData = allFallingItems[currentItemIdx];
    currentItemIdx++;

    const itemEl = document.createElement('div');
    itemEl.textContent = itemData.text;
    itemEl.style.cssText = `
      position: absolute; top: 0px;
      left: ${Math.floor(Math.random() * (arena.clientWidth - 60))}px;
      padding: 4px 10px; background: #1e293b; color: #fff;
      border: 1px solid #3b82f6; border-radius: 6px; font-size: 12px; font-weight: bold;
    `;
    arena.appendChild(itemEl);

    let topPos = 0;
    const fallInterval = setInterval(() => {
      topPos += 3;
      itemEl.style.top = `${topPos}px`;

      const basketLeft = parseInt(basket.style.left);
      const itemLeft = parseInt(itemEl.style.left);

      // Collision Detection (Kena Basket)
      if (topPos >= 220 && topPos <= 240 && itemLeft >= basketLeft - 30 && itemLeft <= basketLeft + 60) {
        clearInterval(fallInterval);
        itemEl.remove();
        totalAttempts++;

        if (itemData.isCorrect) {
          caughtCorrectCount++;
        }
        updateScore();
        setTimeout(spawnItem, 600);
        return;
      }

      // Terlepas ke bawah
      if (topPos > 260) {
        clearInterval(fallInterval);
        itemEl.remove();
        if (itemData.isCorrect) {
          // missed a correct item - no penalty but counted
        }
        setTimeout(spawnItem, 600);
      }
    }, 30);
  }

  spawnItem();

  finishBtn.onclick = () => {
    isFinished = true;
    const isWin = caughtCorrectCount >= Math.ceil(correctItems.length * 0.7);
    onSubmit(isWin, undefined, undefined, {
      correctCount: caughtCorrectCount,
      totalCorrect: correctItems.length,
      roundComplete: true,
      submittedAnswer: `Caught ${caughtCorrectCount}/${correctItems.length} correct items`
    });
  };
}