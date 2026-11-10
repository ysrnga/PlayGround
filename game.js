(() => {
  const $ = id => document.getElementById(id);
  const state = { language: 'tr', servings: 1, sugar: 0, step: 0, seconds: 180, timer: null };
  const sugarLevels = [
    { tr: 'Sade', en: 'None', teaspoons: 0 },
    { tr: 'Az', en: 'Light', teaspoons: 0.5 },
    { tr: 'Orta', en: 'Medium', teaspoons: 1 },
    { tr: 'Şekerli', en: 'Sweet', teaspoons: 2 }
  ];
  const messages = {
    tr: { minute: 'çay kaşığı', reminder: 'Hatırlatıcıyı başlat', pause: 'Duraklat', resume: 'Devam et', restartTimer: 'Yeniden başlat', done: 'Süre doldu — köpüğü kontrol et!', step: 'adım', finished: 'Kahven hazır. Afiyet olsun!', reset: 'Rehber baştan başladı.' },
    en: { minute: 'teaspoon', reminder: 'Start reminder', pause: 'Pause', resume: 'Resume', restartTimer: 'Restart timer', done: 'Time is up — check the foam!', step: 'step', finished: 'Your coffee is ready. Enjoy!', reset: 'The guide has restarted.' }
  };
  const sugarNames = { tr: ['Sade', 'Az şekerli', 'Orta şekerli', 'Şekerli'], en: ['None', 'Light', 'Medium', 'Sweet'] };
  const cards = [...document.querySelectorAll('.step-card')];

  function updateIngredients() {
    const cups = state.servings;
    $('waterAmount').textContent = `${65 * cups} ml`;
    $('coffeeAmount').textContent = `~${6 * cups} g`;
    const level = sugarLevels[state.sugar];
    const amount = level.teaspoons * cups;
    const quantity = Number.isInteger(amount) ? amount : amount.toLocaleString(state.language === 'tr' ? 'tr-TR' : 'en-US');
    const unit = state.language === 'en' && amount !== 1 ? `${messages[state.language].minute}s` : messages[state.language].minute;
    $('sugarAmount').textContent = `${sugarNames[state.language][state.sugar]} · ${quantity} ${unit}`;
    document.querySelectorAll('.sugar-choice').forEach(button => {
      const selected = Number(button.dataset.sugar) === state.sugar;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function setLanguage(language) {
    state.language = language;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-tr][data-en]').forEach(element => {
      element.innerHTML = element.dataset[language];
    });
    $('languageButton').textContent = language === 'tr' ? 'EN' : 'TR';
    $('languageButton').setAttribute('aria-label', language === 'tr' ? 'Switch to English' : 'Türkçeye geç');
    $('servings').setAttribute('aria-label', language === 'tr' ? 'Fincan sayısı' : 'Number of cups');
    updateIngredients();
    updateTimerButton();
    updateProgress();
  }

  function updateProgress() {
    const completed = state.step;
    $('progressText').textContent = `${completed} / ${cards.length}`;
    $('progressFill').style.width = `${completed / cards.length * 100}%`;
    cards.forEach((card, index) => {
      card.classList.toggle('active', index === state.step && state.step < cards.length);
      card.classList.toggle('completed', index < state.step);
      card.querySelector('.step-done').disabled = index !== state.step || state.step >= cards.length;
    });
    if (state.step >= cards.length) {
      $('finishedCard').hidden = false;
      $('stepsList').classList.add('all-done');
    } else {
      $('finishedCard').hidden = true;
      $('stepsList').classList.remove('all-done');
    }
  }

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function updateTimerButton() {
    const button = $('timerButton');
    if (state.seconds === 0) {
      button.textContent = messages[state.language].restartTimer;
      button.dataset.state = 'done';
    } else if (state.timer) {
      button.textContent = messages[state.language].pause;
      button.dataset.state = 'running';
    } else if (state.seconds < 180) {
      button.textContent = messages[state.language].resume;
      button.dataset.state = 'paused';
    } else {
      button.textContent = messages[state.language].reminder;
      button.dataset.state = 'idle';
    }
  }

  function stopTimer() {
    window.clearInterval(state.timer);
    state.timer = null;
    updateTimerButton();
  }

  function toggleTimer() {
    if (state.seconds === 0) {
      state.seconds = 180;
      $('timerDisplay').textContent = formatTime(state.seconds);
      updateTimerButton();
      return;
    }
    if (state.timer) {
      stopTimer();
      return;
    }
    state.timer = window.setInterval(() => {
      state.seconds = Math.max(0, state.seconds - 1);
      $('timerDisplay').textContent = formatTime(state.seconds);
      if (state.seconds === 0) {
        stopTimer();
        $('timerButton').textContent = messages[state.language].restartTimer;
        $('timerButton').dataset.state = 'done';
        showToast(messages[state.language].done);
      }
    }, 1000);
    updateTimerButton();
  }

  let toastTimeout;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function completeStep(event) {
    const card = event.currentTarget.closest('.step-card');
    if (Number(card.dataset.step) !== state.step) return;
    state.step += 1;
    updateProgress();
    if (state.step === cards.length) showToast(messages[state.language].finished);
    else cards[state.step].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function restart() {
    stopTimer();
    state.seconds = 180;
    state.step = 0;
    $('timerDisplay').textContent = formatTime(state.seconds);
    updateTimerButton();
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(messages[state.language].reset);
  }

  $('languageButton').addEventListener('click', () => setLanguage(state.language === 'tr' ? 'en' : 'tr'));
  $('servings').addEventListener('change', event => {
    state.servings = Number(event.target.value);
    updateIngredients();
  });
  document.querySelectorAll('.sugar-choice').forEach(button => button.addEventListener('click', () => {
    state.sugar = Number(button.dataset.sugar);
    updateIngredients();
  }));
  document.querySelectorAll('.step-done').forEach(button => button.addEventListener('click', completeStep));
  $('timerButton').addEventListener('click', toggleTimer);
  $('restartButton').addEventListener('click', restart);

  updateIngredients();
  updateProgress();
  updateTimerButton();
})();
