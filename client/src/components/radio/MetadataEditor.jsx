import React, { useState } from 'react';
import { Tag, Save, Music, User, Send, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function MetadataEditor({ onSubmit }) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSend = async () => {
        if (!title) return;
        setLoading(true);
        await onSubmit(title, artist);
        setLoading(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setTitle('');
        setArtist('');
    };

    return (
        <div className="bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl p-6 h-full flex flex-col group shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700/50">
                    <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Metadata Injection</h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">Instant Override: Live Stream</p>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Track Title</label>
                    <div className="relative group/input">
                        <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within/input:text-purple-400 transition-colors" />
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-700 transition-all"
                            placeholder="Enter track name..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Artist Name</label>
                    <div className="relative group/input">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within/input:text-purple-400 transition-colors" />
                        <input
                            value={artist}
                            onChange={e => setArtist(e.target.value)}
                            className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-700 transition-all"
                            placeholder="Enter performer..."
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <Button
                    onClick={handleSend}
                    disabled={!title || loading}
                    className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> UPDATED
                            </motion.div>
                        ) : (
                            <motion.div key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                <Send className="w-3.5 h-3.5" /> INJECT METADATA
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </div>
        </div>
    );
}
