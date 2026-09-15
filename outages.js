/* =============================================================================
 *  m365minus.com — the outage ledger
 * =============================================================================
 *
 *  This is the ONLY file you edit to run the site.
 *
 *  THE BAR (be strict — this is the whole joke):
 *  ---------------------------------------------
 *  An outage only earns a spot here if it was a MAJOR Microsoft 365 / Azure
 *  incident felt across North America — the "front page of r/sysadmin and
 *  r/msp, everyone refreshing the status page and twiddling their thumbs" kind.
 *  If some niche service blipped and nobody noticed, it does NOT count.
 *
 *  Each qualifying outage subtracts ONE day from that year's counter.
 *  A year starts at 365 (366 in a leap year). Four major outages → M361.
 *
 *  HOW TO LOG A NEW ONE:
 *  ---------------------
 *  Add an object to the OUTAGES array below. Fields:
 *    date     "YYYY-MM-DD"  (required) — the year decides which counter it hits
 *    title    short headline of what broke
 *    services array of affected services, e.g. ["Teams","Outlook"]
 *    severity "major" | "severe"     (severe = "call everyone" tier)
 *    summary  one factual sentence on what happened
 *    reddit   the r/sysadmin-flavored one-liner (this is the fun part)
 *    counts   true  = docks a day   |   false = logged but doesn't count
 *    links    [{ label, url }]  optional sources
 *    example  true = a SAMPLE/demo row (delete these once you have real data)
 *
 *  Set counts:false for the "...does this even count as Microsoft's fault?"
 *  debates (looking at you, CrowdStrike). It stays on the record without
 *  docking a day.
 * ========================================================================== */

window.OUTAGES = [

  /* --- SAMPLE 2026 ROWS -----------------------------------------------------
   * Fictional placeholders so you can see the countdown work. NOT REAL.
   * Delete these and log the real ones as they happen.
   * ------------------------------------------------------------------------ */
  {
    date: "2026-08-19",
    title: "Teams and Outlook down across North America for ~4 hours",
    services: ["Teams", "Outlook", "Exchange Online"],
    severity: "severe",
    summary: "SAMPLE ROW — a token-service change rolls out badly and auth fails region-wide.",
    reddit: "\"Is it just me or is Teams down\" — 400 upvotes in 6 minutes.",
    counts: true,
    example: true,
    links: []
  },
  {
    date: "2026-05-02",
    title: "SharePoint Online throwing 503s in the US East region",
    services: ["SharePoint Online", "OneDrive"],
    severity: "major",
    summary: "SAMPLE ROW — storage layer hiccup takes file access down for a morning.",
    reddit: "Half the office can't open the shared drive. The other half is on r/sysadmin.",
    counts: true,
    example: true,
    links: []
  },
  {
    date: "2026-02-11",
    title: "Exchange Online mail flow stalled coast to coast",
    services: ["Exchange Online"],
    severity: "major",
    summary: "SAMPLE ROW — mail queues back up for hours after a routing change.",
    reddit: "\"Mail is delayed 45 minutes\" tickets arriving faster than the mail.",
    counts: true,
    example: true,
    links: []
  },
  {
    date: "2026-01-08",
    title: "Azure AD / Entra sign-in failures",
    services: ["Entra ID", "Microsoft 365 sign-in"],
    severity: "severe",
    summary: "SAMPLE ROW — auth layer degraded; conditional access loops for a chunk of NA tenants.",
    reddit: "Nobody can log in to anything. Great start to the year.",
    counts: true,
    example: true,
    links: []
  },

  /* --- REAL, HISTORICAL OUTAGES (prior years) -------------------------------
   * Factually stated, widely reported. These affect their own year's counter,
   * not the current one. Flip the year selector to see them.
   * ------------------------------------------------------------------------ */
  {
    date: "2024-07-30",
    title: "Microsoft 365 & Azure outage tied to a DDoS attack",
    services: ["Microsoft 365", "Azure"],
    severity: "severe",
    summary: "Microsoft said a DDoS attack, amplified by an error in its own defenses, took down a range of 365 and Azure services for hours.",
    reddit: "Everything's down and the status page is the only thing loading.",
    counts: true,
    example: false,
    links: []
  },
  {
    date: "2024-07-19",
    title: "CrowdStrike bad update BSODs Windows worldwide",
    services: ["Windows", "everything downstream"],
    severity: "severe",
    summary: "A faulty CrowdStrike Falcon update blue-screened millions of Windows machines globally — not a Microsoft 365 fault, but it wrecked everyone's day anyway.",
    reddit: "The 'does this even count as Microsoft's fault' debate that launched a thousand threads.",
    counts: false,
    example: false,
    links: []
  },
  {
    date: "2023-01-25",
    title: "Global Microsoft 365 outage (Teams, Outlook, SharePoint)",
    services: ["Teams", "Outlook", "SharePoint Online", "Exchange Online"],
    severity: "severe",
    summary: "A WAN networking change caused packet loss and knocked 365 services offline worldwide, including across North America, for several hours.",
    reddit: "The morning the entire continent found out how much it relies on Teams.",
    counts: true,
    example: false,
    links: []
  }

];
