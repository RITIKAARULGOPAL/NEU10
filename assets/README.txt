NEU10 DECK — VIDEO ASSETS
==========================

INSTALLED 2026-08-05. All three verified playing in-browser.

    ai-harness.mp4   1920x1080  60fps  h264  29.9s  34 MB
                     -> screen 08, "AI-assisted design"
    point-cloud.mp4  1920x1080  60fps  h264   8.3s  26 MB
                     -> screen 09, "Start from the real site — not assumptions"
    costing-cd.mp4   1920x1080  60fps  h264  14.8s  18 MB
                     -> screen 10, "Documentation and quantities become an output"

Sources: Downloads/edited/edited/{aiHarness,pointCloud,costingModule}.mp4

To replace one, overwrite it keeping the same filename — no rebuild needed. If a
file is missing, that screen falls back to a labelled placeholder and the deck
still runs end to end.

All three are exactly 16:9, so they fill the frame with no letterboxing or crop.

AUTOPLAY: pressing P holds on each video screen until that video ends, so the
three add 53s to a hands-free run-through. The AI harness clip is the long one
at 30s.

SPECS
-----
Format      mp4, H.264 video, yuv420p
Ratio       16:9
Resolution  1920x1080 preferred (1280x720 fine)
Audio       none needed. The deck plays every video MUTED and never unmutes
            (browsers block unmuted autoplay, and it is safer in a room).
            Anything the video needs to say must be legible on screen.
Length      15-40s each is the sweet spot. In autoplay mode the deck waits for
            the video to finish before advancing, so a 3-minute clip will stall
            the run-through.
Loop        not needed — each plays once when its screen is reached.

If a file will not play, check the codec first:
    ffmpeg -i input.mov -c:v libx264 -pix_fmt yuv420p -an -crf 22 ai-harness.mp4
