import { playGameSound } from "../game-audio.js";

export function renderCatchCollect(container, qData, onSubmit) {
  const correctItems = qData.correct_items || [];
  const wrongItems = qData.wrong_items || [];
  const maxLives = 3;

  let caughtCorrectCount = 0;
  let livesRemaining = maxLives;
  let isFinished = false;
  let roundSubmitted = false;
  let fallInterval = null;
  let spawnTimeout = null;
  let activeItem = null;

  let html = `
    <div style="text-align: center; max-width: 500px; margin: 0 auto;">
      <p style="font-size: 13px; color: #10b981; margin-bottom: 8px;">
        Catch the code items that best fit the challenge above.
      </p>
      <p id="catchScore" style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
        Caught: 0 / ${correctItems.length}
      </p>
      <p id="catchLives" role="img" aria-label="3 lives remaining" style="font-size: 14px; color: #fca5a5; margin-bottom: 8px;">
        Lives: <span aria-hidden="true">❤️❤️❤️</span>
      </p>
      <p id="catchMessage" role="status" aria-live="polite" style="min-height: 20px; font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">
        Avoid catching incorrect items!
      </p>

      <div id="catchArena" class="catch-arena" style="position: relative; width: 100%; height: 260px; background: #030712; border: 2px solid #1f2937; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
        <div id="basket" style="position: absolute; bottom: 10px; left: 0; width: 70px; height: 16px; background: #10b981; border-radius: 8px; box-shadow: 0 0 10px #10b981;"></div>
      </div>

      <button id="finishCatchBtn" class="btn btn-primary" type="button" style="width: 100%; padding: 10px;" disabled>Finish Round</button>
    </div>
  `;

  container.innerHTML = html;

  const arena = container.querySelector('#catchArena');
  const basket = container.querySelector('#basket');
  const catchScore = container.querySelector('#catchScore');
  const catchLives = container.querySelector('#catchLives');
  const catchMessage = container.querySelector('#catchMessage');
  const finishBtn = container.querySelector('#finishCatchBtn');

  function moveBasket(clientX) {
    const rect = arena.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - basket.offsetWidth, clientX - rect.left - basket.offsetWidth / 2));
    basket.style.left = `${x}px`;
  }

  basket.style.left = `${Math.max(0, (arena.clientWidth - basket.offsetWidth) / 2)}px`;
  arena.addEventListener('pointermove', (event) => moveBasket(event.clientX));

  // Gabungkan item & Mula Hujan Item
  const allFallingItems = [
    ...correctItems.map(val => ({ text: val, isCorrect: true })),
    ...wrongItems.map(val => ({ text: val, isCorrect: false }))
  ].sort(() => Math.random() - 0.5);

  let currentItemIdx = 0;

  function updateScore() {
    catchScore.textContent = `Caught: ${caughtCorrectCount} / ${correctItems.length}`;
    if (currentItemIdx >= allFallingItems.length) {
      finishBtn.disabled = false;
    }
  }

  function updateLives() {
    const hearts = `${'❤️'.repeat(livesRemaining)}${'🖤'.repeat(maxLives - livesRemaining)}`;
    catchLives.querySelector('span').textContent = hearts;
    catchLives.setAttribute('aria-label', `${livesRemaining} ${livesRemaining === 1 ? 'life' : 'lives'} remaining`);
  }

  function stopFallingItems() {
    if (fallInterval) {
      clearInterval(fallInterval);
      fallInterval = null;
    }
    if (spawnTimeout) {
      clearTimeout(spawnTimeout);
      spawnTimeout = null;
    }
    if (activeItem) {
      activeItem.remove();
      activeItem = null;
    }
  }

  function scheduleNextItem() {
    spawnTimeout = setTimeout(() => {
      spawnTimeout = null;
      spawnItem();
    }, 600);
  }

  function finishRound() {
    if (roundSubmitted) return;
    roundSubmitted = true;
    isFinished = true;
    stopFallingItems();
    finishBtn.disabled = true;
    const isWin = livesRemaining > 0 && caughtCorrectCount >= Math.ceil(correctItems.length * 0.7);
    onSubmit(isWin, undefined, undefined, {
      correctCount: caughtCorrectCount,
      totalCorrect: correctItems.length,
      livesRemaining,
      roundComplete: true,
      submittedAnswer: `Caught ${caughtCorrectCount}/${correctItems.length} correct items with ${livesRemaining} lives remaining`
    });
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
    const maxLeft = Math.max(0, arena.clientWidth - 60);
    itemEl.style.cssText = `
      position: absolute; top: 0px;
      left: ${Math.floor(Math.random() * (maxLeft + 1))}px;
      padding: 4px 10px; background: #1e293b; color: #fff;
      border: 1px solid #3b82f6; border-radius: 6px; font-size: 12px; font-weight: bold;
    `;
    arena.appendChild(itemEl);
    activeItem = itemEl;

    let topPos = 0;
    fallInterval = setInterval(() => {
      topPos += 3;
      itemEl.style.top = `${topPos}px`;

      const basketLeft = Number.parseFloat(basket.style.left) || 0;
      const itemLeft = parseInt(itemEl.style.left);
      const basketTop = arena.clientHeight - basket.offsetHeight - 10;
      const isOverlapping = itemLeft + itemEl.offsetWidth >= basketLeft
        && itemLeft <= basketLeft + basket.offsetWidth;

      if (topPos + itemEl.offsetHeight >= basketTop && topPos <= basketTop + basket.offsetHeight && isOverlapping) {
        clearInterval(fallInterval);
        fallInterval = null;
        itemEl.remove();
        if (itemData.isCorrect) {
          caughtCorrectCount++;
          catchMessage.textContent = 'Nice catch! Keep it up!';
        } else {
          livesRemaining = Math.max(0, livesRemaining - 1);
          updateLives();
          if (livesRemaining > 0) playGameSound('incorrect');
          catchMessage.textContent = livesRemaining > 0
            ? `Wrong item! You lost a life. ${livesRemaining} ${livesRemaining === 1 ? 'life' : 'lives'} left.`
            : 'No lives left! Round over.';
        }
        if (itemData.isCorrect) playGameSound('catch');
        updateScore();
        activeItem = null;
        if (livesRemaining === 0) {
          finishRound();
          return;
        }
        scheduleNextItem();
        return;
      }

      if (topPos > arena.clientHeight) {
        clearInterval(fallInterval);
        fallInterval = null;
        itemEl.remove();
        activeItem = null;
        scheduleNextItem();
      }
    }, 30);
  }

  spawnItem();

  finishBtn.onclick = finishRound;

  return () => {
    isFinished = true;
    stopFallingItems();
  };
}