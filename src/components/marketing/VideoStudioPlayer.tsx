'use client'

import { Player } from '@remotion/player'
import { TalkingHead } from '@/lib/remotion/templates/TalkingHead'
import { Announcement } from '@/lib/remotion/templates/Announcement'
import { Testimonial } from '@/lib/remotion/templates/Testimonial'
import { PLATFORM_DIMS } from '@/lib/remotion/types'
import type { VideoParams } from '@/lib/remotion/types'

const TEMPLATE_MAP = {
  talking_head: TalkingHead,
  announcement: Announcement,
  testimonial: Testimonial,
} as const

interface Props {
  params: VideoParams
}

export default function VideoStudioPlayer({ params }: Props) {
  const dims = PLATFORM_DIMS[params.platform] ?? { width: 1080, height: 1920 }
  const Component = TEMPLATE_MAP[params.template] ?? TalkingHead
  const durationInFrames = Math.max(1, params.duration * params.fps)

  const isVertical = dims.height > dims.width
  const playerWidth = isVertical ? 280 : 560
  const playerHeight = isVertical
    ? Math.round(280 * (dims.height / dims.width))
    : Math.round(560 * (dims.height / dims.width))

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
        <Player
          component={Component as unknown as React.ComponentType<Record<string, unknown>>}
          inputProps={params as unknown as Record<string, unknown>}
          durationInFrames={durationInFrames}
          fps={params.fps}
          compositionWidth={dims.width}
          compositionHeight={dims.height}
          style={{ width: playerWidth, height: playerHeight }}
          controls
          loop
          autoPlay
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500">
        {params.platform} · {dims.width}×{dims.height} · {params.duration}s
      </p>
    </div>
  )
}
