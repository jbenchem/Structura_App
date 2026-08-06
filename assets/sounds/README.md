# Answer sounds

Two files are expected here:

- `correct.mp3` — short, soft, rising. Under 400ms.
- `incorrect.mp3` — short, neutral, NOT harsh. Under 400ms.

Keep the incorrect sound gentle. A punishing buzzer discourages the guessing
that early practice depends on, and students often work in public places.

Once the files are in place, follow the three steps in `src/sounds.js` to turn
playback on. The calls are already wired at the moment an answer is marked.
