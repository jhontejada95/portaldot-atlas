import {Video} from '@remotion/media';
import {AbsoluteFill, Composition, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {};
const FPS = 30;
const OPENING = 8 * FPS;
const CAMPAIGN_STUDIO = 1958;
const STUDIO_CARD = 4 * FPS;
const VERIFICATION = 817;
const APPROVAL = 3112;
const REWARD_CARD = 8 * FPS;
const CLOSING = 10 * FPS;
const TOTAL = OPENING + CAMPAIGN_STUDIO + STUDIO_CARD + VERIFICATION + APPROVAL + REWARD_CARD + CLOSING;
const palette = {navy: '#061a35', blue: '#2f5ce7', mint: '#55e0c1', gold: '#f4bd54', white: '#f3f7ff', muted: '#b4c4df'};

const TitleCard: React.FC<{eyebrow: string; title: string; body: string; compact?: boolean}> = ({eyebrow, title, body, compact = false}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, 45, 75], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const translate = interpolate(frame, [0, 30], [26, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{justifyContent: 'center', padding: compact ? '0 150px' : '0 170px', background: `radial-gradient(circle at 84% 20%, ${palette.blue}88, transparent 35%), linear-gradient(135deg, ${palette.navy}, #0d2a57)`, color: palette.white, opacity}}>
    <div style={{translate: `0 ${translate}px`, maxWidth: 1340}}>
      <div style={{color: palette.gold, fontFamily: 'JetBrains Mono, monospace', fontSize: 23, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase'}}>{eyebrow}</div>
      <h1 style={{margin: '26px 0 22px', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontSize: compact ? 68 : 92, lineHeight: 1.02, letterSpacing: -3}}>{title}</h1>
      <p style={{maxWidth: 980, margin: 0, color: palette.muted, fontFamily: 'Inter, sans-serif', fontSize: compact ? 25 : 30, lineHeight: 1.45}}>{body}</p>
    </div>
    <div style={{position: 'absolute', right: 100, bottom: 75, display: 'flex', alignItems: 'center', gap: 15, color: palette.mint, fontFamily: 'JetBrains Mono, monospace', fontSize: 18, letterSpacing: 3}}><span style={{width: 12, height: 12, borderRadius: 50, background: palette.mint}} /> ATLAS · PORTALDOT</div>
  </AbsoluteFill>;
};

const Clip: React.FC<{src: string; title: string; from: number; durationInFrames: number; trimBefore?: number}> = ({src, title, from, durationInFrames, trimBefore = 0}) => <Sequence name={title} from={from} durationInFrames={durationInFrames} premountFor={FPS}>
  <Video src={staticFile(src)} trimBefore={trimBefore} premountFor={FPS} objectFit="contain" style={{width: '100%', height: '100%', backgroundColor: palette.navy}} />
  <div style={{position: 'absolute', left: 48, right: 48, bottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: `1px solid ${palette.mint}66`, borderRadius: 13, background: '#061a35dd', color: palette.white, fontFamily: 'Inter, sans-serif', fontSize: 21}}><strong>{title}</strong><span style={{color: palette.mint, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, letterSpacing: 1.5}}>LIVE PRODUCT FLOW</span></div>
</Sequence>;

export const MyComposition = () => <Composition id="AtlasDemo" component={MyComponent} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} defaultProps={{}} />;

const TEASER_OPENING = 6 * FPS;
const TEASER_STUDIO = 10 * FPS;
const TEASER_VERIFICATION = 10 * FPS;
const TEASER_APPROVAL = 14 * FPS;
const TEASER_CLOSING = 6 * FPS;
const TEASER_TOTAL = TEASER_OPENING + TEASER_STUDIO + TEASER_VERIFICATION + TEASER_APPROVAL + TEASER_CLOSING;

export const AtlasTeaser = () => <Composition id="AtlasTeaser" component={TeaserComponent} durationInFrames={TEASER_TOTAL} fps={FPS} width={1280} height={720} defaultProps={{}} />;

const TeaserComponent: React.FC<Props> = () => {
  const {fps} = useVideoConfig();
  const studioStart = TEASER_OPENING;
  const verificationStart = studioStart + TEASER_STUDIO;
  const approvalStart = verificationStart + TEASER_VERIFICATION;
  const closingStart = approvalStart + TEASER_APPROVAL;
  return <AbsoluteFill style={{backgroundColor: palette.navy}}>
    <Sequence name="Teaser opening" durationInFrames={TEASER_OPENING} premountFor={fps}><TitleCard compact eyebrow="ATLAS · SOCIALFI GROWTH LAYER" title="From campaign to community momentum." body="A protocol-ready growth loop with clear rules, reviewable proof and useful rewards." /></Sequence>
    <Clip src="campaign-studio-b2b.webm" title="Campaign Studio · Protocol setup" from={studioStart} durationInFrames={TEASER_STUDIO} />
    <Clip src="verification-gems.webm" title="Campaign Board · Participant quest" from={verificationStart} durationInFrames={TEASER_VERIFICATION} />
    <Clip src="approve-gems.webm" title="Review Queue · Operator approval" from={approvalStart} durationInFrames={TEASER_APPROVAL} />
    <Sequence name="Teaser closing" from={closingStart} durationInFrames={TEASER_CLOSING} premountFor={fps}><TitleCard compact eyebrow="ATLAS FOR PROTOCOLS" title="Participation becomes visible progress." body="Create campaigns. Verify contribution. Reward the community." /></Sequence>
  </AbsoluteFill>;
};

const SUBMISSION_OPENING = 8 * FPS;
const SUBMISSION_POSITIONING = 10 * FPS;
const SUBMISSION_STUDIO = 28 * FPS;
const SUBMISSION_TECHNICAL = 8 * FPS;
const SUBMISSION_PARTICIPANT = 22 * FPS;
const SUBMISSION_APPROVAL = 70 * FPS;
const SUBMISSION_CHAIN = 12 * FPS;
const SUBMISSION_ROADMAP = 10 * FPS;
const SUBMISSION_CLOSING = 7 * FPS;
const SUBMISSION_TOTAL = SUBMISSION_OPENING + SUBMISSION_POSITIONING + SUBMISSION_STUDIO + SUBMISSION_TECHNICAL + SUBMISSION_PARTICIPANT + SUBMISSION_APPROVAL + SUBMISSION_CHAIN + SUBMISSION_ROADMAP + SUBMISSION_CLOSING;

export const AtlasSubmission = () => <Composition id="AtlasSubmission" component={SubmissionComponent} durationInFrames={SUBMISSION_TOTAL} fps={FPS} width={1280} height={720} defaultProps={{}} />;

const SubmissionComponent: React.FC<Props> = () => {
  const {fps} = useVideoConfig();
  const positioningStart = SUBMISSION_OPENING;
  const studioStart = positioningStart + SUBMISSION_POSITIONING;
  const technicalStart = studioStart + SUBMISSION_STUDIO;
  const participantStart = technicalStart + SUBMISSION_TECHNICAL;
  const approvalStart = participantStart + SUBMISSION_PARTICIPANT;
  const chainStart = approvalStart + SUBMISSION_APPROVAL;
  const roadmapStart = chainStart + SUBMISSION_CHAIN;
  const closingStart = roadmapStart + SUBMISSION_ROADMAP;
  return <AbsoluteFill style={{backgroundColor: palette.navy}}>
    <Sequence name="Submission opening" durationInFrames={SUBMISSION_OPENING} premountFor={fps}><TitleCard compact eyebrow="ATLAS · SOCIALFI GROWTH LAYER" title="From attention to verified contribution." body="A protocol-ready campaign layer for acquisition, participation, review and reward." /></Sequence>
    <Sequence name="Submission positioning" from={positioningStart} durationInFrames={SUBMISSION_POSITIONING} premountFor={fps}><TitleCard compact eyebrow="THE PRODUCT" title="Protocols create the route. Communities create the signal." body="Atlas turns a campaign brief into a journey people can understand, complete and repeat." /></Sequence>
    <Clip src="campaign-studio-b2b.webm" title="Campaign Studio · B2B protocol setup" from={studioStart} durationInFrames={SUBMISSION_STUDIO} />
    <Sequence name="Technical campaign boundary" from={technicalStart} durationInFrames={SUBMISSION_TECHNICAL} premountFor={fps}><TitleCard compact eyebrow="01 · CAMPAIGN POLICY" title="Rules are visible before participation starts." body="Proof method, reward budget, cooldown and campaign state are defined once and shared with every participant." /></Sequence>
    <Clip src="verification-gems.webm" title="Campaign Board · B2C participant flow" from={participantStart} durationInFrames={SUBMISSION_PARTICIPANT} />
    <Clip src="approve-gems.webm" title="Review Queue · Evidence and operator decision" from={approvalStart} durationInFrames={SUBMISSION_APPROVAL} />
    <Sequence name="On-chain technical boundary" from={chainStart} durationInFrames={SUBMISSION_CHAIN} premountFor={fps}><TitleCard compact eyebrow="02 · PORTALDOT V3 + GEMLEDGER" title="The decision becomes an auditable reward." body="The queue records the evidence decision. The operator signs once. GemLedger records the grant and the participant can verify the result." /></Sequence>
    <Sequence name="Future protocol expansion" from={roadmapStart} durationInFrames={SUBMISSION_ROADMAP} premountFor={fps}><TitleCard compact eyebrow="WHAT COMES NEXT" title="One layer, many protocol campaigns." body="Future adapters can add campaign analytics, boosters, collectible modules and network-specific reward paths without changing the participant journey." /></Sequence>
    <Sequence name="Submission closing" from={closingStart} durationInFrames={SUBMISSION_CLOSING} premountFor={fps}><TitleCard compact eyebrow="ATLAS FOR PROTOCOLS" title="Growth that can be understood, verified and repeated." body="Discover. Complete. Review. Reward." /></Sequence>
  </AbsoluteFill>;
};

export const MyComponent: React.FC<Props> = () => {
  const {fps} = useVideoConfig();
  const studioStart = OPENING;
  const studioCardStart = studioStart + CAMPAIGN_STUDIO;
  const verificationStart = studioCardStart + STUDIO_CARD;
  const approvalStart = verificationStart + VERIFICATION;
  const rewardStart = approvalStart + APPROVAL;
  const closingStart = rewardStart + REWARD_CARD;
  return <AbsoluteFill style={{backgroundColor: palette.navy}}>
    <Sequence name="Opening position" durationInFrames={OPENING} premountFor={fps}><TitleCard eyebrow="ATLAS · SOCIALFI GROWTH LAYER" title="Turn participation into a repeatable growth loop." body="Protocols create campaigns. Communities complete quests. Every meaningful action becomes reviewable progress and a useful reward." /></Sequence>
    <Clip src="campaign-studio-b2b.webm" title="Campaign Studio · Protocol setup" from={studioStart} durationInFrames={CAMPAIGN_STUDIO} />
    <Sequence name="Campaign policy bridge" from={studioCardStart} durationInFrames={STUDIO_CARD} premountFor={fps}><TitleCard compact eyebrow="01 · CAMPAIGN POLICY" title="Clear rules before the quest begins." body="Proof method, cooldown, budget and reward boundaries are visible to the protocol team and the community." /></Sequence>
    <Clip src="verification-gems.webm" title="Campaign Board · Participant quest" from={verificationStart} durationInFrames={VERIFICATION} />
    <Clip src="approve-gems.webm" title="Review Queue · Operator approval" from={approvalStart} durationInFrames={APPROVAL} />
    <Sequence name="Reward confirmation" from={rewardStart} durationInFrames={REWARD_CARD} premountFor={fps}><TitleCard compact eyebrow="02 · ON-CHAIN REWARD" title="Proof accepted. Gems confirmed." body="The operator signs once, GemLedger records the grant, and the participant can verify the result from the product flow." /></Sequence>
    <Sequence name="Closing value proposition" from={closingStart} durationInFrames={CLOSING} premountFor={fps}><TitleCard compact eyebrow="ATLAS FOR PROTOCOLS" title="A growth layer from discovery to reward." body="Campaign acquisition, community participation, reviewable contribution and retention — connected in one protocol-ready layer." /></Sequence>
  </AbsoluteFill>;
};
