import { store } from './storage.js';
import { thumbnail } from './thumbs.js';
import { preload, settle } from './assets.js';
import { MODEL } from './world.js';
import { playPet, configureAudio, listVoices, say } from './audio.js';

const $ = (id) => document.getElementById(id);
const prompt = $('prompt'), pImg = $('prompt-img'), pDots = $('prompt-dots'), pText = $('prompt-text');
const cheerEl = $('cheer'), cheerText = $('cheer-text'), cheerImg = $('cheer-img');

export const ALL_PETS = ['cow', 'pig', 'chick', 'dog', 'cat', 'bunny', 'hog', 'fox', 'deer', 'beaver', 'koala', 'panda', 'caterpillar', 'bee', 'penguin', 'crab', 'fish', 'parrot', 'monkey', 'elephant', 'polar', 'lion', 'tiger', 'giraffe'];

export const hud = {
  onRepeat: null,
  showButtons(home, book, homeIsland = false) { $('home').hidden = !home; $('exit').hidden = home; $('book').hidden = !book; $('stars').hidden = book; ['feed', 'callall', 'seed', 'party', 'night'].forEach((k) => { $(k).hidden = !homeIsland; $(k).classList.remove('on'); }); hud.stars(store.stars(), false); },
  // Progress toward the next new friend: filled dots + a picture of who is coming.
  goal(filled, total, img) {
    const g = $('star-goal');
    g.innerHTML = '';
    for (let i = 0; i < total; i++) { const s = document.createElement('span'); if (i < filled) s.className = 'on'; g.appendChild(s); }
    if (img) { const im = document.createElement('img'); im.src = img; im.alt = ''; g.appendChild(im); }
  },
  stars(n, pop = true) {
    $('star-count').textContent = n;
    if (pop) { const el = $('stars'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  },
  prompt({ img, color, dots, lit = 0, text, imgScale = 1 }) {
    prompt.hidden = false;
    pImg.style.transform = `scale(${imgScale})`;
    if (img) { pImg.src = img; pImg.hidden = false; pImg.classList.remove('color'); pImg.style.background = '#f3f7ff'; }
    else if (color) { pImg.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="${color}"/></svg>`); pImg.hidden = false; pImg.classList.add('color'); pImg.style.background = 'transparent'; }
    else pImg.hidden = true;
    pDots.innerHTML = '';
    if (dots) for (let i = 0; i < dots; i++) { const s = document.createElement('span'); if (i < lit) s.className = 'on'; pDots.appendChild(s); }
    pText.textContent = text || '';
    prompt.classList.remove('pulse'); void prompt.offsetWidth; prompt.classList.add('pulse');
  },
  dots(lit) { [...pDots.children].forEach((s, i) => s.classList.toggle('on', i < lit)); },
  hidePrompt() { prompt.hidden = true; },
  cheer(text, img, ms = 1800) {
    cheerText.textContent = text;
    if (img) { cheerImg.src = img; cheerImg.hidden = false; } else cheerImg.hidden = true;
    cheerEl.hidden = false;
    clearTimeout(cheerEl._t);
    cheerEl._t = setTimeout(() => { cheerEl.hidden = true; }, ms);
  },
  async openStickers() {
    const grid = $('sticker-grid');
    $('stickers').hidden = false;
    grid.innerHTML = '<div class="tiny">Loading…</div>';
    await preload(ALL_PETS.map((id) => MODEL('pets/animal-' + id)));
    await settle();
    grid.innerHTML = '';
    const met = store.get().met;
    for (const id of ALL_PETS) {
      const b = document.createElement('button');
      const has = met.includes(id);
      b.className = has ? '' : 'locked';
      const img = document.createElement('img');
      img.src = thumbnail(MODEL('pets/animal-' + id));
      img.alt = id;
      b.appendChild(img);
      if (has) b.addEventListener('pointerdown', () => { playPet(id); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 300); });
      grid.appendChild(b);
    }
    $('stickers').hidden = false;
  },
  openSettings() {
    const s = store.settings();
    $('s-voice').checked = s.voice; $('s-sound').checked = s.sound;
    $('s-find').checked = s.modes.find; $('s-colour').checked = s.modes.colour; $('s-count').checked = s.modes.count; $('s-size').checked = s.modes.size;
    $('s-rounds').value = s.roundsPerSession;
    $('s-name').value = s.name || '';
    $('s-avatar').value = s.avatar || 'girl';
    fillVoices(s.voiceName);
    $('settings').hidden = false;
  }
};

function fillVoices(selected) {
  const sel = $('s-voicename');
  const voices = listVoices();
  sel.innerHTML = '<option value="">Automatic</option>';
  for (const v of voices) {
    const o = document.createElement('option');
    o.value = v.name; o.textContent = `${v.name} (${v.lang})`;
    if (v.name === selected) o.selected = true;
    sel.appendChild(o);
  }
  if (!voices.length) { const o = document.createElement('option'); o.disabled = true; o.textContent = 'No voices found on this device'; sel.appendChild(o); }
}

export function bindHud({ onHome, onBook, onRepeat, onReset, onSettings, onDelete }) {
  $('home').addEventListener('pointerdown', (e) => { e.stopPropagation(); onHome(); });
  $('book').addEventListener('pointerdown', (e) => { e.stopPropagation(); onBook ? onBook() : hud.openStickers(); });
  prompt.addEventListener('pointerdown', (e) => { e.stopPropagation(); onRepeat && onRepeat(); });
  document.querySelectorAll('.close').forEach((b) => b.addEventListener('pointerdown', () => { $(b.dataset.close).hidden = true; }));

  // Settings bindings.
  const upd = () => {
    const s = {
      voice: $('s-voice').checked, sound: $('s-sound').checked,
      modes: { find: $('s-find').checked, colour: $('s-colour').checked, count: $('s-count').checked, size: $('s-size').checked },
      roundsPerSession: Math.max(3, Math.min(12, parseInt($('s-rounds').value) || 6)),
      name: $('s-name').value.trim(),
      voiceName: $('s-voicename').value,
      avatar: $('s-avatar').value
    };
    store.setSettings(s); configureAudio(s);
    onSettings && onSettings();
  };
  ['s-voice', 's-sound', 's-find', 's-colour', 's-count', 's-size', 's-rounds', 's-name', 's-voicename', 's-avatar'].forEach((id) => $(id).addEventListener('change', upd));
  $('s-voicetest').addEventListener('pointerdown', () => { const n = store.settings().name; say('voicetest', n ? `Hi ${n}! Where is the cow?` : 'Hi! Where is the cow?'); });
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', () => { if (!$('settings').hidden) fillVoices(store.settings().voiceName); });
  $('s-reset').addEventListener('pointerdown', () => { store.reset(); configureAudio(store.settings()); $('settings').hidden = true; onReset && onReset(); });

  $('s-delete').addEventListener('pointerdown', () => { $('settings').hidden = true; onDelete && onDelete(); });
  // Long-press bottom-left corner opens the grown-ups panel.
  const zone = $('gear-zone');
  let t = null;
  zone.addEventListener('pointerdown', (e) => { e.stopPropagation(); t = setTimeout(() => hud.openSettings(), 2000); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => zone.addEventListener(ev, () => clearTimeout(t)));
  configureAudio(store.settings());
}
