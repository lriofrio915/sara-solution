'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function OAuthCallbackInner() {
  const params = useSearchParams()
  const platform = params.get('platform')
  const status = params.get('status')

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth_success', platform, status },
        window.location.origin,
      )
      window.close()
    } else {
      window.location.href = '/integraciones'
    }
  }, [platform, status])

  return (
    <div className="flex items-center justify-center h-screen text-sm text-gray-500">
      Conectando...
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm text-gray-500">Conectando...</div>}>
      <OAuthCallbackInner />
    </Suspense>
  )
}
