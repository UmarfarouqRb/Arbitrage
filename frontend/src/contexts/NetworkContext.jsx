
import React, { createContext, useState, useContext } from 'react';

const NetworkContext = createContext();

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  // The network is now permanently set to Base Mainnet.
  // The ability to change the network has been removed to simplify the app.
  const [network] = useState('base-mainnet');

  // The setNetwork function is no longer provided to consumers of this context,
  // effectively making the network state read-only throughout the application.
  return (
    <NetworkContext.Provider value={{ network }}>
      {children}
    </NetworkContext.Provider>
  );
};
