# Catalyst — test checklist

Work top to bottom. Each item says what to do and what you should see. If
something fails, note the item number — that pins it down immediately.

---

## 0. Setup

```bash
cd /workspaces/Catalyst_Beta/structura-app
npx expo install react-native-svg expo-haptics     # once only
cd engine && node test.mjs                         # expect 699 passed, 0 failed
cd .. && npx expo start --web --clear
```

- [ ] **0.1** `node test.mjs` prints **699 passed, 0 failed**
- [ ] **0.2** The app loads in the browser with no red error screen
- [ ] **0.3** Two tabs at the top: **Draw** and **Look up**
- [ ] **0.4** On the Draw tab you can see, without scrolling, all of: the ring
  strip, the bond-type row, the element row, and the bottom action row
  containing **+ Add C · Erase · Clean · Undo · Clear**

If 0.1 fails, stop — the engine files didn't copy across correctly.

---

## 1. Drawing basics (Draw tab)

- [ ] **1.0** On an **empty canvas**, tap anywhere → a first atom appears there.
  Tap another empty spot → a second atom, bonded to it
- [ ] **1.1** Clear, then press **+ Add C** four times → banner reads **butane**,
  `C4H10`
- [ ] **1.2** The chain runs left-to-right in a zigzag, not vertically
- [ ] **1.3** Tap an empty spot near the end → a new atom appears, bonded and
  angle-snapped
- [ ] **1.4** Drag an atom → it moves, and the name updates
- [ ] **1.5** **Undo** steps back **one action**. Place four atoms, press Undo
  once → three remain, not zero. Press again → two
- [ ] **1.5b** Drag an atom right across the canvas, press Undo once → it returns
  in a single step, not dozens
- [ ] **1.6** **Clear** empties the canvas

## 2. Bond selection — the recently fixed one

- [ ] **2.1** Build a 4-carbon chain. Tap the **middle of a bond** (not the
  atoms) → it becomes a **double bond**, name changes to a butene
- [ ] **2.2** Tap the same bond again → back to single
- [ ] **2.3** Pick **≡** from the bond row, then tap a bond → triple bond
- [ ] **2.4** Bonds are easy to hit. If you keep grabbing atoms instead, that's
  a fail

## 3. Selection behaviour — also recently fixed

- [ ] **3.0** **Joining two atoms:** tap one atom, then tap a second → a bond
  appears between them. This works whatever the element picker shows
- [ ] **3.0b** Build a 6-carbon chain, tap the **first** atom then the **last** →
  it closes into **cyclohexane**
- [ ] **3.0c** Pick the **=** bond type first, then tap two atoms → they join with
  a double bond
- [ ] **3.0d** Tap two atoms that are **already bonded** → the chosen bond type is
  applied to that bond; tap again to return it to single
- [ ] **3.1** Tap an atom → it highlights blue
- [ ] **3.2** Tap that **same atom** again → highlight clears
- [ ] **3.3** Select an atom, then tap a **bond** → selection clears automatically
- [ ] **3.4** Select an atom, then tap **far away** (more than about two bond
  lengths) → selection clears and no stray atom is placed
- [ ] **3.5** With **nothing** selected, tapping anywhere still places an atom —
  free placement is never blocked

## 4. Elements

- [ ] **4.1** Tap **O**, then tap an existing **carbon** → an oxygen is *attached*
  to it (the carbon stays a carbon)
- [ ] **4.2** This works with **nothing selected** — no need to select first
- [ ] **4.3** Tap **O** again → the element button deselects, back to carbon
- [ ] **4.4** **Long-press** an atom (about half a second) with **O** chosen →
  that atom *changes into* an oxygen, with a haptic bump the moment it fires.
  Short tap attaches, long press converts. Check this **on the web too** — it
  triggers while the button is held, not on release
- [ ] **4.5** With the picker on **C**, a short tap on an existing O just selects
  it — it is never silently converted
- [ ] **4.6** Tap **N**, tap a carbon → an amine name appears

## 5. Show all atoms

- [ ] **5.1** Press **Show all** → every atom shows a **single centred label**:
  `CH₃`, `CH₂`, `CH`, with the number as a **subscript**
- [ ] **5.2** The label sits **on** the atom, not floating beside it, and bonds
  stop cleanly at its edge rather than running through the text
- [ ] **5.3** Counts are right: a chain end reads `CH₃`, a middle carbon `CH₂`,
  a branch point `CH`, a four-bond carbon just `C`
- [ ] **5.4** Heteroatoms follow the same pattern: `OH`, `NH₂`
- [ ] **5.5** Press **Hide all** → back to clean skeletal lines

## 5a. Tool exclusivity

Only one drawing mode is ever active, and a tool stays armed until you change it.

- [ ] **5a.1** Turn on **Erase**, then tap a **ring** or the **chain** tool →
  erase switches off
- [ ] **5a.2** Turn on **Erase**, then tap an **element** or a **bond type** →
  erase switches off
- [ ] **5a.3** Arm a **ring** → the bond-type row clears (no type highlighted)
- [ ] **5a.4** Then tap a **bond type** → the ring disarms
- [ ] **5a.5** Arm the **chain** tool → the ring disarms, and vice versa
- [ ] **5a.6** Change the **element** → any selected atom is deselected
- [ ] **5a.7** **Tools stay armed after use:** place a ring, then click again →
  a second ring is placed without re-arming. Same for the chain tool
- [ ] **5a.8** **deselect** on the canvas is the way to stand everything down

## 5b. Chain tool

- [ ] **5b.1** The first button in the ring strip is a **zigzag icon** — tap it
  to arm the chain tool
- [ ] **5b.2** **Drag across empty canvas** → a faint blue preview follows your
  finger, one carbon per bond-length dragged
- [ ] **5b.3** Release → the chain is committed. A short drag gives propane, a
  long one gives decane
- [ ] **5b.4** **Drag starting from an existing atom** → the chain extends from
  it rather than starting fresh
- [ ] **5b.5** Drag at any angle → the zigzag still snaps to the 30° lattice
- [ ] **5b.6** The tool **stays armed** so you can draw several chains; use
  **deselect** to stand it down

## 6. Ring templates

The buttons now show the **actual ring shape** — triangle, square, pentagon and
hexagon, with benzene drawn as a hexagon with an inner circle.

- [ ] **6.0** The five ring buttons are drawn shapes, not words

Rings work like the element buttons: **tap the template to arm it, then
click the canvas to place it.** The armed template turns blue.

- [ ] **6.0** The five ring buttons are drawn shapes, not words; benzene has the
  inner circle
- [ ] **6.1** Tap the **benzene** icon → it turns blue; click empty canvas →
  **benzene** appears where you clicked
- [ ] **6.2** The template **stays armed**, so several rings can be placed in a row
- [ ] **6.3** Arm **6-ring**, click empty space → **cyclohexane**

**Click an atom → the ring attaches**

- [ ] **6.4** Build a 3-carbon chain. Arm **benzene**, click the end carbon →
  **propylbenzene**, joined by a new bond
- [ ] **6.5** On a benzene, arm **benzene** and click a ring carbon →
  **phenylbenzene** (biphenyl)

**Click a bond → the ring fuses**

- [ ] **6.6** Draw benzene, arm **benzene**, click one of its **bonds** →
  **naphthalene**
- [ ] **6.7** Repeat on a bond of the far ring → **anthracene**
- [ ] **6.8** Same with **6-ring** twice → **bicyclo[4.4.0]decane** (decalin)

**Long-click an atom → spiro**

- [ ] **6.9** Draw cyclohexane, arm **5-ring**, **long-click** a ring carbon →
  **spiro[4.5]decane**

- [ ] **6.10** Clear, place benzene, select an atom, tap **O** → **phenol**

## 7. Stereochemistry

- [ ] **7.1** Build `butan-2-ol` (4 carbons, O on the second)
- [ ] **7.2** Pick **▲ wedge**, tap the C–O bond → name gains **(2R)** or **(2S)**
- [ ] **7.3** Pick **⊐ dash**, tap it again → the descriptor **flips** to the other
- [ ] **7.4** The wedge draws as a solid triangle, the dash as stacked lines
- [ ] **7.4b** A **double bond** draws as the ordinary bond line **plus a second
  line beside it**, not two lines straddling the axis
- [ ] **7.4c** In a **ring**, the second line sits **inside** the ring. Check
  `benzene`, `naphthalene` and `pyridine` — every inner line should face the
  ring centre
- [ ] **7.4d** In a **chain**, it goes on whichever side has more room. Check
  `but-2-ene` and `ethanoic acid`
- [ ] **7.5** In **Look up**, `(2R)-bicyclo[2.2.1]heptan-2-ol` and its `(2S)`
  partner both draw, with a **visible wedge or dash** on the ring
- [ ] **7.6** `cocaine` draws with **two stereo bonds** on the ring, and the note
  explains which centres they set
- [ ] **7.7** `(2S)-naphthalen-2-ol` is **refused** — an aromatic carbon is not a
  stereocentre

## 8. Zoom, pan, clean

- [ ] **8.1** Pinch → the drawing zooms **about the point between your fingers**.
  Put two fingers on a specific atom and pinch: that atom should stay under
  them, not drift up the screen
- [ ] **8.2** Drag empty space → the view pans
- [ ] **8.3** Zoom controls now sit **on the canvas itself**: **+**, **–** and
  **fit** at the top right; **reset view** remains in the ring strip
- [ ] **8.3b** Top left of the canvas: **deselect** (turns blue whenever
  something is armed) and **hide name / show name**
- [ ] **8.3c** **deselect** clears a selected atom, an armed bond, an armed ring
  template and the chain tool in one press
- [ ] **8.3d** **hide name** removes the naming card so the canvas gets the full
  height; **show name** brings it back
- [ ] **8.4** Drag atoms into a mess, press **Clean** → tidy again, parent chain
  horizontal, even bond lengths
- [ ] **8.4b** After **Clean** the structure is **centred in the canvas** and
  scaled to fit, whatever state the view was in beforehand
- [ ] **8.4b1** **No carbon is ever drawn with its two bonds in a straight
  line.** Build `butylcyclobutane` — a ring with a chain on it — and Clean. The
  chain must bend where it leaves the ring, never continue straight through.
  Same for `propylcyclohexane` and `propylbenzene`
- [ ] **8.4b2** **Bond angles reset to the standard lattice.** Drag atoms to
  odd angles, then Clean — every bond outside a ring should come back to a
  multiple of 45°, with the parent chain running as an even horizontal zigzag
- [ ] **8.4b3** This holds for cis double bonds too: `oleic acid` used to keep
  an odd angle where its cis bond was corrected. Check it after Clean
- [ ] **8.4c2** **A long chain with several rings on it lays out flat.** In
  **Look up** or by drawing, build a long chain carrying three or more phenyl
  groups, then **Clean** — the chain should run horizontally with the rings
  fanned above and below it, no line crossing a ring
- [ ] **8.4c3** Bridged and fused cages (`bicyclo[2.2.1]heptane`, `cocaine`,
  `caffeine`) are **left as they are** by Clean and simply recentred — their
  geometry is already sound and re-laying them would make it worse
- [ ] **8.4c** **No ring ever lands inside another.** Check
  `(4-methyldecan-3-yl)cyclobutane`, `phenylbenzene` and
  `2,2-dimethyl-3-phenylcyclopropan-1-ol` — each ring should sit clear of the
  others with visible space between them
- [ ] **8.5** Do 8.4 on a **(2R)** molecule → still **(2R)** afterwards, not (2S)

## 9. Branch geometry — the fold-over fix

- [ ] **9.1** In **Look up**, enter `5,7-diethyl-3,4,7-trimethyldecane`
- [ ] **9.2** **No lines cross.** Carbons with two branches send one straight up
  and one straight down
- [ ] **9.3** Try `5,5-diethyldecane` and `2,2,4,4,6,8,8-heptamethylnonane` —
  same, no crossings

## 10. Practice mode

- [ ] **10.1** Tap **practice** at the end of the ring strip → a target name
  appears and the canvas clears
- [ ] **10.2** Draw something wrong, press **Check** → feedback naming the *kind*
  of error (wrong position, wrong group, wrong skeleton…)
- [ ] **10.3** Each wrong attempt reveals one more **hint**
- [ ] **10.4** Draw it correctly → **"Correct."** on a green card
- [ ] **10.5** Draw it correctly but rotated/offset → still correct
- [ ] **10.6** **Exit practice** returns to live naming

## 10b. Tap the name to highlight the structure

Works on both tabs.

- [ ] **10b.1** In **Look up**, enter `2,2-dimethylbutan-1-ol`. The name appears as
  separate underlined pieces: `2,2-dimethyl` · `but` · `an-1-ol`
- [ ] **10b.2** Tap **`2,2-dimethyl`** → only the two methyl carbons light up blue,
  and a line explains *"two methyl groups on carbon 2"*
- [ ] **10b.3** Tap **`but`** → the four-carbon parent chain lights up instead
- [ ] **10b.4** Tap **`an-1-ol`** → the C–O of the alcohol lights up
- [ ] **10b.5** Tap the same piece again → the highlight clears
- [ ] **10b.6** Try `3-methylhex-2-ene` → tapping `-2-ene` lights only the
  double-bonded pair
- [ ] **10b.6b** **A complex substituent breaks apart.** Enter
  `5-(1-fluoroethyl)decane` — the bracketed branch splits into `1-fluoro` and
  `ethyl` as separate tappable pieces, highlighting 1 atom and 2 atoms
  respectively, not the whole branch at once
- [ ] **10b.6c** Same for `2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol`:
  `3-propan-2-yl` and `phenyl` highlight separately
- [ ] **10b.7** On the **Draw** tab, tapping parts of the **name** highlights the
  canvas the same way
- [ ] **10b.7b** On the **Draw** tab, tapping an **atom** selects it for drawing —
  it does **not** trigger an explanation. Reverse lookup (structure → name) is
  confined to the **Look up** tab, where nothing is being edited
- [ ] **10b.8** Reasoning has moved to a **show reasoning** button on the banner,
  so tapping the name no longer expands the card
- [ ] **10b.9** Whenever the chosen part **mentions positions**, small blue
  **numbers appear on the skeleton**. Try `2,2,4,4,6,8,8-heptamethylnonane` and
  tap the prefix — the nonane chain should number 1 to 9
- [ ] **10b.9b** Tap `spiro[4.5]` on **spiro[4.5]decane** → it explains that the
  two rings share one atom and what 4 and 5 count
- [ ] **10b.9c** Same for `bicyclo[2.2.1]` on **bicyclo[2.2.1]heptane**
- [ ] **10b.10** `(2Z)-but-2-ene` → tapping `(2Z)-` explains *zusammen*, the same
  side, and which double bond it refers to
- [ ] **10b.11** `(2R)-butan-2-ol` → tapping `(2R)-` explains *rectus*, and gives
  the rule: rank the four groups, point the lowest away, 1→2→3 runs clockwise
- [ ] **10b.11b** `(1R,2S)-2-methylcyclohexan-1-ol` → the descriptor splits into
  **`1R`** and **`2S`** as separate tappable pieces. Tapping `1R` highlights
  carbon 1 and its neighbours and explains that centre alone; `2S` does the
  same for carbon 2
- [ ] **10b.11f** `(2E,4Z)-hexa-2,4-diene` → `2E` and `4Z` tap separately, each
  highlighting its own double bond and the groups whose priority decides it
- [ ] **10b.11c** **E/Z ↔ cis/trans toggle** sits beside the tabs. With
  `(2Z)-but-2-ene` showing, switch it → the name becomes **cis-but-2-ene**, and
  the explanation says why cis is allowed here (each alkene carbon carries one
  hydrogen) and gives the E/Z equivalent
- [ ] **10b.11d** Switch back → `(2Z)-but-2-ene`, whose explanation now notes it
  *may also* be written cis
- [ ] **10b.11e** With `2-methylbut-2-ene` the toggle changes nothing — there is
  no descriptor, because cis/trans has no meaning on that alkene
- [ ] **10b.12** **Reverse direction:** in **Look up**, tap an **atom in the
  structure** → the piece of the name that owns it highlights, with its
  explanation
- [ ] **10b.12b** Tap a **bond** in the structure → for `(1Z)-1-bromo-2-methylbut-1-ene`,
  tapping the double bond selects `-1-ene`, and tapping `(1Z)-` explains
  *zusammen* and which bond it refers to
- [ ] **10b.13** The **explain on/off** button sits beside the tabs. Switch it
  **off** → the name stops being tappable, no numbers, no highlighting. This is
  the switch to hold in question mode

## 11. Save

Practice and Save now live at the right-hand end of the **ring strip**, not in
their own row — scroll that strip sideways to reach them.

- [ ] **11.1** Draw something, tap **save** in the ring strip → a chip appears below
- [ ] **11.2** Clear, then tap the chip → the drawing comes back
- [ ] **11.3** Long-press the chip → it disappears
- [ ] **11.4** *Known limitation:* saves do **not** survive a page refresh

---

## 11b. Synonyms in Look up

Under the structure, an **"also accepted"** strip lists the other names the
molecule answers to. Green chips are trivial or common names, blue ones are
other ways of writing the systematic name. Tapping a chip looks it up.

- [ ] **11b.1** `ethanoic acid` → offers **acetic acid**
- [ ] **11b.2** `octadecanoic acid` → **stearic acid**
- [ ] **11b.3** `2,4,6-trinitrophenol` → **picric acid**
- [ ] **11b.4** `methylbenzene` → **toluene**
- [ ] **11b.5** `1,3,7-trimethylpurine-2,6-dione` → **caffeine**, theine,
  1,3,7-trimethylxanthine
- [ ] **11b.6** `butan-2-ol` → **2-butanol** (the older locant style)
- [ ] **11b.7** `(2Z)-but-2-ene` → **cis-but-2-ene** and **(Z)-but-2-ene**
- [ ] **11b.8** Tapping a chip loads that name, and the strip then offers the
  original back
- [ ] **11b.9** `3-ethylhexane` offers **nothing** — no synonyms are invented
  where none exist

## 12. Look up tab — names to structures

Type each and check the structure and formula.

**Should work**

- [ ] **12.1** `ethyl ethanoate` — C4H8O2
- [ ] **12.2** `benzoic acid` — C7H6O2, the two oxygens visible and separated
- [ ] **12.3** `cis-but-2-ene` → **(2Z)-but-2-ene**, note explains cis = Z
- [ ] **12.4** `naphthalene` — two fused rings, C10H8
- [ ] **12.5** `pyridine` — C5H5N
- [ ] **12.5b** Small rings: `thietane` (C3H6S), `oxetane`, `azetidine`,
  `aziridine`, `oxirane`, `thiirane`, `thiane`
- [ ] **12.5c** Draw a four-membered ring, long-press one atom with **S** chosen →
  it becomes **thietane**
- [ ] **12.6** `indole`, `quinoline` — fused N-rings
- [ ] **12.7** `caffeine` — **C8H10N4O2**, 194.19
- [ ] **12.8** `cocaine` — **C17H21NO4**, 303.36
- [ ] **12.9** `8-azabicyclo[3.2.1]octane` — C7H13N
- [ ] **12.9f** **Three or more saturated fused rings now name.** On the Draw
  tab, stamp three six-rings fused in a line → **tricyclo[8.4.0.0³ˌ⁸]tetradecane**
  (C14H24). Fuse them at an angle instead → **tricyclo[8.4.0.0²ˌ⁷]tetradecane**
- [ ] **12.9g** Make the same skeletons aromatic → **anthracene** and
  **phenanthrene**; the retained names still take precedence
- [ ] **12.9b** Draw `bicyclo[2.2.1]heptane`, tap a bond between two non-bridgehead
  carbons to make it double → **bicyclo[2.2.1]hept-2-ene**
- [ ] **12.9e** The hand-built molecules are tappable too. `caffeine` splits into
  three pieces: `1,3,7-trimethyl` (the three N-methyls), `purine` (the fused
  ring system), and `-2,6-dione` (the two carbonyls). `aspirin`, `cocaine` and
  `tropane` likewise
- [ ] **12.9c** `8-azabicyclo[3.2.1]octane` is now **tappable**: `8-aza` explains
  that a ring atom is replaced by nitrogen, `bicyclo[3.2.1]` explains the bridges,
  `octane` explains the atom count
- [ ] **12.9d** Older and alternative ring names resolve: `2,3-benzopyrrole` →
  **indole**, `2,3-benzofuran` → **benzofuran**, `1-benzazine` → **quinoline**,
  `1,3-diazine` → **pyrimidine**, `azabenzene` → **pyridine**
- [ ] **12.10** `(1Z)-1-bromo-5-(1-fluoroethyl)-8-(iodomethyl)-2,9,10-trimethylundeca-1,9-diene`
  — C17H29BrFI, no crossing bonds
- [ ] **12.11** `stearic acid`, `glucose`, `p-xylene`, `biphenyl`

**Loosely written — should be accepted with an amber note**

- [ ] **12.12** `2-decanol` → decan-2-ol
- [ ] **12.13** `butanol` → butan-1-ol, *"No position was given…"*
- [ ] **12.14** `pentanone` → pentan-2-one
- [ ] **12.15** `hexanamine` → hexan-1-amine

**Mis-numbered — accepted, but the fault named**

The structure is built either way; an amber panel says what went wrong and
offers the corrected name.

- [ ] **12.15a** `3-methylbutane` → builds **2-methylbutane**, flagged
  **check the numbering**: right groups, numbered from the wrong end
- [ ] **12.15b** `4-methylpentane` → **2-methylpentane**, same flag
- [ ] **12.15c** `3-methylbutan-4-ol` → **2-methylbutan-1-ol**
- [ ] **12.15d** `1-methylbutane` → **pentane**, flagged **check the parent
  chain** — the methyl was part of the longest chain all along
- [ ] **12.15e** `2-ethylbutane` → **3-methylpentane**, same flag
- [ ] **12.15f** Each flagged panel has a **"Use ..."** button that loads the
  corrected name
- [ ] **12.15g** `2-butanol` and `acetic acid` are **not** flagged — an older or
  trivial spelling is not a mistake, so they get the plain note
- [ ] **12.15h** `2-methylbutane` gets **no note at all**

**Wrong — should explain, not just refuse**

- [ ] **12.16** `2-dimethylbutane` → **red card**, structure still drawn,
  **"Use 2,2-dimethylbutane"** button works
- [ ] **12.17** `1-nitrophenol` → impossible structure drawn, bad atom circled red
- [ ] **12.18** `butan-1-one` → refused, explains it would be an aldehyde
- [ ] **12.19** `steric acid` → *"Did you mean stearic acid?"*
- [ ] **12.20** `5-methylindole` → refused with a reason (not yet supported)

---

## 13. Mobile

Open the forwarded 8081 URL on a phone (PORTS tab → port 8081 → visibility
**Public**).

- [ ] **13.1** Everything fits; no horizontal scrolling
- [ ] **13.2** Bottom buttons reachable one-handed
- [ ] **13.3** Bonds tappable with a finger (repeat §2)
- [ ] **13.4** Pinch zoom works with two fingers
- [ ] **13.5** Rotate to landscape → layout widens sensibly

---

## Known limitations — not bugs

- Saves are lost on refresh (no persistent storage yet)
- Cocaine's two ring configurations are drawn; its bridgehead centres are fixed
  by the frame rather than set independently
- Substituted fused heterocycles (`5-methylindole`) refuse by design
- No charges/ions, no multi-select, no SMILES
- Haptics do nothing in a browser — phone only
