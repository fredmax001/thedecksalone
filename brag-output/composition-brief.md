# Hyperframes Composition Brief: Deck Salone

## Objective
Create a 21-second cinematic launch video for Deck Salone — Sierra Leone's first dedicated DJ platform. The video should feel like a national broadcast highlight reel: confident, wide, gold on black.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1280×720
- Duration: 21 seconds

## Source Material
- Project root: `/Users/djfredmax/Desktop/Deck Salone/app/`
- Primary files read: `index.html`, `src/index.css`, `src/pages/About.tsx`, `src/pages/Home.tsx`
- Product name: **Deck Salone**
- Tagline / strongest claim: *"Sierra Leone's Official DJ Ecosystem"*
- Key UI or visual moment to recreate: Gold waveform bars pulsing on black; DJ profile cards with verified badge
- Copy that must appear verbatim:
  - `SALONE SOUND.`
  - `Finally, a home.`
  - `Verified DJs. Book them direct.`
  - `Stream any mix. Anytime.`
  - `National rankings. Fan-powered.`
  - `decksalone.com`

## Creative Direction
- Tone preset: `cinematic`
- Creative direction: "National broadcast energy — like a sports highlight reel for DJs"
- Interpretation: Wide, confident reveals. Big gold type on pure black. Slow crossfades (0.5s). Restrained motion — no spinning, no confetti. The product is the star.
- Angle: Sierra Leonean DJs have always had the culture. Now they have the platform. This video is a cinematic coronation of Salone sound.
- Hook: `SALONE SOUND.` slams in on black. `Finally, a home.` fades in below. Pure weight.
- Outro / punchline: Deck Salone gold logo. One bell SFX. `decksalone.com` in gold. Silence.
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals (floating shapes, random particles)
  - Redesigning the brand — use `#f4e059` gold + `#000000` black exactly

## Visual Identity
- Background: `#000000` (pure black)
- Text: `#F5F5F5` (headlines), `#A3A3A3` (subtitles)
- Accent: `#f4e059` (Deck Salone gold — use for key words, highlights, logo, waveform bars)
- Gold glow: `rgba(244, 224, 89, 0.15)` — ambient background warmth for card/waveform scenes
- Card surface: `#0d0d0d` / `#141414`
- Display font: Inter ExtraBold/Black, uppercase for main headlines
- Body font: Inter Medium / SemiBold
- Visual references from the project:
  - Gold-on-black wordmark logo
  - DJ profile cards with avatar, name, gold verified checkmark, star rating
  - Audio waveform bars (gold, pulsing)
  - Rankings leaderboard with position numbers, gold medal emoji, name, and bar

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. **The Hook** — 3s — `SALONE SOUND.` gold headline + `Finally, a home.` subtitle on black
2. **The Platform** — 4s — Deck Salone logo + gold divider + `STREAM · DISCOVER · BOOK` pills appearing one by one
3. **DJ Discovery** — 4s — 3 DJ profile cards stagger-slide up with avatar, name, verified badge, star rating
4. **Mix Hub / Stream** — 5s — Gold waveform bars pulsing + `Stream any mix. Anytime.` + bong SFX spike at t=2.5s
5. **Rankings** — 3s — Leaderboard ticks up: #1 → #5 with names and gold bars + click SFX per tick
6. **Outro / Logo** — 2s — Deck Salone logo at center + `decksalone.com` in gold + bell SFX

## Audio

- Audio role: cinematic support — confident, warm, slightly triumphant instrumental bed
- Audio arc: Opens quietly (hook silence into music), rises through DJ cards and Mix Hub, peaks at Rankings, fades to near-silence under logo bell
- Music: cinematic upbeat instrumental, ~95 BPM, warm bass — select from bundled assets or `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` if available
- Music treatment: fade in from 0.3s, full presence by scene 3, gentle 2s fade-out starting at scene 6 (~19s); let the bell SFX ring over near-silence
- Music cue guidance: detect at composition via `npx hyperframes beats`; aim for 1–2 strong cue locks — target the waveform bong moment (~11s) and the Rankings count-up start (~15s)
- Audio-reactive treatment: subtle; use music RMS/bass to make waveform bars glow intensity breathe and gold text elements have soft warmth on musical peaks — no waveform/equalizer visuals, no strobing
- Audio-coupled moments:
  - Scene 2 (each pill appears) → `impactSoft_medium_000.ogg` (soft thud × 3)
  - Scene 3 (each DJ card slides in) → `impactSoft_medium_001.ogg`, `_002.ogg` (staggered, 0.3s apart)
  - Scene 4 (waveform spike at 2.5s) → `bong_001.ogg` (single deep bell — dramatic)
  - Scene 5 (each rank tick) → `click_001.ogg` per tick, 5 total
  - Scene 6 (logo appears) → `impactBell_heavy_000.ogg` (final crown moment)
- SFX selection guidance: prioritize low/medium HF-risk picks from the approved library; the `bong_001` and `impactBell_heavy_000` are key; `impactSoft_medium` family for cards; `click_001` for rank ticks
- SFX analysis guidance: use `assets/sfx/sfx-analysis.md` if present to confirm HF risk ratings
- Exact SFX choice: Hyperframes should confirm filenames, timestamps, density, and volume based on implemented animation timing
- Audio files: copy chosen music + SFX into `brag-output/composition/assets/`

## Hyperframes Instructions

Load: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`.

This is `/brag`'s own workflow — do NOT enter `hyperframes` entry-point intent interview or generic launch-video workflow.

Requirements:
- Show at least one real UI element: DJ profile cards (verified badge, avatar, star rating) and waveform bars — these must appear as faithful recreations, not generic placeholders.
- Keep all text readable: every line holds long enough — minimum 0.8s settled for short labels, ~1.2s for sentences.
- Keep the video within 15-25s (target 21s; scene durations sum = 21s ✓).
- Include the planned music/SFX layer unless explicitly disabled.
- Treat audio notes as guidance — choose exact SFX after animation exists.
- Treat music cue metadata as optional timing hints; story and readability stay primary.
- Major reveals may snap to strong cues within ~0.15s (waveform spike, rankings count start).
- Use `impactBell_heavy_000.ogg` as the logo-slam SFX — this is the one non-negotiable SFX pick.
- When music is present, use Hyperframes audio-reactive workflow: extract per-frame audio data, modulate waveform bar glow intensity and gold text warmth via RMS/bass. No equalizer bars, no musical-note graphics.
- Run `npx hyperframes check` before rendering and fix every error it reports.
- Run `npx hyperframes render --quality high --output ../brag.mp4` for final delivery.
- Extract a poster frame at the settled waveform moment (~11s) using ffmpeg: `ffmpeg -ss 11 -i ../brag.mp4 -frames:v 1 -q:v 2 ../brag.jpg`
- Write share copy to `brag-output/share-copy.txt`.
