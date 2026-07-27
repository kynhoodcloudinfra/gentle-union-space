## Goal
Fully remove the visual editor kit from the project. It's only referenced in three places outside its own folder.

## Changes

1. **Delete `src/lovable-editor-kit/`** — the entire folder (EditorContext, GlobalEditor, EditModeToggle, FigmaElement, vite-plugin-save-layout, README).

2. **`src/App.tsx`** — remove the `EditorProvider`, `GlobalEditor`, and `EditModeToggle` imports and JSX. `UserProvider` + `Routes` become direct children of `BrowserRouter`.

3. **`vite.config.ts`** — remove the `layoutSaverPlugin` import and its entry in the `plugins` array.

4. **Dependencies** — remove `react-moveable` (used only by the kit). `framer-motion` is also only referenced by the kit, so remove it too unless you'd rather keep it available for future animations.

## Verification
Typecheck plus a quick load of the home page to confirm the app renders with no editor toolbar and no console errors.
