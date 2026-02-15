import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Archive, Download, Trash2, Play, Pause, FileAudio, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

const API_BASE = '/api';

export default function ArchivesPanel() {
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(null);
    const [audio, setAudio] = useState(null);

    useEffect(() => {
        fetchArchives();
        return () => {
            if (audio) audio.pause();
        };
    }, []);

    const fetchArchives = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/archives`);
            setArchives(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (name) => {
        if (!confirm(`Delete ${name}?`)) return;
        try {
            await axios.delete(`${API_BASE}/archives/${name}`);
            fetchArchives();
            if (playing === name) {
                audio.pause();
                setPlaying(null);
                setAudio(null);
            }
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handlePlay = (name) => {
        if (playing === name) {
            audio.pause();
            setPlaying(null);
        } else {
            if (audio) audio.pause();
            const newAudio = new Audio(`${API_BASE}/archives/${name}`);
            newAudio.play();
            newAudio.onended = () => setPlaying(null);
            setAudio(newAudio);
            setPlaying(name);
        }
    };

    const handleDownload = (name) => {
        window.open(`${API_BASE}/archives/${name}`, '_blank');
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800/40 bg-zinc-950/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                            <Archive className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Broadcast Archives</h3>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Recorded Shows & Mixes</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchArchives} className="border-zinc-800/60 bg-black/20 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-1 gap-3">
                    {archives.length === 0 && !loading && (
                        <div className="text-center py-20 text-zinc-600">
                            <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest opacity-50">No Archives Found</p>
                            <p className="text-xs text-zinc-700 mt-2">Archives are created automatically every hour.</p>
                        </div>
                    )}
                    {archives.map((file) => (
                        <div key={file.name} className="group flex items-center justify-between p-4 rounded-xl bg-black/20 border border-transparent hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`w-10 h-10 rounded-full border ${playing === file.name ? 'bg-amber-500 text-white border-amber-400' : 'bg-zinc-900 text-zinc-500 border-zinc-800 group-hover:border-zinc-600 group-hover:text-white'}`}
                                    onClick={() => handlePlay(file.name)}
                                >
                                    {playing === file.name ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                </Button>
                                <div>
                                    <h4 className="font-bold text-zinc-300 group-hover:text-white text-sm mb-1 truncate max-w-[300px]">{file.name}</h4>
                                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(file.created), 'MMM dd, HH:mm')}</span>
                                        <span className="flex items-center gap-1"><FileAudio className="w-3 h-3" /> {formatSize(file.size)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50" onClick={() => handleDownload(file.name)} title="Download">
                                    <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(file.name)} title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
