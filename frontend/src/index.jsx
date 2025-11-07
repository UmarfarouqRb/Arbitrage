import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PrivyProvider } from '@privy-io/react-auth';

createRoot(document.getElementById('root')).render(
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    config={{
      // Customize Privy's appearance in your app
      appearance: {
        theme: 'light',
        accentColor: '#676FFF',
        logo: '/logo.png',
      },
      // Create embedded wallets for users who don't have a wallet
      embeddedWallets: {
        createOnLogin: 'users-without-wallets',
      },
    }}
  >
    <App />
  </PrivyProvider>
);
