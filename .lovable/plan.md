Drop the uploaded `lovable-editor-kit` into the project and wire it up so the visual edit mode is available in dev but hidden in production.

## What we will do

1. **Copy the kit into `src/lovable-editor-kit/`**
   - `src/lovable-editor-kit/README.md`
   - `src/lovable-editor-kit/vite-plugin-save-layout.ts`
   - `src/lovable-editor-kit/src/EditorContext.tsx`
   - `src/lovable-editor-kit/src/FigmaElement.tsx`
   - `src/lovable-editor-kit/src/GlobalEditor.tsx`
   - `src/lovable-editor-kit/src/EditModeToggle.tsx`

2. **Install dependencies**
   - `framer-motion`
   - `react-moveable`

3. **Wire the editor into `src/App.tsx`**
   - Wrap the app with `<EditorProvider>` from the kit.
   - Render `<GlobalEditor />` and `<EditModeToggle />` once at the root level.
   - Keep the existing providers (QueryClient, Tooltip, User, Router) intact.

4. **Production-gate the edit toolbar**
   - In `EditModeToggle.tsx`, uncomment/add the guard so the toolbar does not render in `import.meta.env.PROD`.

5. **Vite plugin (optional, dev-only)**
   - Add `layoutSaverPlugin` from `vite-plugin-save-layout.ts` to `vite.config.ts` so the toolbar's "Save" button can write layout JSON to disk during local dev.
   - Note: this is only useful when running a real Vite dev server locally; in Lovable's hosted AI editor it will fall back to localStorage, which is fine.

6. **Verify the build**
   - Run the typecheck/build to confirm the new components and dependencies compile cleanly alongside the existing quiz app.

## Path choice
`src/lovable-editor-kit/` (matching the uploaded folder name). If you prefer a different name, just say so before I implement.

## Outcome
You get an in-browser visual editor that can be opened on localhost, remains invisible on the published site, and does not disrupt the existing quiz/leaderboard/admin flow.