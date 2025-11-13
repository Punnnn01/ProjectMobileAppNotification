Migration notes:

- Converted vanilla DOM code to a Preact-based TSX component in `src/App.tsx`.
- Replaced `src/main.ts` with `src/main.tsx` bootstrap that renders the Preact app.
- Updated `tsconfig.json` to enable JSX with Preact (`jsx":"react-jsx","jsxImportSource":"preact"`).
- Added `preact` dependency in `package.json`.

Next steps after pulling changes locally:
1. Run `npm install` to install Preact.
2. Run `npm run dev` to start Vite dev server.
3. Adjust styles and event handlers as needed (e.g., implement navigation to add-news page).
