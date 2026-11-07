// Pure logic of the launcher page (launcher/). The publish script strips the types to make
// launcher/core.js, so the phone runs exactly this code. No DOM or network access here.
//
// The launcher URL fragment holds the device key (k) and the gist id (g). It sends the key only
// to a trycloudflare.com address, so a changed gist cannot send the key to another site.

export const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
export const GIST_RE = /^[0-9a-f]{20,40}$/;
export const TUNNEL_RE = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;
const TUNNEL_IN_TEXT = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

                                                                    
                                                         
                                       
                                                                          

export function parseHash(hash        )                    {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const k = p.get('k') ?? '';
  const g = p.get('g') ?? '';
  return KEY_RE.test(k) && GIST_RE.test(g) ? { k, g, fresh: p.get('new') === '1' } : null;
}

export const hashOf = (c                          ) => `#k=${c.k}&g=${c.g}`;

function fromJson(text                    )                 {
  try {
    const j = JSON.parse(text ?? '');
    return TUNNEL_RE.test(j.url) ? { url: j.url, updated: Number(j.updated) || 0 } : null;
  } catch { return null; }
}

// The current tunnel address from a gist API answer: the JSON file first, the Markdown file next.
export function pickAddress(gist                 )                 {
  const files = gist?.files ?? {};
  const a = fromJson(files['optchat-remote.json']?.content);
  if (a) return a;
  const m = TUNNEL_IN_TEXT.exec(files['optchat-remote.md']?.content ?? '');
  return m ? { url: m[0], updated: 0 } : null;
}

// Wait before try n+1: 3 s, 6 s, 12 s ... at most 60 s. The GitHub API allows 60 calls an hour.
export const retryDelay = (n        ) => Math.min(3000 * 2 ** Math.max(0, n), 60_000);

export const resumeUrl = (url        , key        ) => `${url}/__remote/resume#${key}`;
