export default function PlaceholderPanel({ title, icon: Icon, color = "text-zinc-500" }) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className={`p-4 rounded-full bg-white/5 ${color}/20`}>
                <Icon className={`w-12 h-12 ${color}`} />
            </div>
            <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    This feature is currently in development and will be available in a future update.
                </p>
            </div>
        </div>
    );
}
