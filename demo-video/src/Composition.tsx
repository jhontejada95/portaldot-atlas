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
