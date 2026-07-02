# Editor Kit — portable visual edit-mode

A drag/resize/align/undo-redo visual editor you can drop into any Vite + React project (built to work in Lovable projects, which use the same stack). Extracted and genericized from this portfolio's edit mode.

## What's in here

- `src/EditorContext.tsx` — state: undo/redo history, selected element, dynamic element list, save/persist logic
- `src/FigmaElement.tsx` — wrapper component that makes any child draggable/resizable/alignable
- `src/GlobalEditor.tsx` — the actual drag/resize/rotate handles (uses `react-moveable`)
- `src/EditModeToggle.tsx` — bottom toolbar: undo/redo, align, z-index, tilt, animation picker, delete, save
- `vite-plugin-save-layout.ts` — optional Vite dev middleware that bakes layout changes into JSON files on disk

## 1. Install dependencies

```bash
npm install framer-motion react-moveable
```

## 2. Copy files

Copy the `src/` files into your project (e.g. `src/editor/`), and `vite-plugin-save-layout.ts` next to your `vite.config.ts` if you want the "bake to code" save option (see caveat below).

## 3. Wire it up

```tsx
// App.tsx
import { EditorProvider } from './editor/EditorContext'
import GlobalEditor from './editor/GlobalEditor'
import EditModeToggle from './editor/EditModeToggle'
import FigmaElement from './editor/FigmaElement'

export default function App() {
  return (
    <EditorProvider>
      {/* your existing app content */}
      <FigmaElement figmaId="hero-title" style={{ position: 'relative', width: 'max-content' }}>
        <h1>Hello world</h1>
      </FigmaElement>

      <GlobalEditor />
      <EditModeToggle />
    </EditorProvider>
  )
}
```

Every `<FigmaElement figmaId="unique-id">` you wrap becomes draggable/resizable/alignable once you click "Edit Mode" in the toolbar. IDs must be unique and stable across reloads.

## 4. (Optional) Bake changes into code

```ts
// vite.config.ts
import { layoutSaverPlugin } from './lovable-editor-kit/vite-plugin-save-layout'

export default defineConfig({
  plugins: [react(), layoutSaverPlugin()],
})
```

Then in `EditorProvider`, leave `saveEndpoint="/api/save-layout"` (the default). Clicking "✓ Save" in the toolbar will POST the current layout to that endpoint and write it to `src/data/layout.json` / `src/data/dynamicElements.json`.

### ⚠️ Lovable caveat

This save-to-disk trick only works if you can edit `vite.config.ts` yourself and run a real Vite dev server (e.g. via Lovable's GitHub sync + local `npm run dev`, or their Dev Mode). If you're only using Lovable's hosted AI-chat editor with no direct file/server access, there's nowhere for this middleware to hook in — skip step 4 entirely.

**Without it, everything still works** — pass `saveEndpoint={null}` to `EditorProvider` and layout changes persist to `localStorage` only. That's enough for prototyping/demoing in the browser; it just won't survive things like a hard redeploy or a different browser/device.

```tsx
<EditorProvider saveEndpoint={null}>
```

## 5. Seeding baked-in defaults (optional)

If you do use the save-to-disk workflow and want the app to start from a previously baked layout instead of empty:

```tsx
import layout from './data/layout.json'
import dynamicElements from './data/dynamicElements.json'

<EditorProvider initialLayout={layout} initialDynamicElements={dynamicElements}>
```

## 6. "Add elements" / dynamic components

`EditModeToggle`'s "+ Component" button and `addDynamicElement()` are stubbed to work with *your own* component registry — the original portfolio version renders dynamically-added components via a `DynamicRenderer` + `ComponentRegistry` map (`{ ComponentName: ActualReactComponent }`). Recreate that pattern if you want the "add element on the fly" feature; it's not included here since it's inherently tied to your project's component library.

## Notes

- `isEditMode` is not gated behind `import.meta.env.PROD` here — add that guard yourself in `EditModeToggle.tsx` before shipping, so random visitors can't open your edit toolbar.
- Alignment (`textAlign`/`verticalAlign`) is applied via React's own `style` prop (not imperative DOM mutation) specifically so it can't get silently clobbered by an unrelated re-render — keep that pattern if you extend `FigmaElement`.
- Grid/flex children with alignment enabled need `minWidth: 0` on their containers to actually shrink to fit narrow layouts — see how the portfolio's bento cards handle this if you hit similar issues.
