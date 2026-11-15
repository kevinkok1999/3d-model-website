import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = name => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        atlas: page('./index.html'),
        bodyparts3dCandidate: page('./bodyparts3d-candidate.html'),
        hraCandidate: page('./hra-candidate.html'),
      },
    },
  },
});
