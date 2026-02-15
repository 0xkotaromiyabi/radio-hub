import { createClient, autoDiscover } from "@solana/client";

// Initialize the Solana Client
// defaulting to devnet for experimental features as per documentation
// Monikers: 'mainnet', 'devnet', 'testnet', 'localnet'
let clientInstance = null;

export const getSolanaClient = () => {
    if (!clientInstance) {
        try {
            clientInstance = createClient({
                cluster: "devnet",
                walletConnectors: autoDiscover(),
            });
        } catch (e) {
            console.error("Solana Client Init Failed", e);
            throw e;
        }
    }
    return clientInstance;
};

// Helper to shorten addresses
export const shortenAddress = (address, chars = 4) => {
    if (!address) return "";
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// Helper to format SOL balance (lamports to SOL)
export const formatSol = (lamports) => {
    if (!lamports) return "0";
    const sol = Number(lamports) / 1_000_000_000;
    return sol.toLocaleString('en-US', { maximumFractionDigits: 4 });
};
