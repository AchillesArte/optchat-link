// OptChat Remote launcher. It finds the current tunnel address in the gist, checks that the
// bridge answers, then opens it with this device's permanent key. See src/launcher-core.ts.
import { hashOf, parseHash, pickAddress, resumeUrl, retryDelay } from './core.js';

const STORE = 'optchat-link';
const USER = 'AchillesArte';
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (text, cls = '') => { $('status').textContent = text; $('status').className = cls; };
const when = t => new Date(t).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

// The key lives in the address fragment (so a Home Screen icon keeps it) and in localStorage.
function config() {
  const fromHash = parseHash(location.hash);
  if (fromHash) {
    localStorage.setItem(STORE, JSON.stringify({ k: fromHash.k, g: fromHash.g }));
    if (fromHash.fresh) history.replaceState(null, '', location.pathname + hashOf(fromHash));
    return fromHash;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    const c = saved && parseHash(hashOf(saved));
    if (c) history.replaceState(null, '', location.pathname + hashOf(c));
    return c;
  } catch { return null; }
}

async function gist(g) {
  try {
    const r = await fetch(`https://api.github.com/gists/${g}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (r.ok) return await r.json();
  } catch { /* fall through to the raw file */ }
  const r = await fetch(`https://gist.githubusercontent.com/${USER}/${g}/raw/optchat-remote.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('gist ' + r.status);
  return { files: { 'optchat-remote.json': { content: await r.text() } } };
}

async function answers(url) {
  try {
    const r = await fetch(url + '/__remote/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return r.ok && (await r.text()) === 'ok';
  } catch { return false; }
}

let wake = null;
async function find(g) {
  try { return pickAddress(await gist(g)); } catch { return null; }   // network or GitHub trouble
}

const since = a => (a && a.updated ? ` (address from ${when(a.updated)})` : '');

async function connect(c) {
  for (let n = 0; ; n++) {
    say('Finding your PC.');
    const a = await find(c.g);
    if (a && await answers(a.url)) { say('Opening OptChat.', 'good'); location.replace(resumeUrl(a.url, c.k)); return; }
    const wait = retryDelay(n);
    say(`Your PC does not answer${since(a)}. The PC can be off or in a restart. Next try in ${Math.round(wait / 1000)} s.`, 'bad');
    await Promise.race([sleep(wait), new Promise(r => { wake = r; })]);
  }
}

const c = config();
if (!c) { $('none').hidden = false; $('go').hidden = true; say(''); }
else {
  let started = false;
  const start = () => { if (wake) wake(); if (!started) { started = true; connect(c); } };
  $('go').onclick = start;
  if (c.fresh && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) { $('setup').hidden = false; say('Then tap Open OptChat.'); }
  else start();
}
