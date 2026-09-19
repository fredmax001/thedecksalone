# Brag Plan: Deck Salone

## What is this app?
Sierra Leone's first and only dedicated DJ platform — stream mixes, discover and book DJs, vote in live battles, and watch your favourites rise through a real national leaderboard.

## The angle
Sierra Leonean DJs have always had the culture. Now they have the platform. Deck Salone treats every DJ like a national icon: verified profile, ranked, bookable, streaming to fans everywhere. This video is a cinematic coronation of Salone sound — confident, bold, and unmistakably gold on black.

## Hook (first 2-3 seconds)
Big gold text drops in on pure black:
**"Salone Sound."**
Half a beat. Then below it in white:
**"Finally, a home."**
No animation fuss — just weight.

## Key moments (the middle)
- **DJ Cards animate in** — verified profiles sliding up, ratings glowing gold, booking badge flashing.
- **Waveform comes alive** — Mix Hub player, the audio waveform pulses in real-time, track title appears.
- **Rankings leaderboard counts up** — positions #1 → #5 tick up with gold medal, real DJ names. "Real-time. Fan-powered."

## Outro / punchline
The Deck Salone logo on black. Below it:
**"Discover. Stream. Book."**
One beat of silence, then:
**"decksalone.com"** in gold.

## User flow worth showing
1. **Discover** → DJ card grid, verified badge visible
2. **Stream** → Mix Hub waveform player, live playback
3. **Battle/Rank** → Rankings board, fans voting, positions moving

---

## Tone
- Preset: `cinematic`
- Creative direction: "National broadcast energy — like a sports highlight reel for DJs"
- Interpretation: Wide, confident reveals. Big type. Slow crossfades (0.5s) between scenes. Nothing rushed except the leaderboard counter. Restraint = respect.

## Format: landscape — 1280×720
## Duration: 21 seconds

---

## Visual Identity (from the project)
- Background: `#000000`
- Accent / Gold: `#f4e059`
- Text primary: `#F5F5F5`
- Text muted: `#A3A3A3`
- Card surface: `#0d0d0d` / `#141414`
- Display font: Inter (bold/heavy weight, uppercase for headlines)
- Body font: Inter (medium weight)
- Gold glow: `rgba(244, 224, 89, 0.15)` — use as ambient for gold elements
- Strongest visual element: Gold-on-black wordmark + glowing waveform bars

---

## Share copy (draft)
> Sierra Leone's DJs just got their own platform. Discover. Stream. Book. Battle. Welcome to Deck Salone. 🎧🇸🇱 → decksalone.com

---

## Audio direction
- Role: cinematic support — a confident, slightly triumphant bed that feels like a sporting moment, not a party
- Music: upbeat cinematic instrumental — warm bass, building energy, moderate BPM (~95)
- Music treatment: fade in from 0.3s, full presence through middle scenes, gentle fade-under logo at ~18s
- Music cue guidance: cue presets unavailable for custom track — detect at composition via `npx hyperframes beats`; aim 1–2 strong cue locks on the "waveform alive" reveal and the leaderboard count-up moment
- Audio-reactive treatment: subtle; use RMS/bass to make the waveform bars and gold text glow breathe — no visualiser graphics
- SFX posture: sparse / professional restraint
- Audio-coupled moments:
  - DJ cards slide in → soft card impact (impactSoft_medium)
  - Waveform activates → interface bong (bong_001.ogg) — deep bell, single hit
  - Rankings count-up → rapid click_001 ticks as numbers change
  - Logo slam → impactBell_heavy_000.ogg — the final crown
- Restraint rule: no more than 4 SFX total; never overlap music with more than 1 SFX at once

---

## Storyboard

### Scene 1 — The Hook — 3s
Full black canvas. Gold text SLAMS in, center:
`SALONE SOUND.`
(Inter ExtraBold, uppercase, ~80px, gold `#f4e059`)
0.4s later, white subtitle fades in below:
`Finally, a home.`
(Inter Medium, ~28px, `#F5F5F5`)
Sequential/interaction: none — text slams then holds
Audio intent: commanding silence-into-sound; music bed opens here
Audio-coupled idea: none — let the text land in near-silence before music swells
Music: cinematic upbeat, entering softly
Transition mood: slow crossfade (0.5s) → Scene 2

### Scene 2 — The Platform — 4s
Deck Salone logo + wordmark fades in center.
Below it, a gold divider line draws left-to-right.
Then three small gold-on-dark pills appear one by one (0.4s gap):
`STREAM` · `DISCOVER` · `BOOK`
Background: `#000000` with faint gold radial glow at top
Sequential/interaction: yes — pills appear one by one with soft card SFX
Audio intent: growing confidence — music is now full presence
Audio-coupled idea: each pill: impactSoft_medium_000 soft thud
Music: building presence, bass coming in
Transition mood: hard cut → Scene 3

### Scene 3 — DJ Discovery — 4s
Dark card grid slides up from bottom — 3 DJ profile cards visible.
Each shows: avatar, DJ name, verified badge (gold checkmark), star rating.
Overlay text top-left:
`Verified DJs.`
`Book them direct.`
(Inter SemiBold, white / gold)
Sequential/interaction: yes — cards stagger-slide in, 0.3s apart
Audio intent: rhythmic, professional confidence
Audio-coupled idea: staggered card arrivals → impactSoft_medium per card
Music: rhythm present, punchy
Transition mood: crossfade (0.4s) → Scene 4

### Scene 4 — Mix Hub / Stream — 5s
Full-width scene. Dark background (`#0d0d0d`).
A stylised waveform bar visualization pulsing — gold bars on black.
Track info appears: mix title in white, DJ name in gold.
Overlay text fades in above:
`Stream any mix.`
`Anytime.`
At t=2.5s: `interface bong` SFX rings — waveform bars spike gold on the hit.
Sequential/interaction: yes — waveform pulses build, then a single dramatic spike on bong SFX
Audio intent: the product is alive — music is in full groove
Audio-coupled idea: bong_001.ogg single hit at waveform spike; subtle RMS-reactive glow on bars
Music: peak energy
Transition mood: slow crossfade (0.5s) → Scene 5

### Scene 5 — Rankings — 3s
Dark panel. National leaderboard ticks up fast:
`#1 DJ Fred Max ████ 🥇`
`#2 DJ Salome ████`
`#3 DJ Vibes ████`
Numbers count up in rapid succession (0.2s gap per rank).
Overlay text right-aligned:
`National rankings.`
`Fan-powered.`
Sequential/interaction: yes — ranks tick in one by one with click SFX
Audio intent: sporting highlight energy — climax moment
Audio-coupled idea: click_001 per rank tick; music building toward finale
Music: near peak — preparing for outro
Transition mood: hard cut → Scene 6

### Scene 6 — Outro / Logo — 2s
Pure black. Deck Salone gold logo appears center, scaling gently from 95% → 100%.
`impactBell_heavy_000.ogg` rings — single hit.
Below it fades in:
`decksalone.com`
(Inter Medium, gold, small)
Sequential/interaction: none — logo holds confidently
Audio intent: final crown moment — bell rings, then music fades under
Audio-coupled idea: logo appear → impactBell_heavy_000 ring, music fades to near-silence
Music: fades under from ~1s in, near-silence by end
Transition mood: end

---
**Scene durations:** 3 + 4 + 4 + 5 + 3 + 2 = **21 seconds** ✓

**Music mood for this video:** cinematic upbeat — confident, warm, building
**Audio summary:** Music opens quietly under the hook, rises to full presence through DJ discovery and Mix Hub, peaks at Rankings, then a single bell SFX crowns the logo before music fades to silence.
