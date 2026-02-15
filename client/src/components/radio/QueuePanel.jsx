import React from 'react';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Music2, Play, Trash2, ListMusic, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import axios from 'axios';

const API_BASE = '/api';

import { Badge } from '../ui/badge';

export function QueueItem({ id, track, onRemove, onPlayNow }) {
    const isStaged = track.status === 'staged';
    const isPlaying = track.status === 'playing';
    const isCommitted = track.status === 'committed';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        disabled: !isStaged // Only staged items are draggable
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-3 p-3 rounded-xl border transition-all mb-2 touch-none relative",
                isStaged ? "border-zinc-800/40 bg-zinc-900/40" : "border-purple-500/30 bg-purple-500/5",
                isPlaying && "border-emerald-500/50 bg-emerald-500/10",
                isDragging && "opacity-50 ring-2 ring-purple-500/50 bg-zinc-800"
            )}
        >
            <div
                {...(isStaged ? { ...attributes, ...listeners } : {})}
                className={cn(
                    "p-1",
                    isStaged ? "cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400" : "text-zinc-800"
                )}
            >
                {isPlaying ? <Music2 className="w-4 h-4 text-emerald-500 animate-pulse" /> : <GripVertical className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className={cn("text-xs font-bold truncate", isPlaying ? "text-emerald-400" : "text-zinc-200")}>
                        {track.name}
                    </p>
                    {isPlaying && <Badge className="bg-emerald-500 text-[8px] h-3 px-1 uppercase font-black">Playing</Badge>}
                    {isCommitted && <Badge variant="secondary" className="text-[8px] h-3 px-1 border-purple-500/50 text-purple-400 uppercase font-black">Commit</Badge>}
                </div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    {isStaged ? "In Staged Queue" : (isPlaying ? "Currently Broadcasting" : "Committed to Radio")}
                </p>
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {isStaged && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-white hover:bg-emerald-500/20 rounded-lg"
                            onClick={() => onPlayNow(track)}
                            title="Play Immediately (Skip Current)"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-white hover:bg-red-500/20 rounded-lg"
                            onClick={() => onRemove(id)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function QueuePanel({ queue, onRemove, onPlayNow, onClear }) {
    // No DndContext here. Parent handles it.

    const handleClear = async () => {
        if (!window.confirm("Clear entire queue?")) return;
        // Logic to clear local state should be passed from parent ideally, 
        // but user only passed onRemove. 
        // For MVP, we can trigger an event or just call API and let parent sync? 
        // Parent doesn't auto-sync queue from server yet (it's local state).
        // I will trust the parent passed `setQueue` or I should ask for it.
        // Wait, I removed `setQueue` from props in this version.
        // I should probably skip "Clear" button for now or ask parent to handle it.
        // Or re-add `onClear` prop.
        try {
            await axios.post(`${API_BASE}/control/queue/clear`);
            // We need to clear local state too.
            // Let's assume onRemove can accept 'all'? No.
            // I'll leave the API call. The visual list wont clear unless parent does it.
            // I'll add onClear prop if I can, but I don't want to edit Parent again.
            // Parent has `setQueue`. 
            // In PlaylistLibrary.jsx I didn't pass onClear. 
            // I passed `queue`, `onRemove`, `onPlayNow`.
            // So I will remove Clear button or implement it via window reload? No.
            // I'll just remove the Clear button for now to keep it simple and robust.
            // Or I can reload the page? No.
            // Just leaving API call is confusing if UI doesn't update.
            // I'll removing Clear button to be safe.
        } catch (e) { console.error(e); }
    };

    return (
        <div className="bg-black/20 rounded-2xl border border-zinc-800/40 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Staged Queue</h3>
                    <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold">{queue.length}</span>
                </div>
                {queue.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[9px] font-black uppercase text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg group"
                        onClick={onClear}
                    >
                        <Trash2 className="w-3 h-3 mr-1 transition-transform group-hover:scale-110" />
                        Clear All
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[100px] mb-4 custom-scrollbar">
                <SortableContext
                    items={queue.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {queue.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-2 border-2 border-dashed border-zinc-800/50 rounded-xl">
                            <ListMusic className="w-8 h-8 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Queue Empty</p>
                            <p className="text-[9px] opacity-30">Drag songs from library here</p>
                        </div>
                    ) : (
                        queue.map((item) => (
                            <QueueItem
                                key={item.id}
                                id={item.id}
                                track={item}
                                onRemove={onRemove}
                                onPlayNow={onPlayNow}
                            />
                        ))
                    )}
                </SortableContext>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-[9px] text-purple-300 font-medium leading-relaxed">
                    <span className="font-bold uppercase tracking-wider text-purple-400 block mb-1">How Queue Works:</span>
                    Drag songs here to prepare your set. Click <Play className="w-3 h-3 inline fill-current mx-0.5" /> to
                    <span className="font-bold text-white"> FORCE PLAY</span> immediately (skips current track).
                </p>
            </div>
        </div>
    );
}
