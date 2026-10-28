import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { useState } from "react";
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import "./landing.css";

const copy = {
  en: {
    nav: ["How it works", "Learn", "Roadmap"],
    heroKicker: "PORTALDOT QUEST & REWARD PROTOCOL",
    heroTitle: <>Participate with purpose.<br /><em>Prove your contribution.</em></>,
    heroLede: "Atlas turns campaigns into clear, verifiable quests: complete a task, submit the right proof, earn seasonal Gems or Score, and spend eligible Gems on useful rewards.",
    primary: "Explore Season Zero", secondary: "How the loop works", note: "Every action has a clear purpose, a visible rule and a record you can follow.",
    loopLabel: "THE ATLAS LOOP", loopTitle: "Quests that lead somewhere.", loopBody: "Atlas brings familiar campaign quests into a more meaningful journey. Social actions, feedback and Sentinel contributions each have their own way to be reviewed, so people always understand what they are doing and why it matters.",
    benefitsLabel: "WHAT USERS GET", benefitsTitle: "A campaign experience with visible rules.", benefitsBody: "Gems are seasonal points, Score measures campaign progress and Rank records participation history. Together they make progress easier to understand and rewards easier to use.",
    economyLabel: "THE ECONOMY", economyTitle: "Earn proof. Spend with purpose.", economyBody: "Reward Hub gives Gems a clear destination: OG badges, Boosters and Modules with a fixed selection, clear costs and defined limits.",
    roadmapLabel: "THE ATLAS ROADMAP", roadmapTitle: "A platform that grows with every campaign.", roadmapLink: "Explore Atlas",
    footer: "Atlas for Portaldot", dashboard: "Open dashboard", learn: "Learn", privacy: "Trust & safety"
  },
  es: {
    nav: ["Cómo funciona", "Aprender", "Hoja de ruta"],
    heroKicker: "PROTOCOLO DE QUESTS Y RECOMPENSAS DE PORTALDOT",
    heroTitle: <>Participa con propósito.<br /><em>Demuestra tu aporte.</em></>,
    heroLede: "Atlas convierte campañas en quests claras y verificables: completa una actividad, presenta la prueba correcta, gana Gems o Score de temporada y usa los Gems elegibles en recompensas útiles.",
    primary: "Explorar Season Zero", secondary: "Cómo funciona", note: "Cada acción tiene un propósito claro, una regla visible y un recorrido que puedes seguir.",
    loopLabel: "EL CICLO DE ATLAS", loopTitle: "Quests que llevan a alguna parte.", loopBody: "Atlas convierte las quests de campaña en un recorrido más significativo. Las acciones sociales, el feedback y las contribuciones de Sentinel tienen su propia forma de revisión, para que cada persona entienda qué está haciendo y por qué importa.",
    benefitsLabel: "QUÉ RECIBE EL USUARIO", benefitsTitle: "Una campaña con reglas visibles.", benefitsBody: "Los Gems son puntos de temporada, el Score mide el progreso de campaña y el Rank reúne el historial de participación. Juntos hacen que el avance sea fácil de entender y las recompensas, fáciles de usar.",
    economyLabel: "LA ECONOMÍA", economyTitle: "Gana con pruebas. Gasta con propósito.", economyBody: "Reward Hub les da un destino claro a los Gems: badges OG, Boosters y Modules de selección fija, con costos claros y límites definidos.",
    roadmapLabel: "HOJA DE RUTA DE ATLAS", roadmapTitle: "Una plataforma que crece con cada campaña.", roadmapLink: "Explorar Atlas", footer: "Atlas para Portaldot", dashboard: "Abrir dashboard", learn: "Aprender", privacy: "Confianza y seguridad"
  }
};

const proofItems = {
  en: [
    ["Discover a campaign", "Choose a live route from the Campaign Board and read its proof method, limits, cooldown and reward boundary."],
    ["Complete and prove", "Finish a social, feedback, Sentinel or future on-chain quest. Atlas follows the reward rule defined by the campaign."],
    ["Earn, rank and spend", "Receive Campaign Score or eligible Gems, then use Gems in Reward Hub for a fixed-choice Module or commemorative badge."],
  ],
  es: [
    ["Descubre una campaña", "Elige una ruta del Campaign Board y revisa su método de prueba, límites, cooldown y reglas de recompensa."],
    ["Completa y demuestra", "Haz una quest social, de feedback, Sentinel o futura on-chain. Atlas solo recompensa un estado de prueba aceptado por la campaña."],
    ["Gana, sube de rango y gasta", "Recibe Campaign Score o Gems elegibles y úsalos en Reward Hub para un Module o badge conmemorativo de selección fija."],
  ]
};

function InteractiveAtlasOrbital({ children }) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [7, -7]), { stiffness: 170, damping: 24, mass: .6 });
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-7, 7]), { stiffness: 170, damping: 24, mass: .6 });
  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1);
    pointerY.set(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  };
  const resetTilt = () => { pointerX.set(0); pointerY.set(0); };
  return <motion.div className="atlas-orbital" initial={{ opacity: 0, scale: .92, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .1, duration: .62, ease: "easeOut" }} style={{ rotateX, rotateY, transformPerspective: 1200 }} onPointerMove={handlePointerMove} onPointerLeave={resetTilt} aria-label="Atlas and Sentinel contribution loop">{children}</motion.div>;
}

export function Landing() {
  const [language, setLanguage] = useState(() => window.localStorage.getItem("atlas-landing-language") || "en");
  const t = copy[language];
  const setLandingLanguage = (value) => { setLanguage(value); window.localStorage.setItem("atlas-landing-language", value); };
  return <MotionConfig reducedMotion="user"><div className="landing-shell">
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Atlas home"><span className="landing-mark"><i className="fa-solid fa-compass" aria-hidden="true" /></span><span>atlas</span></a>
      <nav aria-label="Atlas overview"><a href="#how-it-works">{t.nav[0]}</a><a href="/learn">{t.nav[1]}</a><a href="#privacy">{t.privacy}</a><a href="#roadmap">{t.nav[2]}</a></nav>
      <div className="landing-nav-actions"><div className="language-switcher" role="group" aria-label="Language"><button className={language === "en" ? "is-active" : ""} onClick={() => setLandingLanguage("en")}>EN</button><button className={language === "es" ? "is-active" : ""} onClick={() => setLandingLanguage("es")}>ES</button></div><a className="nav-cta" href="/dashboard">{t.dashboard} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></div>
    </header>

    <main>
      <section className="hero-section">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, ease: "easeOut" }}><p className="hero-kicker"><span /> {t.heroKicker}</p><h1>{t.heroTitle}</h1><p className="hero-lede">{t.heroLede}</p><div className="hero-actions"><a className="hero-primary" href="/dashboard?view=farm">{t.primary} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a><a className="hero-secondary" href="#how-it-works">{t.secondary} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><p className="hero-note"><i className="fa-solid fa-shield-heart" aria-hidden="true" /> {t.note}</p></motion.div>
        <InteractiveAtlasOrbital>
          <motion.div className="orbital-ring ring-a" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 34, ease: "linear" }} />
          <motion.div className="orbital-ring ring-b" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 46, ease: "linear" }} />
          <motion.span className="orbital-marker marker-one" animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}><i className="fa-solid fa-satellite-dish" aria-hidden="true" /> Sentinel</motion.span>
          <motion.span className="orbital-marker marker-two" animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut" }}><i className="fa-solid fa-file-signature" aria-hidden="true" /> Signed proof</motion.span>
          <div className="mascot-halo" /><img className="atlas-mascot" src="/brand/atlas-titan.png" alt="Atlas field guide mascot" /><span className="orbital-caption"><i className="fa-solid fa-compass" aria-hidden="true" /> Atlas field guide</span>
        </InteractiveAtlasOrbital>
      </section>

      <section className="protocol-section protocol-section-priority"><div className="section-heading"><p>{language === "es" ? "PARA PROTOCOLOS" : "FOR PROTOCOL TEAMS"}</p><h2>{language === "es" ? "Convierte la atención en participación." : "Turn attention into participation."}</h2><span>{language === "es" ? "Atlas ayuda a los protocolos a atraer participantes, guiar acciones valiosas y convertir cada campaña en una experiencia de progreso visible." : "Atlas helps protocols attract contributors, guide meaningful actions and turn every campaign into a visible progression journey."}</span></div><div className="protocol-grid">{[["fa-pen-ruler", language === "es" ? "Campaign Studio" : "Campaign Studio", language === "es" ? "Diseña campañas, quests, reglas y recompensas sin construir todo desde cero." : "Design campaigns, quests, rules and rewards without rebuilding the whole system."],["fa-chart-line", language === "es" ? "Crecimiento medible" : "Measurable growth", language === "es" ? "Entiende finalización, retención y avance de la comunidad." : "Understand completion, retention and community progression."],["fa-network-wired", language === "es" ? "Integraciones" : "Integrations", language === "es" ? "Empieza en Portaldot y amplía el alcance con adaptadores de red." : "Start with Portaldot and expand through network adapters."]].map(([icon, title, body]) => <article className="protocol-card" key={title}><span className="benefit-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section id="how-it-works" className="proof-section"><div className="section-heading"><p>{t.loopLabel}</p><h2>{t.loopTitle}</h2><span>{t.loopBody}</span></div><div className="proof-grid">{proofItems[language].map(([title, body], index) => <motion.article className="proof-card" key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ delay: index * .08 }}><span>0{index + 1}</span><i className={`fa-solid ${index === 0 ? "fa-route" : index === 1 ? "fa-fingerprint" : "fa-gem"}`} aria-hidden="true" /><h3>{title}</h3><p>{body}</p></motion.article>)}</div></section>

      <section id="for-contributors" className="benefits-section"><div className="benefits-heading"><div><p className="section-label">{t.benefitsLabel}</p><h2>{t.benefitsTitle}</h2></div><p>{t.benefitsBody}</p></div><div className="benefits-grid">{[["Gems", language === "es" ? "Puntos gastables de temporada, con límites y sinks visibles." : "Seasonal points that can be spent, bounded by clear limits and sinks.", "fa-gem"],["Campaign Score", language === "es" ? "Progreso y elegibilidad de la campaña; no se consume al canjear." : "Campaign progress and eligibility; it is not consumed when you redeem.", "fa-chart-line"],["Rank & history", language === "es" ? "Historial de participación que reúne lo que has construido durante la temporada." : "Participation history that reflects what you build throughout the season.", "fa-ranking-star"]].map(([title, body, icon], index) => <motion.article className="benefit-card" key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ delay: index * .08 }}><span className="benefit-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></motion.article>)}</div></section>

      <section className="architecture-section"><div className="architecture-copy"><p className="section-label">{t.economyLabel}</p><h2>{t.economyTitle}</h2><p>{t.economyBody}</p><a href="/dashboard?view=farm">{language === "es" ? "Explorar Reward Hub" : "Explore the Reward Hub"} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><ol className="architecture-flow">{[["01", "Campaign Board", language === "es" ? "Descubre campañas activas y entiende qué propone cada una." : "Discover active campaigns and understand what each one offers."],["02", language === "es" ? "Prueba y avance" : "Proof and progress", language === "es" ? "Completa la acción, presenta la prueba y continúa tu recorrido." : "Complete the action, submit your proof and continue your journey."],["03", "Reward Hub", language === "es" ? "Canjea Gems por módulos y badges de selección fija." : "Use Gems for fixed-choice modules and badges."],["04", "Campaign Studio", language === "es" ? "Los equipos publican quests, límites y presupuestos." : "Protocol teams publish quests, limits and budgets."]].map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>

      <section id="privacy" className="privacy-section"><div><p className="section-label">TRUST & SAFETY</p><h2>{language === "es" ? "La prueba tiene límites visibles." : "Proof has visible boundaries."}</h2><p>{language === "es" ? "Una acción que no se puede verificar no debe recibir Gems automáticamente. Atlas muestra el método, el estado y el límite de cada quest para que la participación sea clara desde el principio." : "An action that cannot be verified should not receive Gems automatically. Atlas shows each quest’s method, state and boundary so participation stays clear from the start."}</p></div><ul><li><i className="fa-solid fa-check" aria-hidden="true" /> {language === "es" ? "Las quests sociales y de feedback tienen reglas de participación comprensibles." : "Social and feedback quests have clear participation rules."}</li><li><i className="fa-solid fa-check" aria-hidden="true" /> {language === "es" ? "Sentinel aporta una misión de señal alta sin compartir ancho de banda." : "Sentinel adds a high-signal mission without sharing bandwidth."}</li><li><i className="fa-solid fa-check" aria-hidden="true" /> {language === "es" ? "Cada recompensa sigue las reglas de la campaña que la ofrece." : "Every reward follows the rules of the campaign offering it."}</li></ul></section>

      <section id="roadmap" className="roadmap-section"><div className="roadmap-top"><div><p className="section-label">{t.roadmapLabel}</p><h2>{t.roadmapTitle}</h2></div><a href="/dashboard">{t.roadmapLink} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div><div className="roadmap-grid"><article className="is-now"><span>SEASON ZERO</span><h3>{language === "es" ? "La primera ruta" : "The first route"}</h3><p>{language === "es" ? "Campaign Board, quests, Gems, Score, Rank y las primeras rutas del Reward Hub." : "Campaign Board, quests, Gems, Score, Rank and the first Reward Hub routes."}</p></article><article><span>CAMPAIGN LAYER</span><h3>{language === "es" ? "Más formas de participar" : "More ways to participate"}</h3><p>{language === "es" ? "Quests sociales, misiones comunitarias y progresión más profunda." : "Social quests, community missions and deeper progression."}</p></article><article><span>NETWORK EXPANSION</span><h3>{language === "es" ? "Atlas crece contigo" : "Atlas grows with you"}</h3><p>{language === "es" ? "Campaign Studio, Modules, Boosters, Reward Hub e integraciones con más protocolos." : "Campaign Studio, Modules, Boosters, Reward Hub and integrations with more protocols."}</p></article></div></section>
    </main>
    <footer className="landing-footer"><span><span className="landing-mark small"><i className="fa-solid fa-compass" aria-hidden="true" /></span> {t.footer}</span><div><a href="/learn">{t.learn}</a><a href="/dashboard">{t.dashboard}</a></div></footer>
  </div></MotionConfig>;
}
