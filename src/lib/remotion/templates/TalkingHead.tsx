import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from 'remotion'
import type { VideoParams } from '../types'

function AnimatedTitle({ text, color, delay = 0 }: { text: string; color: string; delay?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } })
  return (
    <div style={{
      opacity: progress,
      transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
      color,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 800,
      fontSize: 72,
      lineHeight: 1.1,
      textAlign: 'center',
      padding: '0 60px',
      textShadow: '0 2px 20px rgba(0,0,0,0.3)',
    }}>
      {text}
    </div>
  )
}

function LowerThirdBand({ name, role, primaryColor, delay = 0 }: {
  name: string; role: string; primaryColor: string; delay?: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame: frame - delay, fps, config: { damping: 16 } })
  return (
    <div style={{
      position: 'absolute',
      bottom: 200,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'flex-start',
      paddingLeft: 60,
      transform: `translateX(${interpolate(progress, [0, 1], [-400, 0])}px)`,
      opacity: progress,
    }}>
      <div style={{
        background: primaryColor,
        borderRadius: 12,
        padding: '16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 36, fontFamily: 'system-ui' }}>{name}</span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400, fontSize: 26, fontFamily: 'system-ui' }}>{role}</span>
      </div>
    </div>
  )
}

function CtaBand({ text, primaryColor, delay = 0 }: { text: string; primaryColor: string; delay?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame: frame - delay, fps, config: { damping: 14 } })
  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      opacity: progress,
      transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
    }}>
      <div style={{
        background: primaryColor,
        color: '#fff',
        borderRadius: 100,
        padding: '20px 48px',
        fontWeight: 700,
        fontSize: 38,
        fontFamily: 'system-ui',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        {text}
      </div>
    </div>
  )
}

export const TalkingHead: React.FC<VideoParams> = (props) => {
  const { fps, durationInFrames } = useVideoConfig()
  const {
    title, subtitle, lowerThird, cta, ctaAt = 0,
    primaryColor, bgColor, textColor, videoUrl,
  } = props

  const ctaFrame = Math.round(ctaAt * fps)
  const lowerThirdFrame = Math.round(fps * 1)

  return (
    <AbsoluteFill style={{ background: bgColor, overflow: 'hidden' }}>
      {/* Video background */}
      {videoUrl && (
        <AbsoluteFill>
          <Video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.25)' }} />
        </AbsoluteFill>
      )}

      {/* Title overlay at top */}
      {title && (
        <Sequence from={0} durationInFrames={Math.min(fps * 4, durationInFrames)}>
          <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 80 }}>
            <AnimatedTitle text={title} color={videoUrl ? '#fff' : textColor} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Subtitle */}
      {subtitle && (
        <Sequence from={fps} durationInFrames={Math.min(fps * 3, durationInFrames - fps)}>
          <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 200 }}>
            <div style={{
              color: videoUrl ? 'rgba(255,255,255,0.9)' : 'rgba(26,31,28,0.7)',
              fontFamily: 'system-ui',
              fontSize: 44,
              textAlign: 'center',
              padding: '0 60px',
              fontWeight: 400,
              opacity: interpolate(useCurrentFrame(), [0, 15], [0, 1]),
            }}>
              {subtitle}
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Lower third */}
      {lowerThird && (
        <Sequence from={lowerThirdFrame} durationInFrames={durationInFrames - lowerThirdFrame - fps}>
          <AbsoluteFill>
            <LowerThirdBand
              name={lowerThird.name}
              role={lowerThird.role}
              primaryColor={primaryColor}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* CTA */}
      {cta && ctaFrame < durationInFrames && (
        <Sequence from={ctaFrame} durationInFrames={durationInFrames - ctaFrame}>
          <AbsoluteFill>
            <CtaBand text={cta} primaryColor={primaryColor} />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  )
}
