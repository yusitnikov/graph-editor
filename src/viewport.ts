import type { Viewport } from './types'

export const MIN_SCALE = 0.1
export const MAX_SCALE = 10

export function toScreen(wx: number, wy: number, vp: Viewport) {
  return { x: wx * vp.scale + vp.x, y: wy * vp.scale + vp.y }
}

export function toWorldCoords(clientX: number, clientY: number, rect: DOMRect, vp: Viewport) {
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  return { x: (sx - vp.x) / vp.scale, y: (sy - vp.y) / vp.scale }
}

export function applyWheel(e: WheelEvent, rect: DOMRect, vp: Viewport): Viewport {
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaMode === 0 && Math.abs(e.deltaY) < 50 ? e.deltaY * 10 : e.deltaY
    const zoomFactor = Math.pow(0.999, delta)
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * zoomFactor))
    return {
      x: sx - (sx - vp.x) * (newScale / vp.scale),
      y: sy - (sy - vp.y) * (newScale / vp.scale),
      scale: newScale,
    }
  }
  return { ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY }
}

export function applyPan(dx: number, dy: number, vp: Viewport): Viewport {
  return { ...vp, x: vp.x + dx, y: vp.y + dy }
}

export function applyPinch(
  t0: { clientX: number; clientY: number },
  t1: { clientX: number; clientY: number },
  prev0: { x: number; y: number },
  prev1: { x: number; y: number },
  rect: DOMRect,
  vp: Viewport,
): Viewport {
  const prevDist = Math.hypot(prev1.x - prev0.x, prev1.y - prev0.y)
  const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
  if (prevDist === 0) return vp
  const midX = (t0.clientX + t1.clientX) / 2 - rect.left
  const midY = (t0.clientY + t1.clientY) / 2 - rect.top
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * (newDist / prevDist)))
  return {
    x: midX - (midX - vp.x) * (newScale / vp.scale),
    y: midY - (midY - vp.y) * (newScale / vp.scale),
    scale: newScale,
  }
}

export interface FitViewOptions {
  canvasWidth: number
  canvasHeight: number
  toolbarClearance: number
  padding: number
}

export function fitView(
  nodes: { x: number; y: number }[],
  opts: FitViewOptions,
): Viewport | null {
  if (nodes.length === 0) return null
  const { canvasWidth: cw, canvasHeight: ch, toolbarClearance, padding } = opts
  const minX = Math.min(...nodes.map(n => n.x))
  const maxX = Math.max(...nodes.map(n => n.x))
  const minY = Math.min(...nodes.map(n => n.y))
  const maxY = Math.max(...nodes.map(n => n.y))
  const boundsW = maxX - minX
  const boundsH = maxY - minY
  const availW = cw - padding * 2
  const availH = ch - toolbarClearance - padding * 2
  const scaleX = boundsW > 0 ? availW / boundsW : availW / padding
  const scaleY = boundsH > 0 ? availH / boundsH : availH / padding
  const scale = Math.min(scaleX, scaleY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    x: cw / 2 - cx * scale,
    y: (ch + toolbarClearance) / 2 - cy * scale,
    scale,
  }
}
