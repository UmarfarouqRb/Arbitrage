import { ConnectButton } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

//  Create a Thirdweb client
const client = createThirdwebClient({
    // You can get a client ID from https://thirdweb.com/create-api-key
    clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});

// ConnectButton component
const ConnectWallet = ({ network }) => {
    return (
        <ConnectButton
            client={client}
            chain={network === 'Base Mainnet' ? base : baseSepolia}
        />
    );
};

export default ConnectWallet;
