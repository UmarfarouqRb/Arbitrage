import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h2>Welcome to the Arbitrage Bot Dashboard</h2>
      <p>This is your central hub for managing and monitoring arbitrage opportunities.</p>
      <div className="dashboard-links">
        <Link to="/finder" className="dashboard-link">Go to Arbitrage Finder</Link>
      </div>
    </div>
  );
};

export default Dashboard;
