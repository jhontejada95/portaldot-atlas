import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { MotionConfig, motion } from "motion/react";
import "./landing.css";
import "./learn.css";

const guides = [
  ["fa-compass", "START HERE", "What Atlas is for", "Atlas helps people create small, inspectable reliability observations for Portaldot. The goal is useful network evidence — not passive browser activity.", "A contribution starts only when you choose to run Sentinel. The resulting receipt records the network check and the device signature that supports it."],
  ["fa-satellite-dish", "SENTINEL", "What a check does", "Sentinel reads a live Portaldot endpoint, captures the intended network context and signs that observation from its device-local key.", "It does not browse the web for you, act as a proxy, share your connection or create a transaction on your behalf."],
  ["fa-shield-heart", "PRIVACY", "What Sentinel never reads", "Atlas does not need your browser history, tabs, passwords, private files or location to validate a network check.", "You can pause scheduled checks from Sentinel. Its device identity and latest acceptance receipt stay in the extension's local storage."],
  ["fa-file-signature", "EVIDENCE", "Why the receipt matters", "An accepted check becomes a signed receipt. You can view your wallet-linked receipts in Atlas and verify the visible proof locally.", "The public reliability feed does not expose the private contributions tied to your linked wallet."],
  ["fa-route", "PROGRESS", "What contribution progress means", "Atlas can show accepted observations and participation days today. That is activity evidence, not a token balance or a promise of value.", "Credits require a public Portaldot epoch root and a verifiable claim path. Until then, Atlas intentionally shows no claim or price."],
  ["fa-screwdriver-wrench", "HELP", "When something needs attention", "If a check fails, first confirm that Sentinel is linked, the backend is reachable and Portaldot is live. Alerts in the workspace only surface actionable issues.", "Normal successful checks belong in Evidence and My Sentinel, not in an endless inbox."],
];

const faqs = [
  ["Is Atlas a bandwidth-sharing app?", "No. Sentinel is not a proxy, VPN or bandwidth-sharing extension. It performs only the Portaldot checks you enable."],
  ["Does connecting my wallet make a transaction?", "No. Atlas uses a wallet signature to identify your browser session and show only your linked evidence. It does not ask for a token transfer or spend approval."],
  ["Can I earn or claim Credits today?", "No. Atlas has no public epoch root or claim path yet. The workspace shows real accepted activity, while Credits remain a clearly marked roadmap item."],
  ["Can I stop Sentinel later?", "Yes. You can pause scheduled checks in the extension at any time. A paused Sentinel does not create new observations."],
  ["Why is a live endpoint check useful?", "Independent, signed observations make it easier to inspect whether a network endpoint is reachable and returning the expected chain context over time."],
];

export function Learn() {
  return <MotionConfig reducedMotion="user"><div className="landing-shell learn-shell">
    <header className="landing-nav"><a className="landing-brand" href="/" aria-label="Atlas home"><span className="landing-mark"><i className="fa-solid fa-compass" aria-hidden="true" /></span><span>atlas</span></a><nav aria-label="Atlas learning navigation"><a href="/">Home</a><a className="is-current" href="/learn">Learn</a><a href="/#privacy">Privacy</a><a href="/#roadmap">Roadmap</a></nav><a className="nav-cta" href="/dashboard">Open dashboard <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></header>
    <main>
      <section className="learn-hero"><div><p className="hero-kicker"><span /> ATLAS FIELD GUIDE</p><h1>Understand the check.<br /><em>Keep the control.</em></h1><p>Atlas turns a small Portaldot observation into evidence you can inspect. This guide explains the journey in plain language before you install anything.</p><div className="learn-hero-actions"><a className="hero-primary" href="#start">Start with Atlas <i className="fa-solid fa-arrow-down" aria-hidden="true" /></a><a className="hero-secondary" href="/dashboard?view=download">Get Sentinel <i className="fa-solid fa-download" aria-hidden="true" /></a></div></div><motion.aside className="learn-signal-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}><img src="/brand/atlas-titan.png" alt="Atlas field guide mascot" /><div><span><i className="fa-solid fa-circle-check" aria-hidden="true" /> Participant-controlled</span><strong>One useful check.<br />One signed receipt.</strong><p>No browsing-data collection. No shared bandwidth.</p></div></motion.aside></section>

      <section id="start" className="learn-guide-section"><div className="section-heading"><p>THE SHORT VERSION</p><h2>Six things worth knowing before you install.</h2><span>Start with the human purpose, then open the technical detail only when you want it.</span></div><div className="guide-grid">{guides.map(([icon, label, title, summary, detail], index) => <motion.article className="guide-card" key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: index * .04 }}><span className="guide-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><p className="guide-label">{label}</p><h3>{title}</h3><p>{summary}</p><details><summary>Read the short version <i className="fa-solid fa-plus" aria-hidden="true" /></summary><p>{detail}</p></details></motion.article>)}</div></section>

      <section className="learn-steps"><div><p className="section-label">HOW TO GET STARTED</p><h2>Install only when the flow makes sense to you.</h2><p>Atlas is currently an unpacked Chrome extension MVP. It is not in Chrome Web Store yet, so the process is explicit and fully under your control.</p></div><ol>{[["01", "Download the package", "Get the current Sentinel ZIP directly from Atlas."], ["02", "Load it in Chrome", "Enable Developer mode in Chrome Extensions and choose Load unpacked."], ["03", "Link your wallet", "Connect SubWallet in Atlas, create a one-time code and paste it into Sentinel."], ["04", "Run a real check", "Choose whether checks run on a schedule, then inspect an accepted receipt."]].map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>

      <section className="learn-faq"><div className="section-heading"><p>COMMON QUESTIONS</p><h2>Clear answers before a download.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<i className="fa-solid fa-plus" aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>

      <section className="learn-cta"><div><p className="section-label">READY WHEN YOU ARE</p><h2>Make one check<br />you can inspect.</h2><p>Sentinel defaults to the public Atlas API. It stays idle until you link it and enable a check.</p></div><div className="learn-cta-actions"><a className="hero-primary" href="/dashboard?view=download">Download Sentinel <i className="fa-solid fa-download" aria-hidden="true" /></a><a className="learn-text-link" href="/dashboard?view=evidence">View live evidence <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div></section>
    </main>
    <footer className="landing-footer"><span><span className="landing-mark small"><i className="fa-solid fa-compass" aria-hidden="true" /></span> Atlas for Portaldot</span><div><a href="/learn">Learn</a><a href="/dashboard">Dashboard</a></div></footer>
  </div></MotionConfig>;
}
