import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from '../ui/button';
import { Wallet, ShieldAlert, Loader2, LogOut } from 'lucide-react';

const ALLOWED_WALLETS = [
    '9xhz4Cb4C2Z4z9xdD2geCafovNYVngC4E4XpWtQmeEuv',
    '41MLp5oX9yYwNoMCcQUw9ZRZQazEacU5JThrGv6E5wMU',
    '7ZNASkeGNj3aGikReTUdEiN98heqr1fCTBd2gGm7cacV',
    '53RBcxsuGsUXcBkFeVuChBkhAGWo7ENRYmAVQpWgVLAM'
];

export default function WalletGate({ children }) {
    const { open } = useAppKit();
    const { address, isConnected, status } = useAppKitAccount();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (isConnected && address) {
            console.log("Reown Connected:", address);
            const isAllowed = ALLOWED_WALLETS.includes(address);
            setAuthorized(isAllowed);
        } else {
            setAuthorized(false);
        }
    }, [isConnected, address]);

    if (authorized) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-purple-900/20">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto border-4 border-zinc-950 shadow-inner">
                    {isConnected ? <ShieldAlert className="w-10 h-10 text-red-500" /> : <Wallet className="w-10 h-10 text-purple-500" />}
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        {isConnected ? "Access Denied" : "Radio Dashboard"}
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        {isConnected
                            ? "Your wallet is not authorized to access this station."
                            : "Connect an authorized Solana wallet via Reown to proceed."}
                    </p>
                </div>

                {isConnected && address && (
                    <div className="bg-black/50 p-3 rounded-lg font-mono text-xs text-zinc-500 break-all border border-zinc-800">
                        {address}
                    </div>
                )}

                {!isConnected ? (
                    <div className="space-y-3 w-full">
                        <div className="p-4 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800 mb-6">
                            <p className="text-xs text-zinc-500 mb-4">Supports Phantom, Solflare, and 300+ others</p>
                            <Button
                                size="lg"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20"
                                onClick={() => open()}
                            >
                                <Wallet className="w-4 h-4 mr-2" />
                                Connect Wallet
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-zinc-700 text-zinc-400 hover:text-white"
                        onClick={() => open()}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect / Change Wallet
                    </Button>
                )}
            </div>
        </div>
    );
}

