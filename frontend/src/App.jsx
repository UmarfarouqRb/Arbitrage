
import { Suspense, lazy, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Contract } from 'ethers';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { NetworkContext } from './contexts/NetworkContext';
import { WalletProvider } from './contexts/WalletContext';
import { arbitrageBalancerABI, gnosisSafeABI } from './utils/abi';

const ArbitrageFinder = lazy(() => import('./components/ArbitrageFinder'));
const ArbitrageOpportunitiesPage = lazy(() => import('./pages/ArbitrageOpportunitiesPage'));
const OwnerSection = lazy(() => import('./components/OwnerSection'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ArbitrageBotPage = lazy(() => import('./pages/ArbitrageBotPage'));

const App = () => {
  const { user } = usePrivy();
  const { networkConfig } = useContext(NetworkContext);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      if (user && networkConfig) {
        try {
          const provider = await user.wallet.getEthersProvider();
          const arbitrageBalancer = new Contract(networkConfig.arbitrageBalancerAddress, arbitrageBalancerABI, provider);
          const multiSigAddress = await arbitrageBalancer.multiSig();

          const gnosisSafe = new Contract(multiSigAddress, gnosisSafeABI, provider);
          const owners = await gnosisSafe.getOwners();

          const isUserOwner = owners.map(owner => owner.toLowerCase()).includes(user.wallet.address.toLowerCase());
          setIsOwner(isUserOwner);
        } catch (error) {
          console.error("Error checking ownership:", error);
          setIsOwner(false);
        }
      }
    };

    checkOwnership();
  }, [user, networkConfig]);

  return (
    <Router>
      <WalletProvider>
        <Layout isOwner={isOwner}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}><h2>Loading Page...</h2></div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/finder" element={
                <ErrorBoundary>
                  <ArbitrageFinder />
                </ErrorBoundary>
              } />
              <Route path="/opportunities" element={
                <ErrorBoundary>
                  <ArbitrageOpportunitiesPage />
                </ErrorBoundary>
              } />
              <Route path="/arbitrage-bot" element={
                <ErrorBoundary>
                  <ArbitrageBotPage />
                </ErrorBoundary>
              } />
              <Route path="/owner" element={
                <ErrorBoundary>
                  {isOwner ? <OwnerSection /> : <Navigate to="/" />}
                </ErrorBoundary>
              } />
            </Routes>
          </Suspense>
        </Layout>
      </WalletProvider>
    </Router>
  );
};

export default App;
