import { useState, useEffect } from 'react'
import Moveable from 'react-moveable'
import { useEditor } from './EditorContext'

export default function GlobalEditor() {
  const { isEditMode, commitChange, setSelectedFigmaId } = useEditor()
  const [target, setTarget] = useState<HTMLElement | null>(null)

  // Reset selection state when edit mode is turned off.
  useEffect(() => {
    if (!isEditMode) {
      setTarget(null)
      setSelectedFigmaId(null)
    }
  }, [isEditMode, setSelectedFigmaId])

  // Listen for clicks on FigmaElements to set the target
  useEffect(() => {
    if (!isEditMode) return

    const handleClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('[data-figma-id]') as HTMLElement | null
      
      if (el) {
        e.preventDefault()
        e.stopPropagation()
        setTarget(el)
        setSelectedFigmaId(el.dataset.figmaId || null)
      } else {
        const isMoveableControl = (e.target as HTMLElement).closest('.moveable-control-box')
        const isToolbar = (e.target as HTMLElement).closest('#edit-mode-toolbar')
        
        if (!isMoveableControl && !isToolbar) {
          setTarget(null)
          setSelectedFigmaId(null)
        }
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [isEditMode, setSelectedFigmaId])

  if (!isEditMode || !target) return null

  // Ensure target still exists in DOM (hasn't been deleted)
  if (!document.body.contains(target)) {
    // If it was deleted, clear it out
    setTarget(null)
    return null
  }

  const figmaId = target.dataset.figmaId

  return (
    <>
      <style>{`
        .moveable-control-box {
          z-index: 10002 !important;
        }
      `}</style>

      {/* Handle Corners: Scale with aspect ratio maintained */}
      <Moveable
        target={target}
        draggable={true}
        scalable={true}
        rotatable={true}
        keepRatio={true}
        renderDirections={["nw", "ne", "sw", "se"]}
        onDrag={e => {
          e.target.style.transform = e.transform
        }}
        onDragEnd={e => {
          if (figmaId) {
            const transform = e.lastEvent?.transform ?? e.target.style.transform
            commitChange(figmaId, { transform })
          }
        }}
        onScale={e => {
          e.target.style.transform = e.drag.transform
        }}
        onScaleEnd={e => {
          if (figmaId) {
            const transform = e.lastEvent?.drag.transform ?? e.target.style.transform
            commitChange(figmaId, { transform })
          }
        }}
        onRotate={e => {
          e.target.style.transform = e.drag.transform
        }}
        onRotateEnd={e => {
          if (figmaId) {
            const transform = e.lastEvent?.drag.transform ?? e.target.style.transform
            commitChange(figmaId, { transform })
          }
        }}
      />

      {/* Handle Edges: Resize perimeter without scaling contents (crops due to overflow:hidden) */}
      <Moveable
        target={target}
        resizable={true}
        keepRatio={false}
        renderDirections={["n", "w", "s", "e"]}
        onResize={e => {
          e.target.style.width = `${e.width}px`
          e.target.style.height = `${e.height}px`
          e.target.style.transform = e.drag.transform
        }}
        onResizeEnd={e => {
          if (figmaId) {
            const transform = e.lastEvent?.drag.transform ?? e.target.style.transform
            const width = e.lastEvent ? `${e.lastEvent.width}px` : e.target.style.width
            const height = e.lastEvent ? `${e.lastEvent.height}px` : e.target.style.height
            commitChange(figmaId, { transform, width, height })
          }
        }}
      />
    </>
  )
}
