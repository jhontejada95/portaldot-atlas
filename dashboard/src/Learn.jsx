import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import "./landing.css";
import "./learn.css";

const copy = {
  en: {
    home: "Home", learn: "Learn", trust: "Trust & safety", roadmap: "Roadmap", dashboard: "Open dashboard", language: "Language",
    kicker: "ATLAS FIELD GUIDE · SEASON ZERO", title: <>Learn how Atlas turns<br /><em>participation into progress.</em></>, intro: "Explore campaigns, complete quests, submit meaningful proof and unlock the next step of your journey.", read: "Read the guide", farm: "Open Farm Hub", signal: "Designed for meaningful participation", signalTitle: <>Quest → Proof<br />→ Progress</>, signalBody: "Gems, Score and Rank each have a different job.",
    commonLabel: "THE ATLAS MODEL", commonTitle: "One platform. Two sides of growth.", commonBody: "Protocols create structured campaigns. Communities complete quests and build visible progress. Atlas connects both sides through clear rules, useful proof and rewards that give the next action a purpose.",
    participantLabel: "FOR PARTICIPANTS", participantTitle: "Find your route and keep moving forward.", participantBody: "Atlas turns scattered campaign tasks into a journey you can understand, complete and return to. Choose the kind of contribution that fits you, then let each step open the next one.",
    protocolLabel: "FOR PROTOCOL TEAMS", protocolTitle: "Turn a campaign idea into a participation system.", protocolBody: "Atlas gives protocol teams a clear way to design quests, guide people through a campaign and understand what their community does next.",
    walkthroughLabel: "FROM DISCOVERY TO REWARD", walkthroughTitle: "A route that gives every action a place.", walkthroughBody: "A good campaign tells people where to begin, what counts and what becomes possible after they contribute.",
    roadmapLabel: "EXPANDED ROADMAP", roadmapTitle: "A platform that grows with every campaign.", roadmapBody: "Atlas starts with a clear route and expands into a reusable campaign layer for protocols and communities.",
    faqLabel: "COMMON QUESTIONS", faqTitle: "Clear answers before a quest.", ctaLabel: "READY TO EXPLORE", ctaTitle: <>Open Season Zero<br />and follow a route.</>, ctaBody: "Start with the Farm Hub and find the campaign that fits your next step.", campaign: "View Campaign Board", homeFooter: "Home", readMore: "Read more", participantCta: "Start as a participant", protocolCta: "Build a campaign"
  },
  es: {
    home: "Inicio", learn: "Aprender", trust: "Confianza y seguridad", roadmap: "Hoja de ruta", dashboard: "Abrir dashboard", language: "Idioma",
    kicker: "GUÍA DE ATLAS · SEASON ZERO", title: <>Aprende cómo Atlas convierte<br /><em>la participación en progreso.</em></>, intro: "Explora campañas, completa quests, presenta pruebas útiles y desbloquea el siguiente paso de tu recorrido.", read: "Leer la guía", farm: "Abrir Farm Hub", signal: "Participación con propósito", signalTitle: <>Quest → Prueba<br />→ Progreso</>, signalBody: "Gems, Score y Rank cumplen una función diferente.",
    commonLabel: "EL MODELO DE ATLAS", commonTitle: "Una plataforma. Dos lados del crecimiento.", commonBody: "Los protocolos crean campañas estructuradas. Las comunidades completan quests y construyen un progreso visible. Atlas conecta ambos lados mediante reglas claras, pruebas útiles y recompensas que dan sentido al siguiente paso.",
    participantLabel: "PARA PARTICIPANTES", participantTitle: "Encuentra tu ruta y sigue avanzando.", participantBody: "Atlas convierte las tareas dispersas de una campaña en un recorrido que puedes entender, completar y retomar. Elige la forma de contribuir que mejor encaje contigo y deja que cada paso abra el siguiente.",
    protocolLabel: "PARA EQUIPOS DE PROTOCOLOS", protocolTitle: "Convierte una idea de campaña en un sistema de participación.", protocolBody: "Atlas ofrece a los equipos de protocolos una forma clara de diseñar quests, guiar a las personas por una campaña y entender cuál es el siguiente paso de su comunidad.",
    walkthroughLabel: "DEL DESCUBRIMIENTO A LA RECOMPENSA", walkthroughTitle: "Una ruta donde cada acción tiene un lugar.", walkthroughBody: "Una buena campaña indica por dónde empezar, qué cuenta como aporte y qué se vuelve posible después de participar.",
    roadmapLabel: "HOJA DE RUTA AMPLIADA", roadmapTitle: "Una plataforma que crece con cada campaña.", roadmapBody: "Atlas comienza con una ruta clara y evoluciona hacia una capa reutilizable para protocolos y comunidades.",
    faqLabel: "PREGUNTAS FRECUENTES", faqTitle: "Respuestas claras antes de una quest.", ctaLabel: "LISTO PARA EXPLORAR", ctaTitle: <>Abre Season Zero<br />y sigue una ruta.</>, ctaBody: "Empieza en el Farm Hub y encuentra la campaña que acompaña tu siguiente paso.", campaign: "Ver Campaign Board", homeFooter: "Inicio", readMore: "Leer más", participantCta: "Empezar como participante", protocolCta: "Crear una campaña"
  }
};

const participantGuides = {
  en: [
    ["fa-compass", "01 · DISCOVER", "Find a campaign", "Choose a campaign that matches your interests. See its goal, available quests, timeline and reward path before you begin.", "Campaign Board gives you enough context to choose a route with intention, not a flat list of unrelated tasks."],
    ["fa-route", "02 · CHOOSE", "Pick the right quest", "Start with the action that fits you: community, social, feedback, content or technical participation.", "Different quest types let a campaign welcome newcomers while still offering deeper ways to contribute."],
    ["fa-list-check", "03 · UNDERSTAND", "Read the proof rule", "Every quest explains what counts as a valid submission, what you can earn and how many times you can complete it.", "The rule is part of the experience: it tells you what to do, what to submit and what comes after review."],
    ["fa-paper-plane", "04 · SUBMIT", "Make your contribution", "Complete the action and send the required proof. Atlas shows your submission status and the next step.", "A clear status keeps the route moving and makes it easier to return to a campaign without losing context."],
    ["fa-arrow-trend-up", "05 · PROGRESS", "Build your journey", "Grow your Campaign Score, collect Gems, improve your Rank and unlock new routes, Modules and rewards.", "Gems open campaign possibilities, Score measures progress in a campaign and Rank reflects participation across the season."]
  ],
  es: [
    ["fa-compass", "01 · DESCUBRE", "Encuentra una campaña", "Elige una campaña que te interese. Consulta su objetivo, quests disponibles, fechas y ruta de recompensas antes de comenzar.", "Campaign Board te da el contexto necesario para elegir una ruta con intención, no una lista plana de tareas sin conexión."],
    ["fa-route", "02 · ELIGE", "Escoge la quest adecuada", "Empieza con la acción que mejor se adapte a ti: comunidad, social, feedback, contenido o participación técnica.", "Los distintos tipos de quest permiten recibir a quienes comienzan y ofrecer formas más profundas de aportar."],
    ["fa-list-check", "03 · ENTIENDE", "Lee la regla de prueba", "Cada quest explica qué se considera una entrega válida, qué puedes obtener y cuántas veces puedes completarla.", "La regla forma parte de la experiencia: indica qué hacer, qué presentar y qué ocurre después de la revisión."],
    ["fa-paper-plane", "04 · PRESENTA", "Haz tu aporte", "Completa la acción y envía la prueba requerida. Atlas muestra el estado de tu entrega y el siguiente paso.", "Un estado claro mantiene el recorrido en movimiento y permite retomar una campaña sin perder el contexto."],
    ["fa-arrow-trend-up", "05 · AVANZA", "Construye tu recorrido", "Aumenta tu Campaign Score, consigue Gems, mejora tu Rank y desbloquea nuevas rutas, Modules y recompensas.", "Los Gems abren posibilidades dentro de las campañas, el Score mide el avance y el Rank refleja la participación durante la temporada."]
  ]
};

const participantExtra = {
  en: [
    ["fa-gem", "GEMS, SCORE AND RANK", "Three signals shape your journey", "Gems are used to unlock campaign routes and rewards. Campaign Score shows your progress inside a specific campaign. Rank reflects your participation across the season.", "Each campaign defines how its rewards and progression work, so the meaning of every step stays visible."],
    ["fa-users", "SOCIAL QUESTS", "Many ways to participate", "Follow an account, join a community, answer a survey, share feedback, publish useful content or take part in a challenge.", "Social participation is not an afterthought. It gives campaigns a practical way to welcome people before they choose a deeper contribution."],
    ["fa-satellite-dish", "TECHNICAL QUESTS", "Higher-signal contributions", "Some campaigns include technical quests for people who want to contribute stronger network signals. Sentinel turns that contribution into a clear, usable step inside the route.", "Technical quests are one path among many and can add depth without making the rest of the campaign harder to understand."],
    ["fa-box-open", "REWARD HUB", "Progress should open possibilities", "Use Gems to access routes, collectible Modules, Boosters and seasonal rewards connected with the journey you are following.", "Modules can support access, identity or campaign utility; Boosters add a limited-use layer to an eligible route; Reward Cache gathers seasonal items in one place."]
  ],
  es: [
    ["fa-gem", "GEMS, SCORE Y RANK", "Tres señales construyen tu recorrido", "Los Gems se usan para desbloquear rutas y recompensas de campaña. El Campaign Score muestra tu avance dentro de una campaña. El Rank refleja tu participación durante la temporada.", "Cada campaña define cómo funcionan sus recompensas y su progresión, para que el sentido de cada paso permanezca visible."],
    ["fa-users", "QUESTS SOCIALES", "Hay muchas formas de participar", "Sigue una cuenta, únete a una comunidad, responde una encuesta, comparte feedback, crea contenido útil o participa en un reto.", "La participación social no es un complemento. Es una forma práctica de recibir a las personas antes de que elijan una contribución más profunda."],
    ["fa-satellite-dish", "QUESTS TÉCNICAS", "Contribuciones de mayor señal", "Algunas campañas incluyen quests técnicas para quienes quieren aportar señales de red más sólidas. Sentinel convierte esa contribución en un paso claro y utilizable dentro de la ruta.", "Las quests técnicas son una opción entre varias y añaden profundidad sin complicar el resto de la campaña."],
    ["fa-box-open", "REWARD HUB", "El progreso debe abrir posibilidades", "Usa tus Gems para acceder a rutas, obtener Modules coleccionables, activar Boosters y desbloquear recompensas de temporada ligadas a tu recorrido.", "Los Modules pueden aportar acceso, identidad o utilidad; los Boosters añaden una capa de uso limitado; Reward Cache reúne los objetos de temporada en un mismo lugar."]
  ]
};

const protocolGuides = {
  en: [
    ["fa-bullseye", "01 · DEFINE", "Start with the objective", "Choose the behavior you want to encourage: discovery, education, community contribution, technical participation or retention.", "A clear objective makes the campaign easier to explain and gives every quest a reason to exist."],
    ["fa-diagram-project", "02 · DESIGN", "Shape the quest path", "Combine different quest types into a route that feels intentional instead of a flat list of tasks.", "Campaign Studio helps teams give each step a place in the story and a clear transition to what comes next."],
    ["fa-shield-halved", "03 · DEFINE", "Set proof and rewards", "Tell participants what counts as proof, how submissions are reviewed and what each step unlocks.", "Visible rules make participation easier to start and make the campaign easier to operate consistently."],
    ["fa-sliders", "04 · CONFIGURE", "Set limits and progression", "Configure campaign windows, participation limits, reward pools and progression milestones.", "Good limits protect the campaign experience while keeping the route legible for participants and operators."],
    ["fa-chart-line", "05 · LEARN", "Publish and improve", "Launch the route, review participation and use the results to improve the next campaign.", "Atlas brings acquisition, participation, retention and contribution signals into a reusable campaign layer."]
  ],
  es: [
    ["fa-bullseye", "01 · DEFINE", "Empieza por el objetivo", "Define el comportamiento que quieres incentivar: descubrimiento, educación, contribución comunitaria, participación técnica o retención.", "Un objetivo claro hace que la campaña sea más fácil de explicar y da una razón a cada quest."],
    ["fa-diagram-project", "02 · DISEÑA", "Construye la ruta de quests", "Combina distintos tipos de quests en un recorrido con intención, en lugar de presentar una lista plana de tareas.", "Campaign Studio ayuda a que cada paso tenga un lugar en la historia y una transición clara hacia lo que sigue."],
    ["fa-shield-halved", "03 · DEFINE", "Establece pruebas y recompensas", "Explica qué cuenta como prueba, cómo se revisan las entregas y qué desbloquea cada paso.", "Las reglas visibles facilitan el inicio de la participación y hacen más consistente la operación de la campaña."],
    ["fa-sliders", "04 · CONFIGURA", "Establece límites y progresión", "Configura fechas, límites de participación, presupuestos de recompensa e hitos de progreso.", "Unos buenos límites cuidan la experiencia y mantienen clara la ruta para participantes y operadores."],
    ["fa-chart-line", "05 · APRENDE", "Publica y mejora", "Publica la ruta, revisa la participación y usa los resultados para mejorar la siguiente campaña.", "Atlas reúne señales de adquisición, participación, retención y contribución en una capa de campañas reutilizable."]
  ]
};

const protocolExtra = {
  en: [
    ["fa-pen-ruler", "CAMPAIGN STUDIO", "Your campaign control room", "Design the campaign, define each quest, set the reward path and keep every rule visible to participants.", "Objective, quest builder, proof requirements, reward configuration, limits, review queue and results can live in one operating view."],
    ["fa-users-gear", "COMMUNITY GROWTH", "Turn attention into return visits", "Atlas helps teams move from first discovery to repeat participation by giving communities a route they can understand and revisit.", "The same structure can be reused across seasons while each campaign keeps its own objective, audience and reward path."],
    ["fa-chart-pie", "CAMPAIGN INSIGHTS", "See what creates momentum", "Understand which quest types attract people, where they continue and which contributions create the strongest signal.", "These insights help protocol teams tune campaign design instead of guessing at the next activation."],
    ["fa-plug", "ADAPTERS", "A reusable growth layer", "Portal is the first environment for Atlas, with a model designed to support more protocol and network integrations over time.", "The campaign language stays consistent while each integration can connect its own participation and contribution methods."]
  ],
  es: [
    ["fa-pen-ruler", "CAMPAIGN STUDIO", "La sala de control de tu campaña", "Diseña la campaña, define cada quest, configura la ruta de recompensas y mantén todas las reglas visibles para los participantes.", "Objetivo, constructor de quests, requisitos de prueba, configuración, límites, cola de revisión y resultados pueden convivir en una misma vista de operación."],
    ["fa-users-gear", "CRECIMIENTO DE COMUNIDAD", "Convierte la atención en retorno", "Atlas ayuda a pasar del primer descubrimiento a la participación recurrente mediante una ruta que las comunidades pueden entender y volver a recorrer.", "La misma estructura puede reutilizarse entre temporadas, mientras cada campaña conserva su objetivo, audiencia y ruta de recompensas."],
    ["fa-chart-pie", "INSIGHTS DE CAMPAÑA", "Descubre qué crea impulso", "Entiende qué quests atraen a las personas, dónde continúan y qué aportes generan una señal más fuerte.", "Estos insights ayudan a ajustar el diseño de la campaña en lugar de adivinar la siguiente activación."],
    ["fa-plug", "ADAPTADORES", "Una capa de crecimiento reutilizable", "Portal es el primer entorno de Atlas y el modelo está preparado para admitir más integraciones con protocolos y redes con el tiempo.", "El lenguaje de campañas permanece consistente, mientras cada integración conecta sus propios métodos de participación y contribución."]
  ]
};

const commonSteps = {
  en: [
    ["fa-bullseye", "01", "Campaign", "A protocol sets the goal, audience and route."],
    ["fa-route", "02", "Quest", "Participants choose an action that fits the route."],
    ["fa-shield-halved", "03", "Proof", "The campaign explains what a useful contribution looks like."],
    ["fa-arrow-trend-up", "04", "Progress", "Score, Gems and Rank show what the step unlocks."],
    ["fa-gift", "05", "Reward", "Reward Hub gives the journey a clear next possibility."]
  ],
  es: [
    ["fa-bullseye", "01", "Campaña", "El protocolo define el objetivo, la audiencia y la ruta."],
    ["fa-route", "02", "Quest", "Cada participante elige una acción que encaja con el recorrido."],
    ["fa-shield-halved", "03", "Prueba", "La campaña explica cómo se reconoce un aporte útil."],
    ["fa-arrow-trend-up", "04", "Progreso", "Score, Gems y Rank muestran qué abre cada paso."],
    ["fa-gift", "05", "Recompensa", "Reward Hub convierte el avance en una posibilidad concreta."]
  ]
};

const walkthrough = {
  en: [["01", "Discover a campaign", "Choose a route from Campaign Board and understand its goal, audience and reward path before you begin."], ["02", "Read the rule", "See the action, proof, limit and next step in one place so you know what a useful submission looks like."], ["03", "Complete the quest", "Take the action and submit the proof the campaign asks for, whether it is social, community, feedback, content or technical."], ["04", "Build your progress", "The campaign updates the signal that belongs to this step and shows you how your route is moving forward."], ["05", "Unlock the next step", "Use Gems in Reward Hub for access, Modules, Boosters and seasonal items connected to your journey."]],
  es: [["01", "Descubre una campaña", "Elige una ruta en Campaign Board y entiende su objetivo, audiencia y camino de recompensas antes de comenzar."], ["02", "Lee la regla", "Consulta la acción, la prueba, el límite y el siguiente paso para saber cómo debe ser una entrega útil."], ["03", "Completa la quest", "Realiza la acción y presenta la prueba solicitada, ya sea social, comunitaria, de feedback, contenido o técnica."], ["04", "Construye tu progreso", "La campaña actualiza la señal que corresponde a este paso y muestra cómo avanza tu recorrido."], ["05", "Desbloquea el siguiente paso", "Usa tus Gems en Reward Hub para acceder a rutas, Modules, Boosters y objetos de temporada ligados a tu recorrido."]]
};

const roadmap = {
  en: [["01", "Season Zero", "Core quests, Gems, Score, Rank and the first Reward Hub routes."], ["02", "Campaign Layer", "More social, community and technical quest formats for richer routes."], ["03", "Campaign Studio", "Tools for protocol teams to build, operate and learn from campaigns."], ["04", "Modules & Boosters", "Utility, access and collectible progression items connected to campaign journeys."], ["05", "Protocol expansion", "More integrations and technical participation routes across the ecosystem."]],
  es: [["01", "Season Zero", "Quests principales, Gems, Score, Rank y las primeras rutas del Reward Hub."], ["02", "Capa de campañas", "Más formatos de quests sociales, comunitarias y técnicas para rutas más completas."], ["03", "Campaign Studio", "Herramientas para que los protocolos creen, operen y aprendan de sus campañas."], ["04", "Modules y Boosters", "Objetos de utilidad, acceso y progresión coleccionable ligados a las campañas."], ["05", "Expansión de protocolos", "Más integraciones y rutas de participación técnica dentro del ecosistema."]]
};

const faqs = {
  en: [["What is Atlas?", "Atlas is a growth layer for protocols and a participation hub for communities. Protocols create campaigns, people complete quests and every meaningful action moves the journey forward."], ["What can I do inside a campaign?", "Discover routes, choose a quest, submit meaningful proof and use your progression to unlock the next step."], ["What are Gems used for?", "Gems can unlock campaign access, Modules, Boosters and seasonal rewards defined by each route."], ["What is the difference between Gems, Score and Rank?", "Gems help you access campaign possibilities, Score measures progress in one campaign and Rank reflects participation across the season."], ["Can protocols create their own campaigns?", "Yes. Campaign Studio is designed for teams to define quests, rules, rewards, limits and the operating view around each campaign."], ["Can I participate without technical quests?", "Yes. Social, feedback, content and community quests are complete ways to participate. Technical quests add another route for people who want to contribute at a higher signal."], ["How does Sentinel fit into Atlas?", "Sentinel is an optional technical quest for selected campaign routes that need a clearer, higher-signal contribution step."]],
  es: [["¿Qué es Atlas?", "Atlas es una capa de crecimiento para protocolos y un hub de participación para comunidades. Los protocolos crean campañas, las personas completan quests y cada acción valiosa hace avanzar el recorrido."], ["¿Qué puedo hacer dentro de una campaña?", "Puedes descubrir rutas, elegir una quest, presentar pruebas útiles y usar tu progreso para desbloquear el siguiente paso."], ["¿Para qué sirven los Gems?", "Los Gems pueden desbloquear acceso a campañas, Modules, Boosters y recompensas de temporada definidas por cada ruta."], ["¿Cuál es la diferencia entre Gems, Score y Rank?", "Los Gems abren posibilidades dentro de una campaña, el Score mide el avance de una campaña y el Rank refleja la participación durante la temporada."], ["¿Los protocolos pueden crear sus propias campañas?", "Sí. Campaign Studio está pensado para que los equipos definan quests, reglas, recompensas, límites y la vista de operación de cada campaña."], ["¿Puedo participar sin quests técnicas?", "Sí. Las quests sociales, de feedback, contenido y comunidad son formas completas de participar. Las técnicas añaden otra ruta para quienes quieren aportar con mayor señal."], ["¿Cómo encaja Sentinel dentro de Atlas?", "Sentinel es una quest técnica opcional para determinadas rutas que necesitan un paso de contribución más claro y de mayor señal."]]
};

function GuideCard({ item, language, index }) {
  const [icon, label, title, summary, detail] = item;
  return <motion.article className="guide-card" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: index * .035 }}><span className="guide-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><p className="guide-label">{label}</p><h3>{title}</h3><p>{summary}</p><details><summary>{language === "es" ? "Leer más" : "Read more"} <i className="fa-solid fa-plus" aria-hidden="true" /></summary><p>{detail}</p></details></motion.article>;
}

export function Learn() {
  const [language, setLanguage] = useState(() => window.localStorage.getItem("atlas-landing-language") || "en");
  const t = copy[language];
  const setLang = (value) => { setLanguage(value); window.localStorage.setItem("atlas-landing-language", value); };
  return <MotionConfig reducedMotion="user"><div className="landing-shell learn-shell">
    <header className="landing-nav"><a className="landing-brand" href="/" aria-label="Atlas home"><span className="landing-mark"><i className="fa-solid fa-compass" aria-hidden="true" /></span><span>atlas</span></a><nav aria-label="Atlas learning navigation"><a href="/">{t.home}</a><a className="is-current" href="/learn">{t.learn}</a><a href="/#privacy">{t.trust}</a><a href="/#roadmap">{t.roadmap}</a></nav><div className="landing-nav-actions"><div className="language-switcher" role="group" aria-label={t.language}><button className={language === "en" ? "is-active" : ""} onClick={() => setLang("en")}>EN</button><button className={language === "es" ? "is-active" : ""} onClick={() => setLang("es")}>ES</button></div><a className="nav-cta" href="/dashboard">{t.dashboard} <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></div></header>
    <main>
      <section className="learn-hero"><div><p className="hero-kicker"><span /> {t.kicker}</p><h1>{t.title}</h1><p>{t.intro}</p><div className="learn-hero-actions"><a className="hero-primary" href="#participants">{t.participantCta} <i className="fa-solid fa-arrow-down" aria-hidden="true" /></a><a className="hero-secondary" href="#protocols">{t.protocolCta} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div></div><motion.aside className="learn-signal-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}><img src="/brand/atlas-titan.png" alt="Atlas field guide mascot" /><div><span><i className="fa-solid fa-circle-check" aria-hidden="true" /> {t.signal}</span><strong>{t.signalTitle}</strong><p>{t.signalBody}</p></div></motion.aside></section>
      <section className="learn-common"><div className="section-heading"><p>{t.commonLabel}</p><h2>{t.commonTitle}</h2><span>{t.commonBody}</span></div><div className="learn-flow-cards" aria-label={language === "es" ? "Recorrido de una campaña" : "Campaign flow"}>{commonSteps[language].map(([icon, number, title, body], index) => <motion.article className="learn-flow-card" key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: index * .06 }}><div className="learn-flow-card-top"><span className="learn-flow-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span><small>{number}</small></div><h3>{title}</h3><p>{body}</p>{index < commonSteps[language].length - 1 ? <i className="fa-solid fa-arrow-right learn-flow-arrow" aria-hidden="true" /> : null}</motion.article>)}</div></section>
      <section id="participants" className="learn-guide-section learn-audience-section"><div className="section-heading"><p>{t.participantLabel}</p><h2>{t.participantTitle}</h2><span>{t.participantBody}</span></div><div className="guide-grid">{participantGuides[language].map((item, index) => <GuideCard key={item[2]} item={item} language={language} index={index} />)}</div><div className="guide-grid learn-guide-grid-secondary">{participantExtra[language].map((item, index) => <GuideCard key={item[2]} item={item} language={language} index={index} />)}</div></section>
      <section id="protocols" className="learn-guide-section learn-audience-section learn-protocol-section"><div className="section-heading"><p>{t.protocolLabel}</p><h2>{t.protocolTitle}</h2><span>{t.protocolBody}</span></div><div className="guide-grid">{protocolGuides[language].map((item, index) => <GuideCard key={item[2]} item={item} language={language} index={index} />)}</div><div className="guide-grid learn-guide-grid-secondary">{protocolExtra[language].map((item, index) => <GuideCard key={item[2]} item={item} language={language} index={index} />)}</div></section>
      <section className="learn-steps"><div><p className="section-label">{t.walkthroughLabel}</p><h2>{t.walkthroughTitle}</h2><p>{t.walkthroughBody}</p></div><ol>{walkthrough[language].map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>
      <section className="learn-roadmap"><div className="section-heading"><p>{t.roadmapLabel}</p><h2>{t.roadmapTitle}</h2><span>{t.roadmapBody}</span></div><ol>{roadmap[language].map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>
      <section className="learn-faq"><div className="section-heading"><p>{t.faqLabel}</p><h2>{t.faqTitle}</h2></div><div>{faqs[language].map(([question, answer]) => <details key={question}><summary>{question}<i className="fa-solid fa-plus" aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
      <section className="learn-cta"><div><p className="section-label">{t.ctaLabel}</p><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p></div><div className="learn-cta-actions"><a className="hero-primary" href="/dashboard?view=farm">{t.farm} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a><a className="learn-text-link" href="/dashboard?view=campaigns">{t.campaign} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></div></section>
    </main>
    <footer className="landing-footer"><span><span className="landing-mark small"><i className="fa-solid fa-compass" aria-hidden="true" /></span> Atlas for Portaldot</span><div><a href="/">{t.homeFooter}</a><a href="/dashboard">{t.dashboard}</a></div></footer>
  </div></MotionConfig>;
}
