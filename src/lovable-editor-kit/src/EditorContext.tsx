/**
 * EditorContext — portable version of the portfolio's in-browser visual editor.
 *
 * Unlike the original, this version takes NO hardcoded imports of project-specific
 * JSON files. Pass `initialLayout` / `initialDynamicElements` as props if you want
 * to seed baked-in defaults (e.g. loaded from your own data files); otherwise it
 * starts empty and relies purely on localStorage + the optional save endpoint.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

export interface ElementState {
  transform: string
  width?: string
  height?: string
  deleted: boolean
  zIndex?: number
  animationType?: string
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  tiltEnabled?: boolean
  text?: string
}

export type HistoryState = Record<string, ElementState>

export interface DynamicElementData {
  id: string
  componentType: string
  props: Record<string, unknown>
  path?: string
}

export interface EditorContextType {
  isEditMode: boolean
  setIsEditMode: (mode: boolean) => void
  history: HistoryState[]
  historyIndex: number
  currentState: HistoryState
  commitChange: (figmaId: string, changes: Partial<ElementState>) => void
  undo: () => void
  redo: () => void
  deleteTarget: (figmaId: string) => void
  saveLayouts: () => void
  selectedFigmaId: string | null
  setSelectedFigmaId: (id: string | null) => void
  dynamicElements: DynamicElementData[]
  duplicateTarget: (figmaId: string) => void
  updateDynamicProps: (figmaId: string, newProps: Record<string, unknown>) => void
  addDynamicElement: (componentType: string, defaultProps?: Record<string, unknown>) => void
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export interface EditorProviderProps {
  children: React.ReactNode
  /** Baked-in starting layout (optional). Defaults to empty. */
  initialLayout?: HistoryState
  /** Baked-in starting dynamic elements (optional). Defaults to empty array. */
  initialDynamicElements?: DynamicElementData[]
  /** localStorage key prefix — change if running multiple editor instances on one origin. */
  storageKey?: string
  /** Server endpoint that bakes layout into files. Omit to skip network save entirely. */
  saveEndpoint?: string | null
}

export function EditorProvider({
  children,
  initialLayout = {},
  initialDynamicElements = [],
  storageKey = 'editor_kit_v1',
  saveEndpoint = '/api/save-layout',
}: EditorProviderProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedFigmaId, setSelectedFigmaId] = useState<string | null>(null)

  const layoutKey = `${storageKey}_layout`
  const dynamicKey = `${storageKey}_dynamic`

  // history + index combined into one state object so commitChange's functional
  // updater always reads the latest index — avoids stale-closure bugs when
  // react-moveable fires onDragEnd + onScaleEnd in the same React batch.
  const [editorHistory, setEditorHistory] = useState<{ history: HistoryState[]; index: number }>(() => {
    try {
      const saved = localStorage.getItem(layoutKey)
      if (saved) {
        const savedState = JSON.parse(saved) as HistoryState
        const merged = { ...initialLayout } as HistoryState
        for (const key of Object.keys(savedState)) {
          merged[key] = { ...(merged[key] || {}), ...savedState[key] }
        }
        return { history: [merged], index: 0 }
      }
    } catch (e) {
      console.error('[editor-kit] Failed to parse saved layout', e)
    }
    return { history: [initialLayout], index: 0 }
  })

  const history = editorHistory.history
  const historyIndex = editorHistory.index

  const [dynamicElements, setDynamicElements] = useState<DynamicElementData[]>(() => {
    try {
      const saved = localStorage.getItem(dynamicKey)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('[editor-kit] Failed to parse saved dynamic elements', e)
    }
    return initialDynamicElements
  })

  const currentState = useMemo(() => history[historyIndex] || {}, [history, historyIndex])

  const commitChange = useCallback((figmaId: string, changes: Partial<ElementState>) => {
    setEditorHistory(({ history: h, index: i }) => {
      const newHistory = h.slice(0, i + 1)
      const lastState = newHistory[newHistory.length - 1] || {}
      const elementCurrentState = lastState[figmaId] || { transform: '', deleted: false }
      const newState: HistoryState = {
        ...lastState,
        [figmaId]: { ...elementCurrentState, ...changes },
      }
      newHistory.push(newState)
      return { history: newHistory, index: i + 1 }
    })
  }, [])

  const undo = useCallback(() => {
    setEditorHistory(({ history: h, index: i }) => ({ history: h, index: Math.max(0, i - 1) }))
  }, [])

  const redo = useCallback(() => {
    setEditorHistory(({ history: h, index: i }) => ({ history: h, index: Math.min(h.length - 1, i + 1) }))
  }, [])

  const deleteTarget = useCallback((figmaId: string) => {
    commitChange(figmaId, { deleted: true })
    setSelectedFigmaId(null)
  }, [commitChange])

  const showToast = (msg: string, isError = false) => {
    const el = document.createElement('div')
    el.textContent = msg
    Object.assign(el.style, {
      position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      background: isError ? '#b91c1c' : '#111', color: '#fff',
      padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
      fontFamily: 'monospace', zIndex: '999999', opacity: '1',
      transition: 'opacity 0.4s ease', pointerEvents: 'none', whiteSpace: 'nowrap',
    })
    document.body.appendChild(el)
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400) }, 2500)
  }

  const saveLayouts = useCallback(async () => {
    const stateToSave = history[historyIndex] || {}

    localStorage.setItem(layoutKey, JSON.stringify(stateToSave))
    localStorage.setItem(dynamicKey, JSON.stringify(dynamicElements))

    if (!saveEndpoint) {
      showToast('Saved locally ✓')
      return
    }

    try {
      const res = await fetch(saveEndpoint, {
        method: 'POST',
        body: JSON.stringify({ layout: stateToSave, dynamicElements }),
        headers: { 'Content-Type': 'application/json' },
      })
      showToast(res.ok ? 'Saved to code ✓' : 'Saved locally (server save failed)', !res.ok)
    } catch (e) {
      console.error(e)
      showToast('Saved locally (no server endpoint reachable)', true)
    }
  }, [history, historyIndex, dynamicElements, saveEndpoint, layoutKey, dynamicKey])

  const duplicateTarget = useCallback((figmaId: string) => {
    const el = document.querySelector(`[data-figma-id="${figmaId}"]`) as HTMLElement
    if (!el) return

    const componentType = el.getAttribute('data-component-type')
    const componentPropsStr = el.getAttribute('data-component-props')

    if (!componentType) {
      showToast('Cannot duplicate: component type not tagged.', true)
      return
    }

    const componentProps = componentPropsStr ? JSON.parse(componentPropsStr) as Record<string, unknown> : {}
    const newId = `${figmaId}-clone-${Date.now()}`

    const baseState = currentState[figmaId] || ({} as Partial<ElementState>)
    let newTransform = baseState.transform || ''
    newTransform = newTransform ? `${newTransform} translate(20px, 20px)` : 'translate(20px, 20px)'

    setDynamicElements(prev => {
      const updated = [...prev, { id: newId, componentType, props: componentProps, path: window.location.pathname }]
      localStorage.setItem(dynamicKey, JSON.stringify(updated))
      return updated
    })

    commitChange(newId, { transform: newTransform, width: baseState.width, height: baseState.height, deleted: false })
    setSelectedFigmaId(newId)
  }, [currentState, commitChange, dynamicKey])

  const addDynamicElement = useCallback((componentType: string, defaultProps: Record<string, unknown> = {}) => {
    const newId = `${componentType.toLowerCase()}-new-${Date.now()}`

    setDynamicElements(prev => {
      const updated = [...prev, { id: newId, componentType, props: defaultProps, path: window.location.pathname }]
      // Blob URLs (e.g. locally-picked media) are session-only — don't persist them.
      if (componentType !== 'MediaElement') {
        localStorage.setItem(dynamicKey, JSON.stringify(updated))
      }
      return updated
    })

    const cx = Math.round(window.scrollX + window.innerWidth / 2 - 200)
    const cy = Math.round(window.scrollY + window.innerHeight / 2 - 200)
    const newTransform = `translate(${cx}px, ${cy}px)`
    const defaultSize = componentType === 'MediaElement' ? { width: '400px', height: '400px' } : {}
    commitChange(newId, { transform: newTransform, deleted: false, zIndex: 100, ...defaultSize })
    setSelectedFigmaId(newId)
  }, [commitChange, dynamicKey])

  const updateDynamicProps = useCallback((figmaId: string, newProps: Record<string, unknown>) => {
    setDynamicElements(prev => {
      const updated = prev.map(el => el.id === figmaId ? { ...el, props: { ...el.props, ...newProps } } : el)
      localStorage.setItem(dynamicKey, JSON.stringify(updated))
      return updated
    })
  }, [dynamicKey])

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isEditMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo()
      }
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault(); redo()
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedFigmaId) {
        const tag = document.activeElement?.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          deleteTarget(selectedFigmaId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, undo, redo, deleteTarget, selectedFigmaId])

  return (
    <EditorContext.Provider
      value={{
        isEditMode, setIsEditMode, history, historyIndex, currentState, commitChange,
        undo, redo, deleteTarget, saveLayouts, selectedFigmaId, setSelectedFigmaId,
        dynamicElements, duplicateTarget, updateDynamicProps, addDynamicElement,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
