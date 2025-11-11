
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaRobot, FaTools } from 'react-icons/fa';
import { useNetwork } from '../contexts/NetworkContext';

const TopNav = () => {
  const location = useLocation();
  const { network } = useNetwork();

  const getLinkClass = (path) => {
    const baseClasses = 'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300';
    if (location.pathname === path) {
      return `${baseClasses} text-white bg-gray-900/80`; // Active link
    } else {
      return `${baseClasses} text-gray-400 hover:text-white hover:bg-gray-700/50`; // Inactive link
    }
  };

  const networkName = network.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/70 backdrop-blur-lg border-b border-gray-700/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo/Title */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-white">
              Arbitrage Platform
            </Link>
          </div>

          {/* Main Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/" className={getLinkClass('/')}>
                <FaHome className="mr-2" />
                Home
              </Link>
              <Link to="/arbitrage-bot" className={getLinkClass('/arbitrage-bot')}>
                <FaRobot className="mr-2" />
                Arbitrage Bot
              </Link>
              <Link to="/manual-trade" className={getLinkClass('/manual-trade')}>
                <FaTools className="mr-2" />
                Manual Trade
              </Link>
            </div>
          </div>

          {/* Network Status Indicator */}
          <div className="hidden md:flex items-center ml-6">
             <div className="flex items-center p-2 rounded-full bg-gray-800/90 border border-gray-700">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="ml-3 text-sm font-medium text-gray-300">{networkName}</span>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default TopNav;
