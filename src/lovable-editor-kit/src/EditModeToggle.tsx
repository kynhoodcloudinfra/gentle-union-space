import React from 'react'
import { useEditor } from './EditorContext'

const Sep = () => (
  <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.15)', flexShrink: 0, margin: '0 2px' }} />
)

/**
 * EditModeToggle — bottom toolbar for the visual editor.
 * Render this once near your app root, alongside <GlobalEditor />.
 *
 * NOTE: hide this in production the same way you'd hide any dev-only tool —
 * e.g. `if (import.meta.env.PROD) return null` — since it exposes layout
 * editing to anyone viewing the deployed site otherwise.
 */
export default function EditModeToggle() {
  const {
    isEditMode, setIsEditMode, saveLayouts, undo, redo, deleteTarget,
    selectedFigmaId, historyIndex, history, dynamicElements, duplicateTarget,
    updateDynamicProps, commitChange, currentState, addDynamicElement,
  } = useEditor()

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const base: React.CSSProperties = {
    padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, border: 'none',
    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    gap: '4px', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.4,
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
  }
  const ghost: React.CSSProperties = { ...base, background: '#f1f5f9', color: '#334155' }
  const blue: React.CSSProperties  = { ...base, background: '#3b82f6', color: '#fff' }
  const green: React.CSSProperties = { ...base, background: '#10b981', color: '#fff' }
  const red: React.CSSProperties   = { ...base, background: '#ef4444', color: '#fff' }

  // Hide the toolbar in production builds:
  if (import.meta.env.PROD) return null

  const selEl = dynamicElements.find(e => e.id === selectedFigmaId)
  const isDynamic = !!selEl

  return (
    <div
      id="edit-mode-toolbar"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10003,
        background: 'transparent', padding: '7px 14px', display: 'flex',
        gap: '6px', alignItems: 'center', overflowX: 'auto', overflowY: 'hidden',
        scrollbarWidth: 'none',
      }}
    >
      <style>{`#edit-mode-toolbar::-webkit-scrollbar{display:none}`}</style>

      {isEditMode && (
        <>
          {/* History */}
          <button onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)"
            style={{ ...ghost, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'not-allowed' }}>
            ↩ Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)"
            style={{ ...ghost, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'not-allowed' }}>
            ↪ Redo
          </button>

          {selectedFigmaId && (
            <>
              <Sep />

              <button onClick={() => duplicateTarget(selectedFigmaId)} title="Duplicate" style={blue}>⧉ Dupe</button>

              <button onClick={() => commitChange(selectedFigmaId, { zIndex: (currentState[selectedFigmaId]?.zIndex ?? 100) + 10 })} title="Bring Forward" style={ghost}>↑ Front</button>
              <button onClick={() => commitChange(selectedFigmaId, { zIndex: Math.max(0, (currentState[selectedFigmaId]?.zIndex ?? 100) - 10) })} title="Send Back" style={ghost}>↓ Back</button>

              {/* Align H */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.06)', borderRadius: 5, padding: 2 }}>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} onClick={() => commitChange(selectedFigmaId, { textAlign: a })} title={`Align ${a}`}
                    style={{ ...base, background: currentState[selectedFigmaId]?.textAlign === a ? '#3b82f6' : '#f1f5f9', color: currentState[selectedFigmaId]?.textAlign === a ? '#fff' : '#334155', padding: '4px 8px' }}>
                    {a === 'left' ? '⫷' : a === 'center' ? '≡' : '⫸'}
                  </button>
                ))}
              </div>

              {/* Align V */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.06)', borderRadius: 5, padding: 2 }}>
                {(['top', 'middle', 'bottom'] as const).map(v => (
                  <button key={v} onClick={() => commitChange(selectedFigmaId, { verticalAlign: v })} title={`Vertical ${v}`}
                    style={{ ...base, background: currentState[selectedFigmaId]?.verticalAlign === v ? '#3b82f6' : '#f1f5f9', color: currentState[selectedFigmaId]?.verticalAlign === v ? '#fff' : '#334155', padding: '4px 8px' }}>
                    {v === 'top' ? '⤒' : v === 'middle' ? '⇕' : '⤓'}
                  </button>
                ))}
              </div>

              {/* Tilt */}
              <button
                onClick={() => commitChange(selectedFigmaId, { tiltEnabled: !(currentState[selectedFigmaId]?.tiltEnabled ?? false) })}
                title="Toggle 3D tilt"
                style={{ ...base, background: currentState[selectedFigmaId]?.tiltEnabled ? '#f59e0b' : '#f1f5f9', color: currentState[selectedFigmaId]?.tiltEnabled ? '#000' : '#334155' }}>
                ✦ Tilt
              </button>

              {/* Scroll animation */}
              <select
                value={currentState[selectedFigmaId]?.animationType || 'none'}
                onChange={e => commitChange(selectedFigmaId, { animationType: e.target.value })}
                title="Scroll animation"
                style={{ ...blue, padding: '5px 8px', outline: 'none', fontFamily: 'inherit', WebkitAppearance: 'none', appearance: 'none' }}
              >
                <option value="none">No Anim</option>
                <option value="fade">Fade</option>
                <option value="pop">Pop</option>
                <option value="blur">Blur</option>
                <option value="slide-left">Slide ←</option>
                <option value="slide-right">Slide →</option>
              </select>

              {/* Edit text — works on any dynamic element exposing a text/children prop */}
              {isDynamic && (
                <button
                  onClick={() => {
                    if (!selEl) return
                    const currentVal = selEl.props.text !== undefined ? selEl.props.text : selEl.props.children
                    if (typeof currentVal !== 'string') { alert('No text prop on this component.'); return }
                    const newText = prompt('Edit text:', currentVal)
                    if (newText !== null) updateDynamicProps(selectedFigmaId, selEl.props.text !== undefined ? { text: newText } : { children: newText })
                  }}
                  title="Edit text content"
                  style={blue}>
                  ✎ Text
                </button>
              )}

              <Sep />

              <button
                onClick={() => { if (window.confirm('Delete this element?')) deleteTarget(selectedFigmaId) }}
                title="Delete (Backspace)" style={red}>
                ⌫ Delete
              </button>
            </>
          )}

          <Sep />

          {/* Add elements — wire these to your own component registry / dynamic renderer */}
          <button onClick={() => addDynamicElement('YourComponentName', {})} title="Add a registered component" style={green}>+ Component</button>

          <Sep />

          <button onClick={() => { if (window.confirm('Wipe local layout and restore defaults?')) { localStorage.clear(); window.location.reload() } }} style={red}>↺ Reset</button>
          <button onClick={saveLayouts} style={green}>✓ Save</button>
          <button onClick={() => setIsEditMode(false)} style={blue}>✕ Exit</button>
        </>
      )}

      {!isEditMode && (
        <button onClick={() => setIsEditMode(true)} style={blue}>✎ Edit Mode</button>
      )}
    </div>
  )
}
