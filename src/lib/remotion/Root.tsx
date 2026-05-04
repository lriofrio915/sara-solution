import { Composition } from 'remotion'
import { TalkingHead } from './templates/TalkingHead'
import { Announcement } from './templates/Announcement'
import { Testimonial } from './templates/Testimonial'
import { PLATFORM_DIMS } from './types'
import type { VideoParams } from './types'

const defaultProps: VideoParams = {
  template: 'talking_head',
  title: 'Tu mensaje aquí',
  subtitle: null,
  lowerThird: { name: 'Tu nombre', role: 'Nutricionista' },
  cta: 'Agenda tu consulta',
  ctaAt: 20,
  primaryColor: '#4A7C59',
  bgColor: '#FAFAF8',
  textColor: '#1A1F1C',
  duration: 30,
  fps: 30,
  platform: 'tiktok',
  videoUrl: null,
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(['tiktok', 'instagram', 'youtube', 'presentacion'] as const).map(platform => {
        const dims = PLATFORM_DIMS[platform]
        const baseProps = { ...defaultProps, platform }
        return (
          <Composition
            key={`talking_head_${platform}`}
            id={`talking_head_${platform}`}
            component={TalkingHead as unknown as React.ComponentType<Record<string, unknown>>}
            durationInFrames={defaultProps.duration * defaultProps.fps}
            fps={defaultProps.fps}
            width={dims.width}
            height={dims.height}
            defaultProps={baseProps}
          />
        )
      })}

      {(['tiktok', 'instagram', 'youtube', 'presentacion'] as const).map(platform => {
        const dims = PLATFORM_DIMS[platform]
        const baseProps = { ...defaultProps, template: 'announcement' as const, platform }
        return (
          <Composition
            key={`announcement_${platform}`}
            id={`announcement_${platform}`}
            component={Announcement as unknown as React.ComponentType<Record<string, unknown>>}
            durationInFrames={defaultProps.duration * defaultProps.fps}
            fps={defaultProps.fps}
            width={dims.width}
            height={dims.height}
            defaultProps={baseProps}
          />
        )
      })}

      {(['tiktok', 'instagram', 'youtube', 'presentacion'] as const).map(platform => {
        const dims = PLATFORM_DIMS[platform]
        const baseProps = { ...defaultProps, template: 'testimonial' as const, platform }
        return (
          <Composition
            key={`testimonial_${platform}`}
            id={`testimonial_${platform}`}
            component={Testimonial as unknown as React.ComponentType<Record<string, unknown>>}
            durationInFrames={defaultProps.duration * defaultProps.fps}
            fps={defaultProps.fps}
            width={dims.width}
            height={dims.height}
            defaultProps={baseProps}
          />
        )
      })}
    </>
  )
}
