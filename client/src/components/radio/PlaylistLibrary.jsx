import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDraggable
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { Upload, Trash2, Play, Plus, Search, Folder, Music, Music2, FileAudio, ListMusic, Volume2, Tag, Loader2, FolderOpen, Pause, SkipForward } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import QueuePanel from './QueuePanel';

// Draggable Track in Library
function DraggableLibraryItem({ file, isPlaying, onPlayNext, onDelete, onAddToQueue, onPlayNow }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `lib-${file}`,
        data: { file, type: 'library-item' }
    });

    // apply transform to the list item itself to avoid it moving while dragging

    return (
        <div ref={setNodeRef} className={cn(
            "group flex items-center gap-3 p-3 rounded-xl transition-all border border-transparent hover:bg-zinc-800/60 hover:border-zinc-800",
            isPlaying ? "bg-purple-500/10 border-purple-500/50" : "bg-black/20"
        )}>
            <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isPlaying ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-zinc-900 group-hover:bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
                )}>
                    {isPlaying ? <Music2 className="w-4 h-4 animate-pulse" /> : <ListMusic className="w-4 h-4" />}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className={cn("text-xs font-bold truncate transition-colors", isPlaying ? "text-purple-300" : "text-zinc-300 group-hover:text-white")}>
                        {file.replace('.mp3', '')}
                    </p>
                    {isPlaying && <Badge variant="default" className="h-4 px-1 text-[8px] bg-purple-500 hover:bg-purple-600">ON AIR</Badge>}
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600 group-hover:text-zinc-500">
                    <span className="uppercase tracking-wider">MP3 • 320kbps</span>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded-lg"
                    onClick={() => onAddToQueue(file)}
                    title="Add to Local Queue"
                >
                    <Plus className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg"
                    onClick={() => onPlayNext(file)}
                    title="Play Next (Queue to Server)"
                >
                    <ListMusic className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-500 hover:text-white hover:bg-emerald-500/20 rounded-lg"
                    onClick={() => onPlayNow(file)}
                    title="Play Now (Instant Skip)"
                >
                    <Play className="w-4 h-4 fill-current" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    onClick={() => onDelete(file)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

export default function PlaylistLibrary({ files, onUpload, onDelete, onPush, radioStatus, uploading, activeFolder, onFolderChange }) {
    const [queue, setQueue] = useState([]);

    // Load and poll queue from backend
    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await axios.get('/api/queue');
            setQueue(res.data);
        } catch (e) {
            console.error('Failed to fetch queue', e);
        }
    };
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeDragItem, setActiveDragItem] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveDragId(active.id);

        // Find item data
        if (String(active.id).startsWith('lib-')) {
            const fileName = active.data.current?.file;
            setActiveDragItem({ name: fileName, type: 'library' });
        } else {
            // Queue item
            const item = queue.find(q => q.id === active.id);
            if (item) setActiveDragItem({ name: item.name, type: 'queue' });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragItem(null);

        if (!over) return;

        // Reordering Queue
        if (active.id !== over.id && !String(active.id).startsWith('lib-')) {
            const oldIndex = queue.findIndex((item) => item.id === active.id);
            const newIndex = queue.findIndex((item) => item.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newQueue = arrayMove(queue, oldIndex, newIndex);
                // Update state immediately for UI snappiness
                setQueue(newQueue);
                // Sync with backend
                const reorderItems = newQueue.map((item, index) => ({ id: item.id, position: index + 1 }));
                axios.post('/api/queue/reorder', { items: reorderItems }).catch(e => console.error('Reorder fail', e));
            }
        }

        // Dropping Library Item into Queue (Sortable Context or Droppable container)
        // If we drop a library item onto a queue item, it should insert?
        // Or just general drop.
        if (String(active.id).startsWith('lib-')) {
            // Check if dropped over queue area
            // We can check if `over.id` exists in queue IDs OR if it's a generic container ID
            // Since QueuePanel items are sortables, `over.id` will likely be a queue item ID or the container.
            // For now, let's just Append if dropped anywhere in the list.
            const fileName = active.data.current?.file;
            if (fileName) addToQueue(fileName);
        }
    };

    const addToQueue = async (fileName) => {
        try {
            await axios.post('/api/queue', { name: fileName, folder: activeFolder });
            fetchQueue();
        } catch (e) {
            alert('Failed to add to queue');
        }
    };

    const handleRemoveFromQueue = async (id) => {
        try {
            await axios.delete(`/api/queue/${id}`);
            fetchQueue();
        } catch (e) {
            alert('Failed to remove from queue');
        }
    };

    const handlePlayNow = async (track) => {
        try {
            await axios.post('/api/control/play-now', {
                folder: track.folder,
                name: track.name
            });
            // Don't auto-remove, assume user might want to keep history or re-queue.
        } catch (e) {
            alert("Failed to play: " + e.message);
        }
    };

    const handleClearQueue = async () => {
        if (!window.confirm("Clear entire queue?")) return;
        try {
            await axios.post('/api/control/queue/clear');
            fetchQueue();
        } catch (e) {
            alert('Failed to clear queue');
        }
    };

    // Filter files
    const [search, setSearch] = useState('');
    const filteredFiles = (files || []).filter(f => f.toLowerCase().includes(search.toLowerCase()));

    const folders = [
        { id: 'music', label: 'Music', icon: Music2 },
        { id: 'jingles', label: 'Jingles', icon: Volume2 },
        { id: 'ads', label: 'Promos', icon: Tag },
    ];

    const isLive = (filename) => {
        if (!radioStatus?.data?.songtitle) return false;
        const cleanName = filename.replace('.mp3', '').toLowerCase();
        return radioStatus.data.songtitle.toLowerCase().includes(cleanName);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* LIBRARY SIDE */}
                <div className="lg:col-span-3 bg-zinc-900/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-zinc-800/40 bg-zinc-950/20 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-purple-500">
                                    <FolderOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Media Repository</h3>
                                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{(files || []).length} Tracks Available</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <label className="cursor-pointer group relative">
                                    <div className="h-9 px-4 bg-white text-black hover:bg-zinc-200 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
                                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        <span>Upload</span>
                                    </div>
                                    <input type="file" className="hidden" accept=".mp3" onChange={onUpload} disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800/50">
                            {folders.map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => onFolderChange(folder.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[9px] font-black uppercase transition-all",
                                        activeFolder === folder.id
                                            ? "bg-zinc-800 text-white shadow-lg"
                                            : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <folder.icon className="w-3 h-3" />
                                    {folder.label}
                                </button>
                            ))}
                        </div>

                        {/* NOW PLAYING & PLAYBACK CONTROLS */}
                        {radioStatus?.data?.songtitle && (
                            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                        <Music2 className="w-5 h-5 text-purple-400 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-0.5">Now Playing</p>
                                        <p className="text-xs font-bold text-white truncate">{radioStatus.data.songtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg"
                                        onClick={async () => {
                                            try {
                                                await axios.post('/api/control/pause');
                                            } catch (e) { console.error('Pause failed', e); }
                                        }}
                                        title="Pause"
                                    >
                                        <Pause className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg"
                                        onClick={async () => {
                                            try {
                                                await axios.post('/api/control/resume');
                                            } catch (e) { console.error('Resume failed', e); }
                                        }}
                                        title="Play/Resume"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg"
                                        onClick={async () => {
                                            try {
                                                await axios.post('/api/control/skip');
                                            } catch (e) { console.error('Skip failed', e); }
                                        }}
                                        title="Skip"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search repository..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-black/20 border border-zinc-800/60 rounded-xl py-2 pl-9 pr-4 text-[11px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-3 custom-scrollbar">
                        <div className="space-y-1">
                            {filteredFiles.map((file) => (
                                <DraggableLibraryItem
                                    key={file}
                                    file={file}
                                    isPlaying={isLive(file)}
                                    onPlayNext={onPush}
                                    onDelete={() => onDelete(file)}
                                    onAddToQueue={addToQueue}
                                    onPlayNow={() => handlePlayNow({ name: file, folder: activeFolder })}
                                />
                            ))}
                            {filteredFiles.length === 0 && (
                                <div className="py-10 text-center text-zinc-600">
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Tracks Found</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* QUEUE SIDE */}
                <div className="lg:col-span-1 h-full min-h-[400px]">
                    <QueuePanel
                        queue={queue}
                        onRemove={handleRemoveFromQueue}
                        onPlayNow={handlePlayNow}
                        onClear={handleClearQueue}
                    />
                </div>
            </div>

            <DragOverlay>
                {activeDragItem ? (
                    <div className="bg-zinc-800/90 backdrop-blur border border-purple-500/50 p-3 rounded-xl shadow-2xl w-64 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                            <Music2 className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white truncate">{activeDragItem.name}</p>
                            <p className="text-[10px] text-purple-300 font-mono uppercase">Dragging...</p>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
