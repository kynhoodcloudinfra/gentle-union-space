/**
 * FigmaElement — universal wrapper for every canvas element on the portfolio.
 *
 * In VIEW mode: renders children with optional scroll-triggered entry animations
 * (pop, blur, slide-left, slide-right, fade) driven by Framer Motion.
 *
 * In EDIT mode: applies selection outline, exposes the element to the GlobalEditor
 * toolbar (drag via react-moveable, resize, delete, duplicate, animation picker).
 *
 * State (transform, width, height, zIndex, animationType) is stored in EditorContext
 * and applied imperatively via a ref to avoid unnecessary re-renders during drag.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useEditor } from './EditorContext'
import { motion } from 'framer-motion'

interface FigmaElementProps extends React.HTMLAttributes<HTMLDivElement> {
  figmaId: string
  componentType?: string
  componentProps?: Record<string, unknown>
  children: React.ReactNode
}

export default function FigmaElement({ figmaId, componentType, componentProps, children, style, ...props }: FigmaElementProps) {
  const { isEditMode, currentState, selectedFigmaId } = useEditor()
  const ref = useRef<HTMLDivElement>(null)

  const elementState = currentState[figmaId]
  const isDeleted = elementState?.deleted || false
  const transform = elementState?.transform || ''
  const isSelected = selectedFigmaId === figmaId

  const width = elementState?.width
  const height = elementState?.height
  const zIndex = elementState?.zIndex
  const animationType = elementState?.animationType
  const textAlign = elementState?.textAlign
  const verticalAlign = elementState?.verticalAlign
  const tiltEnabled = elementState?.tiltEnabled || false

  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || isEditMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 100
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 100
    setMouse({ x: 50 + x / 2, y: 50 + y / 2 })
    setTilt({ x: -(y / 50) * 8, y: (x / 50) * 8 })
  }, [tiltEnabled, isEditMode])

  const handleMouseEnter = useCallback(() => { if (tiltEnabled && !isEditMode) setHovered(true) }, [tiltEnabled, isEditMode])
  const handleMouseLeave = useCallback(() => { setHovered(false); setTilt({ x: 0, y: 0 }) }, [])

  // Apply drag/resize styles imperatively (perf-critical, driven by react-moveable)
  useEffect(() => {
    if (!ref.current) return
    if (transform) ref.current.style.transform = transform
    if (width)  ref.current.style.width  = width
    if (height) ref.current.style.height = height
    if (zIndex !== undefined) ref.current.style.zIndex = zIndex.toString()
  }, [transform, width, height, zIndex])

  // Alignment is React-managed (folded into the style object below) so it can't be
  // silently clobbered by a later re-render overwriting the same inline style props.
  const hasAlign = !!(textAlign || verticalAlign)
  const alignItems = textAlign === 'left' ? 'flex-start'
    : textAlign === 'center' ? 'center'
    : textAlign === 'right' ? 'flex-end'
    : 'stretch'
  const justifyContent = verticalAlign === 'top' ? 'flex-start'
    : verticalAlign === 'middle' ? 'center'
    : verticalAlign === 'bottom' ? 'flex-end'
    : 'flex-start'

  if (isDeleted) {
    return null
  }

  // Define animation props if animationType is set
  let motionProps = {}
  if (animationType && animationType !== 'none') {
    const getAnimationConfig = () => {
      switch (animationType) {
        case 'pop':
          return {
            initial: { opacity: 0, scale: 0 },
            whileInView: { opacity: 1, scale: 1 },
            viewport: { once: true, amount: 0.1 },
            transition: { type: "spring", stiffness: 150, damping: 20 } as const
          };
        case 'blur':
          return {
            initial: { opacity: 0, filter: 'blur(12px)' },
            whileInView: { opacity: 1, filter: 'blur(0px)' },
            viewport: { once: true, amount: 0.1 },
            transition: { duration: 0.6, ease: 'easeInOut' as const }
          };
        case 'slide-left':
          return {
            initial: { opacity: 0, x: -50 },
            whileInView: { opacity: 1, x: 0 },
            viewport: { once: true, amount: 0.1 },
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
          };
        case 'slide-right':
          return {
            initial: { opacity: 0, x: 50 },
            whileInView: { opacity: 1, x: 0 },
            viewport: { once: true, amount: 0.1 },
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
          };
        case 'fade':
          return {
            initial: { opacity: 0, y: 15 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.1 },
            transition: { duration: 0.5, ease: 'easeOut' as const }
          };
        default:
          return {};
      }
    };
    motionProps = getAnimationConfig();
  }

  // Only animate when NOT actively in edit mode so layout editing remains stable
  const hasAnimation = animationType && animationType !== 'none' && !isEditMode;

  return (
    <div
      ref={ref}
      data-figma-id={figmaId}
      data-component-type={componentType}
      data-component-props={componentProps ? JSON.stringify(componentProps) : undefined}
      style={{
        ...style,
        position: style?.position || 'absolute',
        display: hasAlign ? 'flex' : (style?.display || 'block'),
        flexDirection: hasAlign ? 'column' : undefined,
        alignItems: hasAlign ? alignItems : undefined,
        justifyContent: hasAlign ? justifyContent : undefined,
        cursor: isEditMode ? 'pointer' : 'inherit',
        overflow: style?.overflow || 'hidden',
        breakInside: 'avoid',
        outline: isEditMode && !isSelected ? '1px dashed rgba(0, 0, 0, 0.3)' :
                 isEditMode && isSelected ? '2px solid #007bff' : 'none',
        zIndex: zIndex !== undefined ? zIndex : (style?.zIndex ?? (isEditMode ? 100 : 'auto')),
        textAlign: textAlign || style?.textAlign,
      }}
      {...props}
    >
      {tiltEnabled && !isEditMode ? (
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: '100%', height: '100%', position: 'relative',
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.04 : 1})`,
            transition: 'transform 0.15s ease-out',
            transformStyle: 'preserve-3d',
          }}
        >
          {hasAnimation ? (
            <motion.div {...motionProps} style={{ width: '100%', height: '100%' }}>
              {children}
            </motion.div>
          ) : children}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(255,255,255,${hovered ? 0.25 : 0}) 0%, rgba(255,255,255,0) 70%)`,
            transition: 'background 0.15s ease-out',
          }} />
        </div>
      ) : hasAnimation ? (
        <motion.div {...motionProps} style={{ width: '100%', height: '100%' }}>
          {children}
        </motion.div>
      ) : (
        children
      )}
    </div>
  )
}
