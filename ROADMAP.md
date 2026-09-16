# Roadmap

Ideas parked for later. Nothing here is committed to a timeline — it's a fun
project. Order is rough priority, not a promise.

## Sysadmins-in-the-trenches counter

For each logged outage, show how many sysadmins were scrambling — as a proxy for
"how much of the continent this ruined the morning for."

- **Metric:** sum `num_comments` (and optionally `score`) across all the Reddit
  threads the watcher matched for that outage. Store it on the outage entry and
  render it on the site.
- **Copy idea:** _"1,847 sysadmins piled into the threads telling users 'we're
  aware and investigating' while refreshing the status page."_
- **Why not views:** Reddit's API `view_count` field is effectively always
  `null` — view counts aren't exposed anymore. Comment count is a truer signal
  anyway: a comment is a sysadmin actually in the trenches, not a lurker.
- **Work:** the watcher already fetches `num_comments`/`score`; capture them on
  the candidate, carry them through to `outages.js`, add a field + display.

## One-click confirm from the alert

Turn a candidate issue into a logged outage without hand-editing files.

- Add a `confirmed` label to the emailed issue → a second GitHub Action reads the
  issue's structured entry, appends it to `outages.js`, commits, and pushes.
- Counter drops automatically once you approve; no local editing required.
- Keeps the human-in-the-loop bar (nothing counts until you label it).

## Other maybes

- **Custom domain:** serve the site from `m365minus.com` (GitHub Pages custom
  domain + DNS).
- **"Days since last major outage" streak** on the counter.
- **Worst outage of the year** callout.
- **All-time view** across years, not just the current one.
- **More signals:** corroborate Reddit with Hacker News (Algolia API) and a tech
  news RSS to cut false positives.
