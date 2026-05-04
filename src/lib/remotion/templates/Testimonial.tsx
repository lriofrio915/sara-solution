import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { VideoParams } from '../types'

export const Testimonial: React.FC<VideoParams> = (props) => {
  const { fps, durationInFrames } = useVideoConfig()
  const frame = useCurrentFrame()
  const { title, subtitle, lowerThird, cta, ctaAt = 0, primaryColor, bgColor, textColor } = props

  const quoteProgress = spring({ frame, fps, config: { damping: 14, mass: 0.8 } })
  const authorProgress = spring({ frame: frame - fps * 1.5, fps, config: { damping: 14 } })
  const ctaFrame = Math.round(ctaAt * fps)

  return (
    <AbsoluteFill style={{ background: bgColor, overflow: 'hidden' }}>
      {/* Left accent stripe */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: interpolate(frame, [0, 20], [0, 12]),
        background: primaryColor,
      }} />

      {/* Quote mark */}
      <div style={{
        position: 'absolute',
        top: 80, left: 60,
        fontSize: 200,
        color: primaryColor,
        opacity: 0.12,
        fontFamily: 'Georgia, serif',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        "
      </div>

      {/* Main quote */}
      <AbsoluteFill style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 80px',
        flexDirection: 'column',
        gap: 40,
      }}>
        <div style={{
          opacity: quoteProgress,
          transform: `translateY(${interpolate(quoteProgress, [0, 1], [50, 0])}px)`,
          color: textColor,
          fontFamily: 'Georgia, serif',
          fontSize: 64,
          fontStyle: 'italic',
          lineHeight: 1.3,
          fontWeight: 400,
          borderLeft: `6px solid ${primaryColor}`,
          paddingLeft: 48,
        }}>
          {title}
        </div>

        {subtitle && (
          <div style={{
            opacity: spring({ frame: frame - fps, fps }),
            color: `${textColor}88`,
            fontFamily: 'system-ui',
            fontSize: 40,
            fontStyle: 'italic',
            paddingLeft: 54,
          }}>
            {subtitle}
          </div>
        )}
      </AbsoluteFill>

      {/* Author lower third */}
      {lowerThird && (
        <Sequence from={Math.round(fps * 1.5)} durationInFrames={durationInFrames - Math.round(fps * 1.5)}>
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 100px 80px' }}>
            <div style={{
              opacity: authorProgress,
              transform: `translateX(${interpolate(authorProgress, [0, 1], [-60, 0])}px)`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{
                width: 64,
                height: 4,
                background: primaryColor,
                borderRadius: 2,
                marginBottom: 8,
              }} />
              <span style={{ color: textColor, fontWeight: 700, fontSize: 40, fontFamily: 'system-ui' }}>
                {lowerThird.name}
              </span>
              <span style={{ color: `${textColor}88`, fontSize: 32, fontFamily: 'system-ui' }}>
                {lowerThird.role}
              </span>
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* CTA */}
      {cta && ctaFrame < durationInFrames && (
        <Sequence from={ctaFrame} durationInFrames={durationInFrames - ctaFrame}>
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 }}>
            <TestimonialCTA text={cta} primaryColor={primaryColor} />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  )
}

function TestimonialCTA({ text, primaryColor }: { text: string; primaryColor: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame, fps, config: { damping: 14 } })
  return (
    <div style={{
      background: primaryColor,
      color: '#fff',
      borderRadius: 100,
      padding: '18px 44px',
      fontWeight: 700,
      fontSize: 38,
      fontFamily: 'system-ui',
      opacity: p,
      transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`,
    }}>
      {text}
    </div>
  )
}
