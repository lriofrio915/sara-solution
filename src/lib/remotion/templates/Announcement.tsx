import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { VideoParams } from '../types'

function Particle({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame - delay, [0, 20, 80, 100], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const yOff = interpolate(frame - delay, [0, 100], [0, -60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y + yOff,
      width: size, height: size,
      borderRadius: '50%',
      background: color,
      opacity,
    }} />
  )
}

export const Announcement: React.FC<VideoParams> = (props) => {
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const frame = useCurrentFrame()
  const { title, subtitle, cta, ctaAt = 0, primaryColor, bgColor, textColor } = props

  const titleProgress = spring({ frame, fps, config: { damping: 12, mass: 0.7 } })
  const subtitleProgress = spring({ frame: frame - fps, fps, config: { damping: 14 } })
  const ctaFrame = Math.round(ctaAt * fps)

  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: (i * 137) % (width ?? 1080),
    y: (i * 97) % (height ?? 1080),
    size: 8 + (i % 4) * 6,
    delay: i * 8,
    color: i % 3 === 0 ? primaryColor : i % 3 === 1 ? `${primaryColor}88` : `${primaryColor}44`,
  }))

  return (
    <AbsoluteFill style={{ background: bgColor, overflow: 'hidden' }}>
      {/* Particles */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 8,
        background: primaryColor,
        transform: `scaleX(${interpolate(frame, [0, 20], [0, 1])})`,
        transformOrigin: 'left',
      }} />

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 32 }}>
        <div style={{
          opacity: titleProgress,
          transform: `scale(${interpolate(titleProgress, [0, 1], [0.7, 1])})`,
          color: textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 900,
          fontSize: 88,
          textAlign: 'center',
          padding: '0 80px',
          lineHeight: 1.05,
        }}>
          {title}
        </div>

        {subtitle && (
          <div style={{
            opacity: subtitleProgress,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [30, 0])}px)`,
            color: `${textColor}99`,
            fontFamily: 'system-ui',
            fontWeight: 500,
            fontSize: 48,
            textAlign: 'center',
            padding: '0 80px',
          }}>
            {subtitle}
          </div>
        )}
      </AbsoluteFill>

      {/* CTA */}
      {cta && ctaFrame < durationInFrames && (
        <Sequence from={ctaFrame} durationInFrames={durationInFrames - ctaFrame}>
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120 }}>
            <CTABadge text={cta} primaryColor={primaryColor} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Bottom border */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 8,
        background: primaryColor,
        opacity: 0.4,
      }} />
    </AbsoluteFill>
  )
}

function CTABadge({ text, primaryColor }: { text: string; primaryColor: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame, fps, config: { damping: 12 } })
  return (
    <div style={{
      background: primaryColor,
      color: '#fff',
      borderRadius: 100,
      padding: '22px 52px',
      fontWeight: 800,
      fontSize: 44,
      fontFamily: 'system-ui',
      opacity: p,
      transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
      boxShadow: `0 12px 40px ${primaryColor}66`,
    }}>
      {text}
    </div>
  )
}
