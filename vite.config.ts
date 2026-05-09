import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: Build produces a chunk size warning (>500KB default limit).
// This is expected given the large content registry (actions, events, locations, etc.)
// all being bundled into a single chunk. Suppressing the warning for now.
// TODO: After splitting the content registry into lazy-loaded modules
// (per-realm or per-system dynamic imports), remove chunkSizeWarningLimit
// and rely on proper code splitting instead.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
