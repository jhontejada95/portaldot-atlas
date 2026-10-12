import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import "./landing.css";

const proofItems = [
  ["Install and choose", "Install Sentinel, link the wallet you want to use as your Atlas profile, then choose whether scheduled checks run."],
  ["Observe and sign", "Sentinel reads a live Portaldot endpoint and signs the accepted observation with its device-local P-256 key."],
  ["Keep a receipt", "Atlas validates the reading. Your linked wallet can inspect its own accepted receipts without exposing them in the public feed."],
];

const userBenefits = [
  ["A contribution you can inspect", "Each accepted check has a timestamp, device proof and live network context in your private evidence history.", "fa-fingerprint"],
  ["Control that stays with you", "You choose the interval, can pause Sentinel, and keep its device key inside extension-local storage.", "fa-sliders"],
  ["A useful view of the network", "The workspace exposes live chain identity, finalized head, latency and signed evidence instead of a generic status badge.", "fa-tower-broadcast"],
];

const architectureSteps = [
  ["01", "Sentinel", "A browser extension runs only the checks you enable."],
  ["02", "Live Portaldot endpoint", "The check reads fresh chain identity, runtime and finalized-head data."],
  ["03", "Atlas validator", "Atlas checks the device signature and records accepted evidence."],
  ["04", "Your evidence journal", "Your linked wallet sees its own receipts; the public feed excludes them."],
];

function DownloadSheet({ onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <motion.div className="download-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section className="download-sheet" role="dialog" aria-modal="true" aria-labelledby="download-sheet-title" initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .98 }} transition={{ duration: .2 }}>
      <button className="download-sheet-close" onClick={onClose} aria-label="Close download guide"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      <span className="download-sheet-icon"><i className="fa-solid fa-satellite-dish" aria-hidden="true" /></span><p className="section-label">ATLAS SENTINEL · CHROME MVP</p><h2 id="download-sheet-title">Install a check you control.</h2><p>Sentinel connects only to the Atlas and Portaldot endpoints needed for a check. It does not inspect browser history or tabs, share bandwidth, or create transactions.</p>
      <a className="hero-primary" href="/downloads/atlas-sentinel-mvp.zip" download><i className="fa-solid fa-download" aria-hidden="true" /> Download Sentinel v0.1.1</a>
      <div className="download-sheet-links"><a href="/learn#start">Read the guide first</a><a href="/dashboard?view=download">Open installation steps</a></div>
      <small>Chrome Developer mode is required while Sentinel is an MVP package.</small>
    </motion.section>
  </motion.div>;
}

export function Landing() {
  const [downloadOpen, setDownloadOpen] = useState(false);
  return <MotionConfig reducedMotion="user"><div className="landing-shell">
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Atlas home"><span className="landing-mark"><i className="fa-solid fa-compass" aria-hidden="true" /></span><span>atlas</span></a>
      <nav aria-label="Atlas overview"><a href="#how-it-works">How it works</a><a href="/learn">Learn</a><a href="#privacy">Privacy</a><a href="#roadmap">Roadmap</a></nav>
      <a className="nav-cta" href="/dashboard">Open dashboard <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>
    </header>

    <main>
      <section className="hero-section">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, ease: "easeOut" }}><p className="hero-kicker"><span /> PORTALDOT RELIABILITY PROTOCOL</p><h1>Proof, not noise.<br /><em>Built together.</em></h1><p className="hero-lede">Atlas turns small, user-authorized Sentinel checks into signed, inspectable Portaldot reliability evidence — useful to the network and legible to the person contributing it.</p><div className="hero-actions"><button className="hero-primary hero-button" onClick={() => setDownloadOpen(true)}>Get Sentinel <i className="fa-solid fa-download" aria-hidden="true" /></button><a className="hero-secondary" href="#for-contributors">What you get <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><p className="hero-note"><i className="fa-solid fa-shield-heart" aria-hidden="true" /> You control checks. Atlas never reads browser history or shares bandwidth.</p></motion.div>
        <motion.div className="atlas-orbital" initial={{ opacity: 0, scale: .92, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .1, duration: .62, ease: "easeOut" }} aria-label="Atlas and Sentinel contribution loop">
          <motion.div className="orbital-ring ring-a" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 34, ease: "linear" }} />
          <motion.div className="orbital-ring ring-b" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 46, ease: "linear" }} />
          <motion.span className="orbital-marker marker-one" animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}><i className="fa-solid fa-satellite-dish" aria-hidden="true" /> Sentinel</motion.span>
          <motion.span className="orbital-marker marker-two" animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut" }}><i className="fa-solid fa-file-signature" aria-hidden="true" /> Signed proof</motion.span>
          <div className="mascot-halo" /><img className="atlas-mascot" src="/brand/atlas-titan.png" alt="Atlas field guide mascot" /><span className="orbital-caption"><i className="fa-solid fa-compass" aria-hidden="true" /> Atlas field guide</span>
        </motion.div>
      </section>

      <section id="how-it-works" className="proof-section"><div className="section-heading"><p>THE PARTICIPATION LOOP</p><h2>Small checks. Evidence with a purpose.</h2><span>Atlas is not a browser-data network or passive farming tool. It is a reliability contribution flow: you opt in, Sentinel reads the intended network, and Atlas retains only accepted proof.</span></div><div className="proof-grid">{proofItems.map(([title, body], index) => <motion.article className="proof-card" key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ delay: index * .08 }}><span>0{index + 1}</span><i className={`fa-solid ${index === 0 ? "fa-download" : index === 1 ? "fa-fingerprint" : "fa-receipt"}`} aria-hidden="true" /><h3>{title}</h3><p>{body}</p></motion.article>)}</div></section>

      <section id="for-contributors" className="benefits-section"><div className="benefits-heading"><div><p className="section-label">FOR CONTRIBUTORS</p><h2>What Atlas gives you today.</h2></div><p>Atlas does not promise a tradable asset, a balance or a payout before there is public on-chain proof for it. The benefit now is a controlled way to contribute useful evidence and keep a verifiable record of that participation.</p></div><div className="benefits-grid">{userBenefits.map(([title, body, icon], index) => <motion.article className="benefit-card" key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ delay: index * .08 }}><span className="benefit-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></motion.article>)}</div></section>

      <section className="architecture-section"><div className="architecture-copy"><p className="section-label">HOW THE SYSTEM WORKS</p><h2>Four boundaries, one inspectable contribution.</h2><p>Atlas separates the device check, the live network reading, validation and a person’s private receipts. This keeps a useful public reliability surface without turning a contributor’s browser activity into the product.</p><a href="/dashboard?view=evidence">Inspect live network evidence <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><ol className="architecture-flow">{architectureSteps.map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>

      <section id="privacy" className="privacy-section"><div><p className="section-label">PRIVACY BY BOUNDARY</p><h2>Reliable doesn’t need to mean invasive.</h2><p>Sentinel is not a proxy, VPN, or bandwidth-sharing extension. Its current runtime retains its device identity and latest acceptance receipt locally, then sends only a signed network observation to Atlas.</p></div><ul><li><i className="fa-solid fa-check" aria-hidden="true" /> You choose when scheduled checks run.</li><li><i className="fa-solid fa-check" aria-hidden="true" /> A check can be paused from Sentinel.</li><li><i className="fa-solid fa-check" aria-hidden="true" /> Atlas does not claim profile, balance, or location data it does not have.</li></ul></section>

      <section id="roadmap" className="roadmap-section"><div className="roadmap-top"><div><p className="section-label">BUILDING IN THE OPEN</p><h2>What you can use now, and what needs public proof first.</h2></div><a href="/dashboard">View the live workspace <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><div className="roadmap-grid"><article className="is-now"><span>AVAILABLE NOW</span><h3>Sentinel, receipts and live evidence</h3><p>Fresh Portaldot probes, signed evidence records, a private wallet-linked journal and the participant-side Sentinel runtime are working now.</p></article><article><span>ROADMAP — REQUIRES PUBLIC PORTALDOT DEPLOYMENT</span><h3>Epoch Credits</h3><p>Credits can only appear after a public epoch root and verifiable claim path exist. No balance, price or claim is shown before that proof.</p></article><article><span>ROADMAP — REQUIRES INDEPENDENT INFRASTRUCTURE</span><h3>Broader corroboration</h3><p>Atlas already supports an x402-paid independent probe. A durable multi-sentinel reliability layer needs publicly operated endpoints and independent connections.</p></article></div></section>
    </main>
    <footer className="landing-footer"><span><span className="landing-mark small"><i className="fa-solid fa-compass" aria-hidden="true" /></span> Atlas for Portaldot</span><div><a href="/learn">Learn</a><a href="/dashboard">Dashboard</a></div></footer>
    <AnimatePresence>{downloadOpen ? <DownloadSheet onClose={() => setDownloadOpen(false)} /> : null}</AnimatePresence>
  </div></MotionConfig>;
}
