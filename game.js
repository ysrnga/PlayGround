(() => {
  const recipes = [
    { name: 'Honey oat latte', ingredients: ['espresso', 'oat', 'honey', 'foam'], price: 5.50, icon: '👩🏽‍🦱', customer: 'Maya', mood: 'Ready for a pick-me-up' },
    { name: 'Flat white', ingredients: ['espresso', 'milk'], price: 4.25, icon: '👨🏻‍🦰', customer: 'Theo', mood: 'A little morning boost' },
    { name: 'Iced oat latte', ingredients: ['espresso', 'oat', 'ice'], price: 5.00, icon: '👩🏾', customer: 'Nina', mood: 'Something cool, please' },
    { name: 'Cappuccino', ingredients: ['espresso', 'milk', 'foam'], price: 4.75, icon: '👨🏽‍🦱', customer: 'Jules', mood: 'The usual, please!' },
    { name: 'Honey latte', ingredients: ['espresso', 'milk', 'honey', 'foam'], price: 5.25, icon: '👩🏻‍🦰', customer: 'Elliot', mood: 'Make it extra cozy' },
    { name: 'Iced latte', ingredients: ['espresso', 'milk', 'ice'], price: 4.75, icon: '👨🏿', customer: 'Sam', mood: 'On my way to work' },
    { name: 'Oat milk latte', ingredients: ['espresso', 'oat', 'foam'], price: 4.95, icon: '👩🏼‍🦱', customer: 'Priya', mood: 'A quiet moment, please' },
    { name: 'Espresso', ingredients: ['espresso'], price: 3.00, icon: '👨🏼‍🦳', customer: 'Frankie', mood: 'Short and strong!' },
    { name: 'Vanilla oat latte', ingredients: ['espresso', 'oat', 'honey'], price: 5.25, icon: '👩🏽', customer: 'Amara', mood: 'A sweet little treat' },
    { name: 'Cappuccino', ingredients: ['espresso', 'milk', 'foam'], price: 4.75, icon: '👩🏻', customer: 'Bea', mood: 'A lovely morning for it' },
    { name: 'Iced honey latte', ingredients: ['espresso', 'milk', 'honey', 'ice'], price: 5.50, icon: '👨🏽', customer: 'Luca', mood: 'Surprise me with something sweet' },
    { name: 'Oat cappuccino', ingredients: ['espresso', 'oat', 'foam'], price: 5.00, icon: '👩🏿‍🦱', customer: 'Zuri', mood: 'Perfect foam, please!' }
  ];
  const labels = { espresso: 'Espresso', milk: 'Steamed milk', oat: 'Oat milk', foam: 'Silky foam', honey: 'Honey', ice: 'Ice' };
  const $ = id => document.getElementById(id);
  const state = { running: false, pending: false, sound: true, served: 0, misses: 0, tips: 0, streak: 0, patience: 100, cup: [], current: null, usedRecipes: [] };
  let tick = null, toastTimer = null, audioContext = null;

  function sound(freq = 640, duration = .08, type = 'sine') {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(.055, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is only a small optional enhancement. */ }
  }
  function toast(message, good = false) {
    const el = $('toast'); el.textContent = message; el.className = `toast show${good ? ' good' : ''}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'toast'; }, 1800);
  }
  function updateStats() {
    $('servedCount').innerHTML = `${state.served} <small>/ 8</small>`;
    $('progressBar').style.width = `${Math.min(100, state.served / 8 * 100)}%`;
    $('tips').textContent = `$${state.tips.toFixed(2)}`;
    $('streakDots').querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('on', i < state.streak % 4 && state.streak > 0));
    $('clock').textContent = `08:${String(Math.min(59, state.served * 6 + Math.floor(state.misses * 2))).padStart(2, '0')}`;
    $('queueCount').textContent = Math.max(0, 3 - Math.floor(state.served / 3));
  }
  function drawOrder() {
    const order = state.current;
    $('avatar').textContent = order.icon;
    $('customerName').textContent = order.customer;
    $('customerMood').textContent = order.mood;
    $('ticketNumber').textContent = `#${String(state.served + state.misses + 1).padStart(2, '0')}`;
    $('drinkName').textContent = order.name;
    $('orderPrice').textContent = `$${order.price.toFixed(2)}`;
    $('orderDetails').innerHTML = order.ingredients.map(x => `<span class="detail-chip">${labels[x]}</span>`).join('');
    updatePatience();
  }
  function nextOrder() {
    if (state.served >= 8) return finish(true);
    state.pending = false;
    // First customer gets the featured special; avoid repeating an order until the deck cycles.
    let choices = recipes.filter((_, i) => !state.usedRecipes.includes(i));
    if (!choices.length) { state.usedRecipes = []; choices = recipes.slice(1); }
    let index = state.served + state.misses === 0 ? 0 : recipes.indexOf(choices[Math.floor(Math.random() * choices.length)]);
    if (!state.usedRecipes.includes(index)) state.usedRecipes.push(index);
    state.current = { ...recipes[index] };
    state.patience = 100; state.cup = [];
    drawOrder(); drawCup(); updateStats();
    $('customerCard').classList.remove('shake');
  }
  function updatePatience() {
    const bar = $('patienceBar'); bar.style.width = `${Math.max(0, state.patience)}%`;
    bar.classList.toggle('low', state.patience < 35);
    $('patienceText').textContent = `${Math.ceil(state.patience)}%`;
  }
  function updateIngredientButtons() {
    document.querySelectorAll('.ingredient').forEach(button => {
      const ingredient = button.dataset.ingredient;
      const count = state.cup.filter(x => x === ingredient).length;
      button.classList.toggle('added', count > 0);
      button.querySelector('small').textContent = count ? `Added ×${count}` : ({ espresso: '1 shot', milk: 'Steamed', oat: 'Steamed', foam: 'Silky top', honey: 'Sweet drizzle', ice: 'On the rocks' })[ingredient];
    });
  }
  function drawCup() {
    const contents = $('cupContents');
    if (!state.cup.length) contents.innerHTML = '<span class="empty-cup">Add ingredients to start brewing</span>';
    else contents.innerHTML = state.cup.map(x => `<span class="cup-chip">${labels[x]}</span>`).join('');
    $('cupStatus').textContent = state.cup.length ? `${state.cup.length} INGREDIENT${state.cup.length === 1 ? '' : 'S'}` : 'EMPTY';
    $('cupGraphic').classList.toggle('filled', state.cup.length > 0);
    const colors = { espresso: '#79513b', milk: '#d8c6a9', oat: '#c69a55', honey: '#e5b448', ice: '#94c8cd', foam: '#f3e8d2' };
    const topIngredient = [...state.cup].reverse().find(x => x !== 'foam') || 'milk';
    $('cupGraphic').querySelector('.cup-liquid').style.background = colors[topIngredient];
    updateIngredientButtons();
  }
  function addIngredient(ingredient) {
    if (!state.running || state.pending) return;
    if (state.cup.length >= 6) { toast('That cup is full — clear it to start again.'); return; }
    state.cup.push(ingredient); drawCup(); sound(500 + state.cup.length * 38, .06);
    const machine = document.querySelector('.machine');
    machine.classList.add('brewing'); setTimeout(() => machine.classList.remove('brewing'), 300);
  }
  function clearCup() { if (state.cup.length) { state.cup = []; drawCup(); sound(330, .07); } }
  function matches() {
    if (state.cup.length !== state.current.ingredients.length) return false;
    const a = [...state.cup].sort().join(','), b = [...state.current.ingredients].sort().join(',');
    return a === b;
  }
  function miss(reason) {
    state.misses++; state.streak = 0;
    $('streakDots').querySelectorAll('i').forEach(x => x.classList.remove('on'));
    sound(170, .18, 'triangle');
    toast(reason || 'Oh no! The customer had to head out.');
    if (state.misses >= 3) { setTimeout(() => finish(false), 700); return; }
    state.pending = true;
    setTimeout(nextOrder, 850);
  }
  function serve() {
    if (!state.running || state.pending) return;
    if (!state.cup.length) { toast('Your cup is empty — add the order first!'); $('cupGraphic').classList.add('shake'); setTimeout(() => $('cupGraphic').classList.remove('shake'), 350); return; }
    if (!matches()) {
      state.patience = Math.max(0, state.patience - 20); updatePatience();
      $('customerCard').classList.add('shake'); setTimeout(() => $('customerCard').classList.remove('shake'), 350);
      sound(190, .12, 'triangle');
      if (state.patience <= 0) miss('The customer ran out of patience.');
      else toast('Not quite their order. Check the ticket and try again!');
      return;
    }
    const tip = .5 + Math.max(0, state.patience / 100) * .75 + (state.streak >= 2 ? .5 : 0);
    state.served++; state.streak++; state.tips += tip;
    updateStats(); sound(760, .1); setTimeout(() => sound(960, .15), 90);
    if (state.served >= 8) { setTimeout(() => finish(true), 650); return; }
    toast(`Lovely! ${state.current.customer} loved it. +$${tip.toFixed(2)} tip`, true);
    state.pending = true;
    setTimeout(nextOrder, 800);
  }
  function finish(won) {
    state.running = false; state.pending = false; clearInterval(tick);
    $('modalTitle').innerHTML = won ? 'You made it<br><em>brew-tiful.</em>' : 'A busy morning<br><em>indeed.</em>';
    $('modalCopy').textContent = won
      ? `Eight happy customers, a warm café, and $${state.tips.toFixed(2)} in tips. You made this morning a little brighter.`
      : `The rush got the best of us today. You served ${state.served} of 8 orders and earned $${state.tips.toFixed(2)} in tips. There's always another morning!`;
    document.querySelector('.how-to').innerHTML = `<div><span>✿</span><b>${state.served} / 8 served</b><small>Lovely cups made</small></div><div><span>♡</span><b>$${state.tips.toFixed(2)}</b><small>Tips in your jar</small></div><div><span>☕</span><b>${state.misses} let go</b><small>We'll see them tomorrow</small></div>`;
    $('startButton').innerHTML = 'Play again <span>→</span>';
    $('overlay').classList.remove('hidden');
  }
  function start() {
    state.running = true; state.pending = false; state.served = 0; state.misses = 0; state.tips = 0; state.streak = 0; state.usedRecipes = [];
    $('overlay').classList.add('hidden');
    document.querySelector('.how-to').innerHTML = '<div><span>01</span><b>Read the ticket</b><small>Check every ingredient</small></div><div><span>02</span><b>Build the drink</b><small>Tap ingredients or press 1–6</small></div><div><span>03</span><b>Serve with love</b><small>Get all 8 orders right!</small></div>';
    $('startButton').innerHTML = 'Start your shift <span>→</span>';
    updateStats(); nextOrder(); clearInterval(tick);
    tick = setInterval(() => {
      if (!state.running || state.pending) return;
      state.patience = Math.max(0, state.patience - .45);
      updatePatience();
      if (state.patience <= 0) miss('Too slow! Your customer had to head out.');
    }, 350);
  }

  document.querySelectorAll('.ingredient').forEach(button => button.addEventListener('click', () => addIngredient(button.dataset.ingredient)));
  $('serveButton').addEventListener('click', serve);
  $('resetButton').addEventListener('click', clearCup);
  $('startButton').addEventListener('click', start);
  $('soundToggle').addEventListener('click', () => {
    state.sound = !state.sound;
    $('soundToggle').innerHTML = `${state.sound ? '♫' : '♪'} <span>Sound ${state.sound ? 'on' : 'off'}</span>`;
    if (state.sound) sound(600, .1);
  });
  document.addEventListener('keydown', event => {
    if (event.key >= '1' && event.key <= '6') {
      const button = document.querySelector(`.ingredient:nth-child(${Number(event.key)})`);
      if (button && !$('overlay').classList.contains('hidden')) return;
      if (button) addIngredient(button.dataset.ingredient);
    } else if (event.key === 'Enter' && $('overlay').classList.contains('hidden')) serve();
    else if (event.key === 'Escape' && state.running) clearCup();
  });
  updateStats();
})();
