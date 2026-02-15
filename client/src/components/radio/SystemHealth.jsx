import React from 'react';
import { Activity, Cpu, HardDrive, Zap, BarChart3, Layers, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SystemHealth() {
    const stats = [
        { label: 'CPU LOAD', value: '1.2%', icon: Cpu, color: 'text-cyan-400', progress: 12 },
        { label: 'MEM USAGE', value: '742MB', icon: Database, color: 'text-purple-400', progress: 42 },
        { label: 'STORAGE', value: '24.1GB', icon: HardDrive, color: 'text-emerald-400', progress: 18 },
        { label: 'STREAMS', value: 'STABLE', icon: Zap, color: 'text-orange-400', progress: 100 },
    ];

    return (
        <div className="bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl p-6 h-full flex flex-col group shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-24 h-24 text-white" />
            </div>

            <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700/50">
                    <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Infrastructure</h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">Cluster Status: Optimal</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-5 relative z-10">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-2.5"
                    >
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <span className="text-[10px] font-black text-white font-mono">{stat.value}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stat.progress}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className={cn("h-full rounded-full bg-gradient-to-r",
                                    stat.color.replace('text-', 'from-').replace('400', '600'),
                                    'to-white/20'
                                )}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-black/40 rounded-xl border border-zinc-800/60 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Liquidsoap Ingestion Active</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600">v1.2.4</span>
            </div>
        </div>
    );
}

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
