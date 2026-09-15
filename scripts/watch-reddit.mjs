// =============================================================================
//  watch-reddit.mjs — the M365 Minus outage watcher
// -----------------------------------------------------------------------------
//  Scans a few sysadmin-heavy subreddits for the "everything's down and
//  everyone's posting about it" pattern. When the chatter crosses the bar,
//  it opens a GitHub Issue assigned to you (which GitHub emails you), with the
//  evidence and a paste-ready outages.js snippet. You make the final call.
//
//  It never edits the counter. Detection is automated; judgment stays human.
//
//  Runs on a GitHub Actions runner (Node 20+, global fetch). No dependencies.
//  Env it expects:
//    REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET  — Reddit "script" app creds
//    GITHUB_TOKEN                            — provided by Actions
//    GITHUB_REPOSITORY                       — "owner/repo", provided by Actions
//    ISSUE_ASSIGNEE                          — who to assign/email (e.g. "smump")
//    TEST_MODE = "true"                      — skip Reddit, file a sample issue
// =============================================================================

// ---- TUNABLES (adjust these to taste) --------------------------------------
const CONFIG = {
  subreddits: ["sysadmin", "msp", "Office365", "microsoft"],

  // Only posts newer than this (hours) count toward a detection.
  windowHours: 6,

  // A single post this popular within the window trips the alarm on its own.
  scoreStrong: 200,
  // ...or this many separate posts each above scoreMulti.
  scoreMulti: 30,
  minPosts: 3,

  // Don't open a second candidate issue if one was opened within this window.
  dedupHours: 18,

  label: "outage-candidate",

  // Text signals. A post must match at least one IMPACT word AND one MS word.
  impactWords: [
    "outage", "down", "is down", "degraded", "offline", "not working",
    "isn't working", "can't log in", "cant log in", "unable to log", "unable to sign",
    "won't load", "not loading", "disruption", "is anyone else", "anyone else seeing",
    "anyone else having", "major issue", "widespread", "p1", "sev1", "sev 1",
  ],
  msWords: [
    "microsoft 365", "m365", "office 365", "o365", "teams", "outlook",
    "exchange online", "exchange", "sharepoint", "onedrive", "entra", "azure ad",
    "azuread", "azure", "intune", "autopilot", "defender", "purview", "copilot",
    "power automate", "power platform", "sign in", "authentication", "mfa",
  ],
  // Purely a hint shown to you in the issue — does NOT gate detection.
  naWords: [
    "north america", "united states", " usa", " u.s", "us-east", "useast",
    "east coast", "west coast", "canada", " est ", " pst ", " cst ", "americas",
  ],
};

// Map a matched keyword to a canonical service name for the suggested snippet.
const SERVICE_MAP = [
  [["teams"], "Teams"],
  [["outlook", "exchange"], "Exchange Online"],
  [["sharepoint"], "SharePoint Online"],
  [["onedrive"], "OneDrive"],
  [["entra", "azure ad", "azuread", "sign in", "authentication", "mfa"], "Entra ID"],
  [["intune", "autopilot"], "Intune"],
  [["azure"], "Azure"],
  [["defender", "purview"], "Microsoft Defender"],
  [["copilot"], "Copilot"],
];

const UA = "m365minus-outage-watch/1.0 (+https://github.com/smump/m365minus)";
const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || "smump/m365minus").split("/");
const ASSIGNEE = process.env.ISSUE_ASSIGNEE || "";
const GH_TOKEN = process.env.GITHUB_TOKEN;

// ---- helpers ---------------------------------------------------------------
const lc = (s) => (s || "").toLowerCase();
const hoursAgo = (utcSeconds) => (Date.now() / 1000 - utcSeconds) / 3600;

async function gh(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": UA,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

async function ensureLabel() {
  const res = await gh(`/repos/${OWNER}/${REPO}/labels`, {
    method: "POST",
    body: { name: CONFIG.label, color: "f5a623", description: "Auto-flagged possible major M365 outage" },
  });
  // 201 created, or 422 already exists — both fine.
  if (!res.ok && res.status !== 422) {
    console.log(`Label ensure returned ${res.status} (continuing)`);
  }
}

async function recentCandidateOpen() {
  const res = await gh(
    `/repos/${OWNER}/${REPO}/issues?state=open&labels=${encodeURIComponent(CONFIG.label)}&per_page=30`
  );
  if (!res.ok || !Array.isArray(res.data)) return false;
  const cutoff = Date.now() - CONFIG.dedupHours * 3600 * 1000;
  return res.data.some((i) => !i.pull_request && new Date(i.created_at).getTime() >= cutoff);
}

async function openIssue(title, body) {
  const payload = { title, body, labels: [CONFIG.label] };
  if (ASSIGNEE) payload.assignees = [ASSIGNEE];
  const res = await gh(`/repos/${OWNER}/${REPO}/issues`, { method: "POST", body: payload });
  if (!res.ok) {
    console.error(`Failed to create issue (${res.status}):`, res.data);
    process.exit(1);
  }
  console.log(`Opened issue #${res.data.number}: ${res.data.html_url}`);
}

// ---- Reddit ----------------------------------------------------------------
async function redditToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!res.ok) {
    console.error(`Reddit token failed (${res.status}): ${await res.text()}`);
    return null;
  }
  return (await res.json()).access_token;
}

async function searchSub(token, sub) {
  const q = encodeURIComponent(
    'outage OR down OR degraded OR offline OR "not working" OR "anyone else"'
  );
  const url =
    `https://oauth.reddit.com/r/${sub}/search` +
    `?q=${q}&restrict_sr=true&sort=top&t=day&limit=100&raw_json=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": UA },
  });
  if (!res.ok) {
    console.error(`Search r/${sub} failed (${res.status})`);
    return [];
  }
  const json = await res.json();
  return (json?.data?.children || []).map((c) => c.data);
}

function isMatch(post) {
  const hay = lc(post.title) + " " + lc(post.selftext);
  const impact = CONFIG.impactWords.some((w) => hay.includes(w));
  const ms = CONFIG.msWords.some((w) => hay.includes(w));
  return impact && ms;
}

function guessServices(posts) {
  const hay = posts.map((p) => lc(p.title) + " " + lc(p.selftext)).join(" ");
  const found = [];
  for (const [keys, name] of SERVICE_MAP) {
    if (keys.some((k) => hay.includes(k)) && !found.includes(name)) found.push(name);
  }
  return found.slice(0, 4);
}

function naHint(posts) {
  const hay = posts.map((p) => " " + lc(p.title) + " " + lc(p.selftext) + " ").join(" ");
  return CONFIG.naWords.some((w) => hay.includes(w));
}

// ---- issue body builders ---------------------------------------------------
function today() {
  return new Date().toISOString().slice(0, 10);
}

function snippet(services, severity) {
  const svc = services.length ? services : ["Microsoft 365"];
  return [
    "{",
    `  date: "${today()}",`,
    `  title: "REVIEW ME — ${svc.join(", ")} outage across North America",`,
    `  services: [${svc.map((s) => `"${s}"`).join(", ")}],`,
    `  severity: "${severity}",              // "major" | "severe"`,
    `  summary: "Confirm what actually broke before you log this.",`,
    `  reddit: "Write the r/sysadmin-flavored one-liner here.",`,
    "  counts: true,                    // set false if it doesn't clear the bar",
    "  example: false,",
    "  links: []",
    "},",
  ].join("\n");
}

function buildBody({ matched, top, services, severity, na, reason }) {
  const rows = top
    .map((p) => {
      const url = `https://www.reddit.com${p.permalink}`;
      const age = hoursAgo(p.created_utc).toFixed(1);
      return `- **${p.score}▲** · r/${p.subreddit} · [${p.title.replace(/[|\n]/g, " ")}](${url}) _(≈${age}h ago, ${p.num_comments} comments)_`;
    })
    .join("\n");

  return `> ⚠️ **Automated candidate — not confirmed.** The watcher thinks a major Microsoft 365 outage may be happening in North America. **You decide** whether it clears the bar.

**Why it fired:** ${reason}
**Matching posts in the last ${CONFIG.windowHours}h:** ${matched}
**North America signal:** ${na ? "yes — a post mentions a NA region/timezone" : "not detected in text (confirm manually)"}
**Guessed services:** ${services.length ? services.join(", ") : "unclear"}

### Top threads
${rows || "_(none captured)_"}

### Does it clear the bar?
- [ ] Front-page-of-r/sysadmin level, not a niche blip
- [ ] Actually Microsoft's fault (not a single ISP / a CrowdStrike-style third party)
- [ ] Hit **North America**
- [ ] It's real (not a viral "is anyone else down?" that turned out to be nothing)

### If yes — log it
Paste this into the \`OUTAGES\` array in \`outages.js\`, fix the details, commit & push:

\`\`\`js
${snippet(services, severity)}
\`\`\`

If it **doesn't** clear the bar, set \`counts: false\` (or just close this issue).

---
_Filed by \`.github/workflows/outage-watch.yml\`. Tune thresholds in \`scripts/watch-reddit.mjs\`._`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (!GH_TOKEN) {
    console.error("No GITHUB_TOKEN — cannot file issues. Exiting.");
    process.exit(1);
  }
  await ensureLabel();

  // TEST MODE: verify the email/issue pipeline without touching Reddit.
  if (process.env.TEST_MODE === "true") {
    console.log("TEST_MODE — filing a sample candidate issue.");
    const body = buildBody({
      matched: 3,
      top: [
        { score: 842, subreddit: "sysadmin", title: "Is Teams down for anyone else? (TEST)", permalink: "/r/sysadmin/", created_utc: Date.now() / 1000 - 3600, num_comments: 210 },
        { score: 133, subreddit: "msp", title: "Outlook / Exchange Online throwing errors (TEST)", permalink: "/r/msp/", created_utc: Date.now() / 1000 - 5400, num_comments: 47 },
      ],
      services: ["Teams", "Exchange Online"],
      severity: "severe",
      na: true,
      reason: "TEST_MODE sample — this is what a real alert looks like.",
    });
    await openIssue(`[TEST] Possible major M365 outage — ${today()}`, body);
    return;
  }

  const token = await redditToken();
  if (!token) {
    console.log("Reddit credentials not set (or token failed). Nothing to scan yet.");
    console.log("Add REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET as repo secrets, then re-run.");
    return;
  }

  // Gather + de-duplicate posts across subs.
  const seen = new Set();
  let posts = [];
  for (const sub of CONFIG.subreddits) {
    for (const p of await searchSub(token, sub)) {
      if (p && !seen.has(p.id)) { seen.add(p.id); posts.push(p); }
    }
  }

  const inWindow = posts.filter((p) => hoursAgo(p.created_utc) <= CONFIG.windowHours);
  const matched = inWindow.filter(isMatch);
  matched.sort((a, b) => b.score - a.score);

  const strong = matched.find((p) => p.score >= CONFIG.scoreStrong);
  const multi = matched.filter((p) => p.score >= CONFIG.scoreMulti);
  const isCandidate = !!strong || multi.length >= CONFIG.minPosts;

  console.log(
    `Scanned ${posts.length} posts · ${matched.length} matched in ${CONFIG.windowHours}h · ` +
    `top score ${matched[0]?.score ?? 0} · candidate=${isCandidate}`
  );

  if (!isCandidate) return;

  if (await recentCandidateOpen()) {
    console.log(`A candidate issue is already open (within ${CONFIG.dedupHours}h). Skipping.`);
    return;
  }

  const top = matched.slice(0, 6);
  const services = guessServices(top);
  const severity = strong || matched[0]?.score >= 500 ? "severe" : "major";
  const reason = strong
    ? `a single post hit ${strong.score}▲ (≥ ${CONFIG.scoreStrong})`
    : `${multi.length} posts each ≥ ${CONFIG.scoreMulti}▲ (≥ ${CONFIG.minPosts} required)`;

  const body = buildBody({ matched: matched.length, top, services, severity, na: naHint(top), reason });
  await openIssue(`⚠️ Possible major M365 outage — ${today()}`, body);
}

main().catch((e) => { console.error(e); process.exit(1); });
