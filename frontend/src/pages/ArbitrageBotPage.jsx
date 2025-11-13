
import ArbitrageBotController from '../components/ArbitrageBotController';
import BotLogs from '../components/BotLogs';

const ArbitrageBotPage = () => {
  return (
    <div className="arbitrage-bot-container">
      <div className="controller-header">
        <h3>Arbitrage Bot</h3>
        <p className="page-description">
          Manually trigger the bot to find and execute arbitrage opportunities.
        </p>
      </div>
      <ArbitrageBotController />
      <BotLogs />
    </div>
  );
};

export default ArbitrageBotPage;
