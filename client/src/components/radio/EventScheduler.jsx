import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Clock, Music2, Volume2, Tag, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import axios from 'axios';

export default function EventScheduler() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('00:00');
    const [folder, setFolder] = useState('music');
    const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const res = await axios.get('/api/schedule');
            setEvents(res.data);
        } catch (err) {
            console.error('Failed to fetch schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEvent = async () => {
        if (!title) return;
        try {
            await axios.post('/api/schedule', {
                title,
                folder,
                start_time: startTime,
                days: selectedDays,
                type: 'playlist'
            });
            setIsAdding(false);
            setTitle('');
            fetchSchedule();
        } catch (err) {
            alert('Failed to add event');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this scheduled event?')) return;
        try {
            await axios.delete(`/api/schedule/${id}`);
            fetchSchedule();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const toggleEnabled = async (id, current) => {
        try {
            await axios.patch(`/api/schedule/${id}`, { enabled: !current });
            fetchSchedule();
        } catch (err) {
            alert('Update failed');
        }
    };

    const toggleDay = (day) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    return (
        <div className="bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl flex flex-col h-full overflow-hidden group shadow-2xl">
            <div className="p-6 border-b border-zinc-800/40 flex justify-between items-center bg-zinc-950/20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                        <CalendarDays className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Program Calendar</h3>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{events.length} Scheduled Operations</p>
                    </div>
                </div>

                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    className={cn(
                        "h-10 px-6 rounded-full text-[10px] font-black uppercase transition-all shadow-xl",
                        isAdding ? "bg-zinc-800 text-zinc-400" : "bg-white text-black hover:bg-zinc-200"
                    )}
                >
                    {isAdding ? 'CANCEL' : 'CREATE EVENT'}
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {isAdding && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mb-8 p-6 bg-white/5 border border-zinc-800 rounded-3xl space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Event Label</label>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="e.g. Morning Hits"
                                            className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Trigger Time</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={e => setStartTime(e.target.value)}
                                                className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Source Folder</label>
                                    <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-zinc-800">
                                        {['music', 'jingles', 'ads'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFolder(f)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                                    folder === f ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600"
                                                )}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Active Days</label>
                                    <div className="flex justify-between gap-1">
                                        {dayLabels.map((day, i) => (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(i)}
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all",
                                                    selectedDays.includes(i)
                                                        ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                                                        : "bg-transparent border-zinc-800 text-zinc-600"
                                                )}
                                            >
                                                {day[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAddEvent}
                                    className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl"
                                >
                                    SCHEDULE OPERATION
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-3">
                        {events.map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-zinc-950/40 border border-zinc-800/40 hover:border-zinc-700/60 p-5 rounded-3xl flex items-center gap-6 transition-all"
                            >
                                <div className="flex flex-col items-center justify-center min-w-16 h-16 bg-black/40 rounded-2xl border border-zinc-800 group-hover:bg-purple-500/5 group-hover:border-purple-500/20 transition-all">
                                    <p className="text-lg font-black text-white">{event.start_time}</p>
                                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">LOCAL</p>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-bold truncate text-white uppercase tracking-tight">{event.title}</h4>
                                        <Badge variant="outline" className="text-[8px] py-0 px-2 font-black uppercase tracking-widest border-zinc-800 text-zinc-500">
                                            {event.folder}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1.5 mt-2">
                                        {dayLabels.map((day, i) => (
                                            <span
                                                key={day}
                                                className={cn(
                                                    "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                                                    JSON.parse(event.days).includes(i)
                                                        ? "text-purple-400 bg-purple-500/5"
                                                        : "text-zinc-800"
                                                )}
                                            >
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleEnabled(event.id, event.enabled)}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all border",
                                            event.enabled
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-red-500/10 border-red-500/20 text-red-400"
                                        )}
                                    >
                                        {event.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="p-3 bg-zinc-800/40 border border-zinc-700/20 text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all rounded-2xl"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}

                        {!loading && events.length === 0 && !isAdding && (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-4">
                                <Calendar className="w-12 h-12 opacity-10" />
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-widest text-zinc-500">No scheduled programs</p>
                                    <p className="text-[10px] uppercase font-mono tracking-tighter text-zinc-700">STATION RUNNING ON DEFAULT ROTATION</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
