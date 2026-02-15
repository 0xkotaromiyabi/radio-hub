import React, { useState, useEffect } from 'react';
import { useAppKitAccount, useAppKitConnection, useAppKit } from "@reown/appkit/react";
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '../ui/button';
import { Wallet, LogOut, RefreshCw, Send, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

export default function SolanaPanel() {
    const { address, isConnected } = useAppKitAccount();
    const { connection } = useAppKitConnection();
    const { open } = useAppKit();

    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isConnected && address && connection) {
            fetchBalance();
        }
    }, [isConnected, address, connection]);

    const fetchBalance = async () => {
        if (!address || !connection) return;
        try {
            // connection.getBalance takes a PublicKey object, but often strings work if the adapter handles it 
            // BUT Reown adapter typically provides a web3.js Connection object.
            // We need to construct a PublicKey from the address string.
            // Let's dynamically import PublicKey if needed or assume string works?
            // Standard web3.js getBalance needs PublicKey.
            const { PublicKey } = await import('@solana/web3.js');
            const pubKey = new PublicKey(address);
            const bal = await connection.getBalance(pubKey);
            setBalance((bal / LAMPORTS_PER_SOL).toFixed(4));
        } catch (e) {
            console.error("Balance fetch failed", e);
        }
    };

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-32 translate-x-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl translate-y-32 -translate-x-32 pointer-events-none"></div>

            <div className="p-6 border-b border-zinc-800/40 bg-zinc-950/20 flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Solana Connection</h3>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Reown AppKit</p>
                        </div>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-6 relative z-10">
                <div className="space-y-6 max-w-2xl mx-auto">
                    {!isConnected ? (
                        <div className="text-center py-20 space-y-6">
                            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-zinc-700">
                                <Wallet className="w-8 h-8 text-zinc-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
                                <p className="text-zinc-400">Manage your connection settings.</p>
                            </div>
                            <Button
                                size="lg"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg shadow-indigo-500/20"
                                onClick={() => open()}
                            >
                                Connect Wallet
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Wallet Card */}
                            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Connected Wallet</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h1 className="text-3xl font-black text-white tracking-tight">
                                                    {balance !== null ? balance : '...'} <span className="text-indigo-400">SOL</span>
                                                </h1>
                                            </div>
                                            <p className="text-xs text-zinc-500 font-mono">Live Balance</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={fetchBalance} className="border-zinc-700/50">
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="p-3 bg-black/40 rounded-xl border border-zinc-800 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                                {address.slice(0, 2)}
                                            </div>
                                            <div className="font-mono text-sm text-zinc-300">
                                                {address.slice(0, 6)}...{address.slice(-4)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={copyAddress}>
                                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <a
                                                href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send Tip (Soon)
                                        </Button>
                                        <Button variant="outline" className="flex-1 border-red-900/30 text-red-400 hover:bg-red-950/30 hover:text-red-300" onClick={() => open()}>
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Manage / Disconnect
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Network Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Network</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="font-bold text-zinc-300">Solana Devnet</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Provider</p>
                                    <span className="font-bold text-zinc-300">Reown AppKit</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
