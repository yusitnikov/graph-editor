import { applyWheel, applyPan, applyPinch } from './viewport'
import type { Viewport } from './types'

export function attachPanZoom(
  svg: SVGSVGElement,
  getViewport: () => Viewport,
  onViewportChange: (vp: Viewport) => void,
): () => void {
  const lastTouches = new Map<number, { x: number; y: number }>()
  const interactiveTouches = new Set<number>()

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    onViewportChange(applyWheel(e, svg.getBoundingClientRect(), getViewport()))
  }

  const handleTouchStart = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      const el = document.elementFromPoint(t.clientX, t.clientY)
      if (el?.closest('[data-interactive]')) {
        interactiveTouches.add(t.identifier)
      } else {
        lastTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
      }
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const rect = svg.getBoundingClientRect()
    const vp = getViewport()
    const active = Array.from(e.touches).filter(t => !interactiveTouches.has(t.identifier))

    if (active.length === 1) {
      const t = active[0]
      const prev = lastTouches.get(t.identifier)
      if (prev) {
        onViewportChange(applyPan(t.clientX - prev.x, t.clientY - prev.y, vp))
      }
      lastTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
    } else if (active.length >= 2) {
      const t0 = active[0]
      const t1 = active[1]
      const prev0 = lastTouches.get(t0.identifier)
      const prev1 = lastTouches.get(t1.identifier)
      if (prev0 && prev1) {
        onViewportChange(applyPinch(t0, t1, prev0, prev1, rect, vp))
      }
      lastTouches.set(t0.identifier, { x: t0.clientX, y: t0.clientY })
      lastTouches.set(t1.identifier, { x: t1.clientX, y: t1.clientY })
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      lastTouches.delete(t.identifier)
      interactiveTouches.delete(t.identifier)
    }
  }

  svg.addEventListener('wheel', handleWheel, { passive: false })
  svg.addEventListener('touchstart', handleTouchStart, { passive: false })
  svg.addEventListener('touchmove', handleTouchMove, { passive: false })
  svg.addEventListener('touchend', handleTouchEnd)

  return () => {
    svg.removeEventListener('wheel', handleWheel)
    svg.removeEventListener('touchstart', handleTouchStart)
    svg.removeEventListener('touchmove', handleTouchMove)
    svg.removeEventListener('touchend', handleTouchEnd)
  }
}
