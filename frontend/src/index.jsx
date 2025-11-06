import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThirdwebProvider } from 'thirdweb/react';

createRoot(document.getElementById('root')).render(
  <ThirdwebProvider clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}>
    <App />
  </ThirdwebProvider>
);
