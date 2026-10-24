import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children inside a same-origin iframe so the app's responsive
 * breakpoints and fixed elements see a real 390 px phone viewport. The page's
 * stylesheets are mirrored into the frame, including Vite's live style tags.
 */
export function PhoneFrame({ width, height, children, onBody }: { width: number; height: number; children: ReactNode; onBody?(body: HTMLElement): void }) {
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!frame) return
    const doc = frame.contentDocument
    if (!doc) return
    const mirror = () => {
      doc.head.querySelectorAll('[data-mirrored]').forEach((n) => n.remove())
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        const copy = node.cloneNode(true) as HTMLElement
        copy.setAttribute('data-mirrored', '')
        doc.head.appendChild(copy)
      })
    }
    mirror()
    const observer = new MutationObserver(mirror)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    doc.documentElement.style.background = 'var(--color-ink)'
    doc.body.style.margin = '0'
    doc.body.style.overflow = 'hidden'
    doc.body.className = 'demo-phone font-sans'
    setBody(doc.body)
    onBody?.(doc.body)
    return () => observer.disconnect()
  }, [frame, onBody])

  return (
    <iframe ref={setFrame} title="AlignMe app on a phone" width={width} height={height} className="block border-0" style={{ width, height }}>
      {body && createPortal(children, body)}
    </iframe>
  )
}
