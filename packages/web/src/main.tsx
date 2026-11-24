import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HotkeysProvider } from 'tailor/command';
import { App } from './App';
import { createQueryClient } from './queries';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <HotkeysProvider>
        <App />
      </HotkeysProvider>
    </QueryClientProvider>
  </StrictMode>,
);
