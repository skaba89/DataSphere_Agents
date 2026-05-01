import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          backgroundColor: '#2563eb',
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
          }}
        >
          DS
        </span>
      </div>
    ),
    { ...size }
  )
}
