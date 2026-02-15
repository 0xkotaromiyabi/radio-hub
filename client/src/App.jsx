import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Radio,
    ListMusic,
    CalendarDays,
    BarChart3,
    MessageSquare,
    Archive,
    Activity,
    Settings,
    Menu,
    ChevronLeft,
    Search,
    Plus,
    Bell,
    Cpu,
    Monitor,
    Globe,
    Music2,
    Wallet
} from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { ScrollArea } from './components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Separator } from './components/ui/separator';
import { Badge } from './components/ui/badge';

// Components
import BroadcastControls from './components/radio/BroadcastControls';
import PlaylistLibrary from './components/radio/PlaylistLibrary';
import SystemHealth from './components/radio/SystemHealth';
import PlaceholderPanel from './components/radio/PlaceholderPanel';
import MetadataEditor from './components/radio/MetadataEditor';
import EventScheduler from './components/radio/EventScheduler';
import ArchivesPanel from './components/radio/ArchivesPanel';
import SolanaPanel from './components/radio/SolanaPanel';
import WalletGate from './components/radio/WalletGate';

// Reown AppKit Configuration
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaTestnet, solanaDevnet } from "@reown/appkit/networks";

// 0. Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
    wallets: [] // Standard wallets are auto-detected
});

// 1. Get projectId
const projectId = "436eaacb5d6ac40e778902daf08eb741";

// 2. Create a metadata object
const metadata = {
    name: "Web3 Radio OS",
    description: "Next-Gen Decentralized Radio Station Dashboard",
    url: "https://radio-cms.webthreeradio.xyz",
    icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Create modal
createAppKit({
    adapters: [solanaWeb3JsAdapter],
    networks: [solana, solanaTestnet, solanaDevnet],
    metadata: metadata,
    projectId,
    features: {
        analytics: true,
    },
});

const API_BASE = '/api';

// ... imports ...
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Circle, Mic, Square } from 'lucide-react'; // Add icons

// ... existing setup ...

export default function App() {
    const { open } = useAppKit();
    const { address, isConnected } = useAppKitAccount();

    // ... existing state ...
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [status, setStatus] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFolder, setActiveFolder] = useState('music');
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    // ... useEffects ...

    // Check recording status on load and interval
    useEffect(() => {
        checkRecordingStatus();
        fetchStatus();
        fetchFiles(activeFolder);

        // Combined polling interval (15s)
        const interval = setInterval(() => {
            checkRecordingStatus();
            fetchStatus();
            fetchFiles(activeFolder); // Poll files too
        }, 15000);

        return () => clearInterval(interval);
    }, [activeFolder]);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/status`);
            setStatus(res.data);
        } catch (err) {
            console.error('Failed to fetch status');
        }
    };

    const fetchFiles = async (folder = 'music') => {
        try {
            const res = await axios.get(`${API_BASE}/files/${folder}`);
            setFiles(res.data);
        } catch (err) {
            console.error('Failed to fetch files');
        }
    };

    const checkRecordingStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/recording/status`);
            setIsRecording(res.data.status === 'recording');
        } catch (e) { console.error('Rec status check failed'); }
    }

    const toggleRecording = async () => {
        try {
            if (isRecording) {
                if (!window.confirm("Stop recording?")) return;
                await axios.post(`${API_BASE}/recording/stop`);
            } else {
                await axios.post(`${API_BASE}/recording/start`);
            }
            // Wait a sec for liquidsoap to update
            setTimeout(checkRecordingStatus, 1000);
            setIsRecording(!isRecording);
        } catch (e) {
            alert('Failed to toggle recording');
        }
    };

    const handleSkip = async () => {
        try {
            await axios.post(`${API_BASE}/control/skip`);
            fetchStatus();
        } catch (err) {
            alert('Failed to skip');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            await axios.post(`${API_BASE}/upload/${activeFolder}`, formData);
            fetchFiles(activeFolder);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (name) => {
        if (!window.confirm(`Delete ${name} from ${activeFolder}?`)) return;
        try {
            await axios.delete(`${API_BASE}/files/${activeFolder}/${name}`);
            fetchFiles(activeFolder);
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleMetadataUpdate = async (title, artist) => {
        try {
            await axios.post(`${API_BASE}/control/metadata`, { title, artist });
            fetchStatus();
        } catch (err) {
            alert('Failed to update metadata');
        }
    };

    const handlePush = async (name) => {
        try {
            await axios.post(`${API_BASE}/control/push`, { folder: activeFolder, name });
            fetchStatus();
        } catch (err) {
            alert('Push failed');
        }
    };

    const menuItems = [
        {
            group: 'Overview', items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ]
        },
        {
            group: 'Control', items: [
                { id: 'on-air', label: 'Control Room', icon: Radio },
                { id: 'playlist', label: 'Music Library', icon: ListMusic },
                { id: 'schedule', label: 'Scheduling', icon: CalendarDays },
            ]
        },
        {
            group: 'Engagement', items: [
                { id: 'chat', label: 'Live Interaction', icon: MessageSquare },
                { id: 'archive', label: 'Archives', icon: Archive },
            ]
        },
        {
            group: 'System', items: [
                { id: 'system', label: 'Infrastructure', icon: Activity },
                { id: 'settings', label: 'Station Settings', icon: Settings },
            ]
        },
    ];

    return (
        <WalletGate>
            {/* SIDEBAR */}
            <aside className={cn(
                "fixed left-0 top-0 h-screen bg-zinc-950/95 border-r border-zinc-800/40 backdrop-blur-xl transition-all z-50 flex flex-col",
                sidebarOpen ? "w-64" : "w-20"
            )}>
                {/* Top Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/40">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Radio className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-black text-sm tracking-tight">Web3Radio</span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-8 w-8 hover:bg-zinc-800/60"
                    >
                        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-6">
                        {menuItems.map((group) => (
                            <div key={group.group}>
                                {sidebarOpen && (
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2 px-3">
                                        {group.group}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                                                activeTab === item.id
                                                    ? "bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-500/5"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "w-4 h-4 shrink-0",
                                                activeTab === item.id ? "text-purple-400" : "text-zinc-600 group-hover:text-zinc-400"
                                            )} />
                                            {sidebarOpen && (
                                                <span className="text-xs font-bold truncate">{item.label}</span>
                                            )}
                                            {activeTab === item.id && (
                                                <div className="absolute left-0 w-1 h-8 bg-purple-500 rounded-r-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 border-t border-zinc-800/40">
                    <div className={cn(
                        "flex items-center gap-3 p-2 rounded-xl bg-zinc-900/40",
                        !sidebarOpen && "justify-center"
                    )}>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://i.pravatar.cc/150?img=3" />
                            <AvatarFallback>DJ</AvatarFallback>
                        </Avatar>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">DJ Kotaro</p>
                                <p className="text-[9px] text-zinc-600 font-medium">Station Admin</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={cn(
                "flex-1 flex flex-col h-screen overflow-hidden bg-[#050505] transition-all",
                sidebarOpen ? "ml-64" : "ml-20"
            )}>
                {/* TOP BAR */}
                <header className="h-16 border-b border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl flex items-center justify-between px-8 z-10 shrink-0">
                    <div className="flex items-center gap-6">
                        {/* ... status indicator ... */}
                        <div className="relative flex items-center gap-4">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                status ? "bg-red-500 animate-pulse ring-4 ring-red-500/20" : "bg-zinc-700"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black tracking-[0.2em] uppercase",
                                status ? "text-red-500" : "text-zinc-500"
                            )}>
                                {status ? "Station Live" : "Offline"}
                            </span>
                        </div>

                        <Separator orientation="vertical" className="h-4" />

                        {/* Recording Control */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleRecording}
                            className={cn(
                                "flex items-center gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all font-mono text-[10px] uppercase tracking-wider h-8",
                                isRecording ? "text-red-500 border-red-900/30 bg-red-950/10 hover:bg-red-900/20" : "text-zinc-400"
                            )}
                        >
                            {isRecording ? <Square className="w-3 h-3 fill-current" /> : <Circle className="w-3 h-3 fill-current" />}
                            {isRecording ? "REC ON" : "REC OFF"}
                        </Button>

                        <Separator orientation="vertical" className="h-4 hidden lg:block" />

                        {/* ... search ... */}
                        <div className="hidden lg:flex items-center bg-zinc-900/40 rounded-full px-3 py-1.5 border border-zinc-800/60 w-64 group focus-within:border-purple-500/50 transition-all">
                            <Search className="w-3.5 h-3.5 text-zinc-500 mr-2 group-hover:text-zinc-300" />
                            <input
                                type="text"
                                placeholder="Search Command..."
                                className="bg-transparent border-none text-[10px] w-full focus:outline-none placeholder:text-zinc-600 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* ... stats ... */}
                        <Separator orientation="vertical" className="h-4 hidden lg:block" />

                        {/* Wallet Button */}
                        <Button
                            onClick={() => open()}
                            className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-bold text-xs shadow-lg shadow-purple-900/10 gap-2"
                        >
                            <Wallet className="w-4 h-4 text-indigo-400" />
                            {isConnected ? (
                                <span>{address.slice(0, 4)}...{address.slice(-4)}</span>
                            ) : (
                                <span>Connect Wallet</span>
                            )}
                        </Button>
                    </div>
                </header>

                {/* CONTENT AREA */}
                <ScrollArea className="flex-1 bg-gradient-to-br from-[#0c0c0c] to-black">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="p-8 lg:p-10 max-w-[1600px] mx-auto w-full"
                        >
                            {/* Tab Header */}
                            <div className="mb-10">
                                <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-4">
                                    {menuItems.flatMap(g => g.items).find(i => i.id === activeTab)?.label}
                                    {activeTab === 'dashboard' && <Badge variant="secondary" className="text-[10px] font-black h-fit mt-1">v2.5.0-advanced</Badge>}
                                </h1>
                                <p className="text-zinc-500 text-sm font-medium">
                                    Welcome back, <span className="text-purple-400 font-mono">{address}</span>, to web3radio Studio-Hub
                                </p>
                            </div>

                            {/* DASHBOARD GRID CONTENT */}
                            {activeTab === 'dashboard' && (
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20">
                                    {/* ROW 1: Controls & Health */}
                                    <div className="xl:col-span-8 space-y-6">
                                        <div className="h-[380px]">
                                            <BroadcastControls radioStatus={status} onSkip={handleSkip} />
                                        </div>
                                    </div>

                                    <div className="xl:col-span-4 space-y-6">
                                        <div className="h-[380px]">
                                            <SystemHealth />
                                        </div>
                                    </div>

                                    {/* ROW 2: FULL WIDTH LIBRARY */}
                                    <div className="xl:col-span-12 h-[600px]">
                                        <PlaylistLibrary
                                            files={files}
                                            onUpload={handleUpload}
                                            onDelete={handleDelete}
                                            onPush={handlePush}
                                            radioStatus={status}
                                            uploading={uploading}
                                            activeFolder={activeFolder}
                                            onFolderChange={setActiveFolder}
                                        />
                                    </div>

                                    {/* ROW 3: Scheduler & Metadata */}
                                    <div className="xl:col-span-8 h-[500px]">
                                        <EventScheduler />
                                    </div>
                                    <div className="xl:col-span-4 h-[500px]">
                                        <MetadataEditor onSubmit={handleMetadataUpdate} />
                                    </div>
                                </div>
                            )}

                            {/* INDIVIDUAL FULLSCREEN TABS */}
                            {activeTab === 'on-air' && <div className="h-[700px]"><BroadcastControls radioStatus={status} onSkip={handleSkip} /></div>}
                            {activeTab === 'playlist' && (
                                <div className="h-[750px]">
                                    <PlaylistLibrary
                                        files={files}
                                        onUpload={handleUpload}
                                        onDelete={handleDelete}
                                        onPush={handlePush}
                                        radioStatus={status}
                                        uploading={uploading}
                                        activeFolder={activeFolder}
                                        onFolderChange={setActiveFolder}
                                    />
                                </div>
                            )}
                            {activeTab === 'system' && <div className="h-[700px]"><SystemHealth /></div>}
                            {activeTab === 'archive' && <div className="h-[700px]"><ArchivesPanel /></div>}
                            {activeTab !== 'dashboard' && activeTab !== 'on-air' && activeTab !== 'playlist' && activeTab !== 'system' && activeTab !== 'archive' && (
                                <div className="h-[600px]">
                                    <PlaceholderPanel
                                        title={menuItems.flatMap(g => g.items).find(i => i.id === activeTab)?.label}
                                        icon={menuItems.flatMap(g => g.items).find(i => i.id === activeTab)?.icon || Activity}
                                    />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </main>
        </WalletGate >
    );
}
