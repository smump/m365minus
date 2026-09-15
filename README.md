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

## License

[MIT](LICENSE) — do whatever you like with it.
