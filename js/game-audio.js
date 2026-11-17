let audioContext = null;
let soundEnabled = true;

const soundPatterns = {
  select: { notes: [440], duration: 0.08, volume: 0.035 },
  catch: { notes: [780, 1040], duration: 0.09, volume: 0.055 },
  miss: { notes: [300, 220], duration: 0.12, volume: 0.045 },
  correct: { notes: [523, 659, 784], duration: 0.12, volume: 0.06 },
  incorrect: { notes: [260, 196], duration: 0.14, volume: 0.05 },
  countdown: { notes: [520], duration: 0.08, volume: 0.035 },
  timeout: { notes: [392, 330, 262], duration: 0.18, volume: 0.055 },
  complete: { notes: [523, 659, 784, 1047], duration: 0.16, volume: 0.06 }
};

export function isGameSoundEnabled() {
  return soundEnabled;
}

export function setGameSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
}

export function playGameSound(type) {
  if (!soundEnabled) return;

  const pattern = soundPatterns[type];
  if (!pattern) return;

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    audioContext = audioContext || new AudioContextConstructor();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch((error) => console.error('Unable to resume game audio:', error));
    }

    pattern.notes.forEach((frequency, index) => {
      const startAt = audioContext.currentTime + index * (pattern.duration + 0.035);
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(pattern.volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + pattern.duration);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + pattern.duration + 0.01);
    });
  } catch (error) {
    console.error('Unable to play game audio:', error);
  }
}
