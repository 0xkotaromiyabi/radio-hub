#!/usr/bin/liquidsoap

# --- Settings ---
set("server.telnet", true)
set("server.telnet.bind_addr", "127.0.0.1")
set("server.telnet.port", 1234)
set("log.file", false)
set("log.stdout", true)
set("buffering.max", 2.0)
set("init.allow_root", true)

# --- Sources ---
# 1. Live DJ Input (Harbor)
live = input.harbor("/", port=8005, password="web3radio24")

# 2. Manual Request Queue (Interactive Play from Dashboard)
q = request.queue(id="manual_queue")

# 3. Playlists (Music, Jingles, Ads)
music = playlist(id="music", mode="random", reload_mode="watch", "/home/shoutcast/music")
jingles = playlist(id="jingles", mode="normal", reload_mode="watch", "/home/shoutcast/jingles")
ads = playlist(id="ads", mode="normal", reload_mode="watch", "/home/shoutcast/ads")

# --- Mixing & Transitions ---
def crossfade_custom(s)
  crossfade(duration=3.0, fade_in=2.0, fade_out=1.0, s)
end

# --- Playback Control (Pause/Resume) ---
# Boolean reference for play/pause control - declare EARLY
control_var = ref(true)

# Fallback chain: Live DJ > Manual Queue > Random Music
# Note: Jingles and Ads can be pushed to the manual queue or used in scheduling
# live is insensitive (interrupts immediately), while q/music are sensitive (finishes track)
radio = fallback(track_sensitive=true, [q, music])
radio = fallback(track_sensitive=false, [live, radio])
radio = crossfade_custom(radio)

# Wrap in switch to enable pause (blank when false)
radio = switch([
    ({not control_var()}, blank()),  # When paused (false), play silence
    ({control_var()}, radio)          # When playing (true), stream normal content
])

# --- Audio Processing ---
radio = normalize(radio)
radio = compress(radio, threshold=-15.0, ratio=3.0, gain=3.0)
radio = limit(radio, threshold=-1.0)

# --- Silence Detection ---
radio = skip_blank(threshold=-40.0, max_blank=10.0, radio)

# --- Outputs ---
radio = mksafe(radio)

# 1. Main High Quality (128kbps)
# Restored mandatory headers to avoid "Bad icy header string" errors in Shoutcast
output.shoutcast(%mp3(bitrate=128), 
    id="broadcast",
    host="127.0.0.1", port=8000, password="web3radio24",
    name="Web3radio",
    genre="Web3 Community",
    url="https://webthreeradio.xyz",
    radio)

# 2. Key Mobile Low Bandwidth (64kbps MP3)
# Disabled due to Liquidsoap/Shoutcast 2 protocol compatibility issues (bad answer/unsupported params)
# output.icecast(%mp3(bitrate=64), 
#     id="mobile",
#     host="127.0.0.1", port=8000, user="admin", password="changeme",
#     mount="/mobile",
#     name="Web3 Radio Mobile",
#     genre="Electronic",
#     url="https://shoutcast.webthreeradio.xyz/mobile",
#     description="Mobile Stream",
#     radio)

# 3. Local Recording (Archive)
# Define a function to generate timestamped filenames
def archive_name()
  "/home/shoutcast/recordings/archive_" ^ time.string("%Y-%m-%d-%H%M%S") ^ ".mp3"
end

output.file(%mp3(bitrate=192), 
    id="recording",
    start=false,
    archive_name,
    reopen_when={0m0s},
    fallible=true,
    radio)

# Print dummy variables to avoid unused warnings if they are not yet in the fallback chain
print(source.id(jingles))
print(source.id(ads))
