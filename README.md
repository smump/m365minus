# M365 Minus

A petty little uptime counter. Every year starts at **365**. Each time a *major*
Microsoft 365 / Azure outage takes down North America — the front-page-of-r/sysadmin,
everyone-refreshing-the-status-page kind — the counter drops a day:

```
M365 → M364 → M363 …
```

Four qualifying outages in a year and it reads **M361**.

Live at **[m365minus.com](https://m365minus.com)**.

## The bar

The whole joke depends on being strict. A niche service blipping for ten minutes
does **not** count. "Nobody in the office can work and everyone's refreshing the
status page" does. Judgment calls (looking at you, CrowdStrike) get logged for the
record with `counts: false` — they show up, but no day is docked.

## How it works

Plain static HTML + JavaScript. No build step, no framework, no backend.

- `index.html` — the app: the counter, the stat row, the incident ledger, and a
  per-year switcher. The counter resets to 365 (or 366 in a leap year) each January
  automatically based on the current date.
- `outages.js` — the data. The **only** file you edit. Add an outage, refresh the
  page, the counter drops. The schema and the "what qualifies" rules are documented
  in comments at the top of the file.

### Logging an outage

Add an entry to the `OUTAGES` array in `outages.js`:

```js
{
  date: "2026-08-19",
  title: "Teams and Outlook down across North America for ~4 hours",
  services: ["Teams", "Outlook", "Exchange Online"],
  severity: "severe",              // "major" | "severe"
  summary: "One factual sentence on what happened.",
  reddit: "The r/sysadmin-flavored one-liner.",
  counts: true,                    // false = logged, but no day docked
  example: false,                  // true = a sample/demo row
  links: []
}
```

## Running it locally

It's a static site — just open `index.html` in any browser. (Fonts load from
Google Fonts, so styling looks best online; the app itself works fully offline and
falls back to system fonts.)

## Automated outage watching (optional)

Manually logging outages is the default, but there's a helper that watches for
them so you don't have to refresh Reddit yourself.

`.github/workflows/outage-watch.yml` runs every 30 minutes on GitHub Actions
(free) and calls `scripts/watch-reddit.mjs`, which scans r/sysadmin, r/msp,
r/Office365, and r/microsoft for the "everything's down, everyone's posting"
pattern. When the chatter crosses the bar, it **opens a GitHub Issue assigned to
you** — GitHub emails it to your inbox — with the top threads, links, a guessed
service list, and a paste-ready `outages.js` snippet.

It **never edits the counter.** Detection is automated; the judgment call stays
yours. You confirm by pasting the snippet in and pushing (or close the issue if
it doesn't clear the bar).

### Setup

1. Create a Reddit "script" app at <https://www.reddit.com/prefs/apps> and note
   its **client id** and **secret**.
2. Add them as repository secrets (values are entered by you, never stored in
   the repo):
   ```bash
   gh secret set REDDIT_CLIENT_ID --repo smump/m365minus
   gh secret set REDDIT_CLIENT_SECRET --repo smump/m365minus
   ```
3. Test the pipeline without waiting for a real outage:
   ```bash
   gh workflow run "Outage watch (Reddit)" --repo smump/m365minus -f test_mode=true
   ```
   You should get an emailed GitHub Issue titled `[TEST] Possible major M365 outage`.

Detection thresholds (how popular the chatter must be) live in the `CONFIG`
block at the top of `scripts/watch-reddit.mjs` — tune them to taste.

## License

[MIT](LICENSE) — do whatever you like with it.
