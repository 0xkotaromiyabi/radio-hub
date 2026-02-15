import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Play, Pause, Square, Upload, Volume2, Radio, Info, Laptop, SkipForward, Activity, Zap, ExternalLink, ShieldCheck, Copy } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

export default function BroadcastControls({ onStatusChange, radioStatus, onSkip }) {
    // --- Audio State ---
    const [isMicActive, setIsMicActive] = useState(false);
    const [isSysAudioActive, setIsSysAudioActive] = useState(false);
    const [isPlayingFile, setIsPlayingFile] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [status, setStatus] = useState('disconnected');
    const [currentTime, setCurrentTime] = useState('00:00:00');

    // --- Volumes ---
    const [masterVolume, setMasterVolume] = useState(0.8);
    const [micVolume, setMicVolume] = useState(1.0);
    const [sysVolume, setSysVolume] = useState(0.8);
    const [fileVolume, setFileVolume] = useState(0.7);

    // --- Refs ---
    const audioContextRef = useRef(null);
    const micStreamRef = useRef(null);
    const micSourceRef = useRef(null);
    const sysStreamRef = useRef(null);
    const sysSourceRef = useRef(null);
    const fileSourceRef = useRef(null);
    const fileBufferRef = useRef(null);

    const masterGainRef = useRef(null);
    const micGainRef = useRef(null);
    const sysGainRef = useRef(null);
    const fileGainRef = useRef(null);

    const processorRef = useRef(null);
    const wsRef = useRef(null);

    const [currentTrack, setCurrentTrack] = useState('No track loaded');

    // Initialize
    useEffect(() => {
        const initAudio = () => {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass({ sampleRate: 44100 });
            audioContextRef.current = ctx;

            const masterGain = ctx.createGain();
            masterGain.gain.value = masterVolume;
            masterGain.connect(ctx.destination);
            masterGainRef.current = masterGain;

            const micGain = ctx.createGain();
            micGain.gain.value = 0;
            micGain.connect(masterGain);
            micGainRef.current = micGain;

            const sysGain = ctx.createGain();
            sysGain.gain.value = 0;
            sysGain.connect(masterGain);
            sysGainRef.current = sysGain;

            const fileGain = ctx.createGain();
            fileGain.gain.value = fileVolume;
            fileGain.connect(masterGain);
            fileGainRef.current = fileGain;
        };

        if (!audioContextRef.current) initAudio();
        return () => audioContextRef.current?.close();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-GB')), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume; }, [masterVolume]);
    useEffect(() => { if (micGainRef.current) micGainRef.current.gain.value = isMicActive ? micVolume : 0; }, [micVolume, isMicActive]);
    useEffect(() => { if (sysGainRef.current) sysGainRef.current.gain.value = isSysAudioActive ? sysVolume : 0; }, [sysVolume, isSysAudioActive]);
    useEffect(() => { if (fileGainRef.current) fileGainRef.current.gain.value = fileVolume; }, [fileVolume]);

    const startBroadcast = useCallback(() => {
        if (!audioContextRef.current || !masterGainRef.current) return;
        setStatus('connecting');
        onStatusChange?.('connecting');

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/broadcast-ws`;
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'connect',
                    config: { protocol: 'shoutcast1', host: '127.0.0.1', port: 8000, password: 'web3radio24' }
                }));
            };
            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'connected') { setStatus('connected'); setIsBroadcasting(true); onStatusChange?.('connected'); }
                    else if (data.type === 'error') { stopBroadcast(); alert(data.message); }
                } catch (err) { }
            };
            ws.onclose = () => { setStatus('disconnected'); setIsBroadcasting(false); onStatusChange?.('disconnected'); };

            const processor = audioContextRef.current.createScriptProcessor(4096, 2, 2);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const left = e.inputBuffer.getChannelData(0);
                    const right = e.inputBuffer.getChannelData(1);
                    const interleaved = new Float32Array(left.length * 2);
                    for (let i = 0; i < left.length; i++) {
                        interleaved[i * 2] = left[i];
                        interleaved[i * 2 + 1] = right[i];
                    }
                    ws.send(interleaved.buffer);
                }
            };
            masterGainRef.current.connect(processor);
            processor.connect(audioContextRef.current.destination);
        } catch (err) { setStatus('disconnected'); }
    }, [onStatusChange]);

    const stopBroadcast = useCallback(() => {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        if (processorRef.current && masterGainRef.current && audioContextRef.current) {
            processorRef.current.disconnect();
            masterGainRef.current.disconnect(processorRef.current);
            masterGainRef.current.connect(audioContextRef.current.destination);
        }
        setIsBroadcasting(false); setStatus('disconnected'); onStatusChange?.('disconnected');
    }, [onStatusChange]);

    const toggleMic = async () => {
        if (!audioContextRef.current || !micGainRef.current) return;
        if (isMicActive) { setIsMicActive(false); }
        else {
            try {
                if (!micStreamRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micStreamRef.current = stream;
                    const source = audioContextRef.current.createMediaStreamSource(stream);
                    micSourceRef.current = source; source.connect(micGainRef.current);
                }
                setIsMicActive(true);
            } catch (err) { alert("Mic Access Error"); }
        }
    };

    const toggleSysAudio = async () => {
        if (!audioContextRef.current || !sysGainRef.current) return;
        if (isSysAudioActive) {
            if (sysStreamRef.current) { sysStreamRef.current.getTracks().forEach(t => t.stop()); sysStreamRef.current = null; }
            setIsSysAudioActive(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                sysStreamRef.current = stream;
                const source = audioContextRef.current.createMediaStreamSource(stream);
                sysSourceRef.current = source; source.connect(sysGainRef.current);
                setIsSysAudioActive(true);
                stream.getVideoTracks()[0].onended = () => setIsSysAudioActive(false);
            } catch (err) { alert("Screen Audio Error"); }
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !audioContextRef.current) return;
        setCurrentTrack(file.name);
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        fileBufferRef.current = audioBuffer;
    };

    const playFile = () => {
        if (!audioContextRef.current || !fileBufferRef.current || !fileGainRef.current || isPlayingFile) return;
        const source = audioContextRef.current.createBufferSource();
        source.buffer = fileBufferRef.current; source.connect(fileGainRef.current);
        source.onended = () => setIsPlayingFile(false);
        fileSourceRef.current = source; source.start(0); setIsPlayingFile(true);
    };

    const stopFile = () => {
        if (fileSourceRef.current) { try { fileSourceRef.current.stop(); } catch (e) { } fileSourceRef.current = null; }
        setIsPlayingFile(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Simple visual feedback could be added here
    };

    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl flex flex-col h-full shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className={cn(
                "absolute -top-24 -right-24 w-64 h-64 blur-[100px] transition-all duration-1000",
                isBroadcasting ? "bg-red-500/20" : "bg-purple-500/10"
            )} />

            <div className="p-6 border-b border-zinc-800/40 bg-zinc-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-3 rounded-xl transition-all duration-500",
                        isBroadcasting ? "bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse" : "bg-zinc-800 text-zinc-500"
                    )}>
                        <Radio className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Transmission Control</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={isBroadcasting ? "destructive" : "secondary"} className="h-4 px-1.5 text-[8px] font-black uppercase">Local: {status}</Badge>
                            <Badge variant={radioStatus?.status === 'online' ? "default" : "outline"} className={cn("h-4 px-1.5 text-[8px] font-black uppercase", radioStatus?.status === 'online' && "bg-emerald-500")}>Server: {radioStatus?.status || 'Offline'}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Current Time</span>
                        <span className="text-lg font-black text-white font-mono leading-none mt-1">{currentTime}</span>
                    </div>
                </div>
            </div>

            {/* DJ Connection Quick Info */}
            <div className="px-6 py-3 bg-indigo-500/5 border-b border-zinc-800/40 flex flex-wrap items-center gap-x-6 gap-y-2 relative z-10">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Mixxx Direct Link</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 group/copy cursor-pointer" onClick={() => copyToClipboard('broadcast.webthreeradio.xyz')}>
                        <span className="text-zinc-600 uppercase">Host:</span>
                        <span className="text-zinc-300 group-hover/copy:text-white transition-colors">broadcast.webthreeradio.xyz</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-zinc-600 uppercase">Port:</span>
                        <span className="text-zinc-300">80</span>
                    </div>
                    <div className="flex items-center gap-1.5 group/copy cursor-pointer" onClick={() => copyToClipboard('web3radio24')}>
                        <span className="text-zinc-600 uppercase">Pass:</span>
                        <span className="text-zinc-300 group-hover/copy:text-white transition-colors">web3radio24</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-zinc-600 uppercase">SSL:</span>
                        <span className="text-red-500/70 font-black">OFF</span>
                    </div>
                </div>
                <a
                    href="/brain/549935ef-c600-4bc6-8b36-983a77f83582/mixxx_broadcasting_guide.md"
                    target="_blank"
                    className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest"
                >
                    Full Guide <ExternalLink className="w-2.5 h-2.5" />
                </a>
            </div>

            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* MIXER BANK */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Master Mixer Bank</h4>
                        <span className="text-[10px] font-mono text-purple-400 uppercase tracking-tighter opacity-60">Linear PCM 32b</span>
                    </div>

                    <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/40 space-y-6">
                        <MixerChannel
                            icon={<Zap />} label="Master Main" active={true}
                            volume={masterVolume} onVolumeChange={setMasterVolume} color="bg-purple-500"
                        />
                        <Separator className="opacity-20" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <MixerChannel
                                icon={<Mic />} label="Vocals / Mic" active={isMicActive} onToggle={toggleMic}
                                volume={micVolume} onVolumeChange={setMicVolume} color="bg-emerald-500"
                            />
                            <MixerChannel
                                icon={<Laptop />} label="System Audio" active={isSysAudioActive} onToggle={toggleSysAudio}
                                volume={sysVolume} onVolumeChange={setSysVolume} color="bg-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* DECK BANK */}
                <div className="lg:col-span-12 xl:col-span-5 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Deck A / Local Source</h4>
                        <label className="cursor-pointer group/upload bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 hover:border-zinc-500 transition-all">
                            <span className="text-[9px] font-bold text-zinc-500 group-hover/upload:text-white uppercase tracking-tighter">Import Sample</span>
                            <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                        </label>
                    </div>

                    <div className="flex-1 bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/40 flex flex-col justify-between">
                        <div className="min-h-16 flex flex-col items-center justify-center text-center p-4 bg-[#050505] rounded-xl border border-zinc-900 shadow-inner group/display cursor-pointer relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 z-10">
                                <Music2 className={cn("w-3 h-3 transition-colors", isPlayingFile ? "text-purple-400" : "text-zinc-600")} />
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Live Metadata</span>
                            </div>
                            <p className={cn(
                                "text-[10px] font-black uppercase tracking-tighter z-10 transition-all",
                                isPlayingFile ? "text-purple-400" : "text-zinc-400"
                            )}>
                                {isPlayingFile ? `Streaming: ${currentTrack}` : currentTrack}
                            </p>
                            {isPlayingFile && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 opacity-30"
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-4 justify-center py-4">
                            <Button size="icon" variant="ghost" className="rounded-2xl w-14 h-14 bg-white/5 border border-zinc-800/50 hover:bg-white/10 hover:border-purple-500/50 transition-all group/play" onClick={playFile} disabled={isPlayingFile}>
                                <Play className="w-6 h-6 fill-white text-white group-hover/play:scale-110 transition-transform" />
                            </Button>
                            <Button size="icon" variant="ghost" className="rounded-2xl w-14 h-14 bg-white/5 border border-zinc-800/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all group/stop" onClick={stopFile}>
                                <Square className="w-5 h-5 fill-zinc-600 text-zinc-600 group-hover/stop:fill-red-500 group-hover/stop:text-red-500 transition-colors" />
                            </Button>
                        </div>

                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                <span>Gain Control</span>
                                <span>{Math.round(fileVolume * 100)}%</span>
                            </div>
                            <VolumeSlider value={fileVolume} onChange={setFileVolume} color="bg-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-4 bg-zinc-950/40 border-t border-zinc-800/40 flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3 bg-zinc-900/40 px-3 py-2 rounded-xl border border-zinc-800/40 min-w-[300px]">
                    <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Global Server Active Track</p>
                        <p className="text-[10px] font-bold text-zinc-300 truncate mt-0.5">{radioStatus?.data?.songtitle || "Standby Mode"}</p>
                    </div>
                </div>

                {radioStatus?.next && (
                    <div className="flex items-center gap-3 bg-purple-500/10 px-3 py-2 rounded-xl border border-purple-500/20 max-w-[250px]">
                        <SkipForward className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest leading-none text-right">Up Next</p>
                            <p className="text-[10px] font-bold text-white truncate mt-0.5 text-right">{radioStatus.next}</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={onSkip} className="h-10 gap-2 text-[10px] font-black uppercase text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl px-4 border border-zinc-800">
                        <SkipForward className="w-4 h-4" /> Skip Track
                    </Button>
                </div>

                {!isBroadcasting ? (
                    <Button
                        onClick={startBroadcast}
                        className="bg-white text-black hover:bg-zinc-200 h-10 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-95"
                    >
                        Initiate Broadcast
                    </Button>
                ) : (
                    <Button
                        onClick={stopBroadcast}
                        variant="secondary"
                        className="bg-red-500 text-white hover:bg-red-600 h-10 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all animate-pulse"
                    >
                        Terminate Stream
                    </Button>
                )}
            </div>
        </div>
    );
}

function VolumeSlider({ value, onChange, color }) {
    return (
        <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[value]} max={1} step={0.01} onValueChange={(val) => onChange(val[0])}
        >
            <Slider.Track className="bg-zinc-800/50 relative grow rounded-full h-[4px]">
                <Slider.Range className={cn("absolute rounded-full h-full", color)} />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-zinc-950 rounded-full focus:outline-none hover:scale-125 transition-transform cursor-pointer shadow-xl" />
        </Slider.Root>
    );
}

function MixerChannel({ icon, label, active, onToggle, volume, onVolumeChange, color }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors border border-zinc-800/40", active ? color + " text-white" : "bg-zinc-900 text-zinc-600")}>
                        {React.cloneElement(icon, { className: "w-3.5 h-3.5" })}
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{label}</span>
                </div>
                {onToggle && (
                    <Button size="sm" variant="ghost"
                        className={cn(
                            "h-6 px-3 text-[9px] font-black uppercase tracking-tighter border border-zinc-800/60 rounded-lg",
                            active ? "bg-white/5 text-white border-white/20" : "text-zinc-600 hover:text-zinc-300"
                        )} onClick={onToggle}>
                        {active ? "LOCKED" : "MUTE"}
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <VolumeSlider value={volume} onChange={onVolumeChange} color={color} />
                </div>
                <span className="text-[9px] font-mono text-zinc-600 w-8 text-right font-black tracking-tighter">{Math.round(volume * 100)}%</span>
            </div>
        </div>
    );
}

function Music2({ className }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
}
