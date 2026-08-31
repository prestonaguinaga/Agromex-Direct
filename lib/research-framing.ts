/**
 * Full framing-math dataset backing the /guide page — GENERATED from the
 * framing-math research run (adversarially verified). Simplified
 * prescriptive figures for estimating, not engineering.
 */

export interface FramingRule {
  topic: string;
  rule: string;
  formula?: string;
  example: string;
  notes?: string;
}

export const FRAMING_GUIDE: { name: string; blurb: string; rules: FramingRule[] }[] = [
  {
    name: "Wall framing",
    blurb: "Stud counts, corners, openings, plates, sheathing — and the worked 20×20 lumber order.",
    rules: [
  {
    "topic": "Field stud count, 16\" OC",
    "rule": "Studs in the run of one wall = ceiling(wall length in inches / 16) + 1. The +1 is the far-end stud: a stud lands at BOTH ends of the wall, not just at the start of each bay. Always round the division up to the next whole stud before adding 1. Never deduct studs for door/window openings at this stage (see Cripple rule).",
    "formula": "studs = ceil(wallLengthFt * 12 / 16) + 1 (equivalently ~0.75 studs per linear foot + 1 end stud)",
    "example": "20 ft wall @ 16\" OC: ceil(240/16) + 1 = 15 + 1 = 16 studs. A 13 ft wall: ceil(156/16) + 1 = 10 + 1 = 11 studs.",
    "notes": "Standard formula used by every framing calculator (Inch Calculator, Omni, CalcSummit, Billdr). Sources: https://www.inchcalculator.com/framing-calculator/ , https://www.omnicalculator.com/construction/framing"
  },
  {
    "topic": "Field stud count, 24\" OC",
    "rule": "Same formula with 24\" spacing: ceiling(wall length in inches / 24) + 1, i.e. 0.5 studs per linear foot plus the end stud. IRC Table R602.3(5) permits 2x4 studs at 24\" OC only for walls supporting roof + ceiling only, max 10 ft stud height; walls carrying a floor above need 16\" OC 2x4s or 2x6 framing. Quote 24\" OC only for single-story/top-story bearing walls or non-bearing walls.",
    "formula": "studs = ceil(wallLengthFt * 12 / 24) + 1",
    "example": "20 ft wall @ 24\" OC: ceil(240/24) + 1 = 10 + 1 = 11 studs (vs 16 studs at 16\" OC).",
    "notes": "Code limit sources: https://codes.iccsafe.org/s/IRC2018P5/chapter-6-wall-construction/IRC2018P5-Ch06-SecR602.3.1 , https://www.greenbuildingadvisor.com/question/irc-table-r602-35-vs-table-r602-3-1-on-the-max-height-and-spacing-of-2x4-bearing-stud-walls"
  },
  {
    "topic": "Rectangular structure convention",
    "rule": "For a closed rectangle, run the field-stud formula on each of the 4 walls at full nominal length and sum, then add corner extras separately. Do not try to net out the overlap where corner walls share studs — the per-wall count plus per-corner adders is the standard takeoff convention and the small overlap acts as cut-stock margin.",
    "formula": "fieldStuds = 2*[ceil(L*12/oc)+1] + 2*[ceil(W*12/oc)+1]; then add corner/opening extras",
    "example": "20x20 ft @ 16\" OC: 4 walls x 16 studs = 64 field studs before corners and openings.",
    "notes": "Perimeter shortcut check: 80 lf x 0.75 = 60, +4 end studs = 64. Same answer either way for a rectangle."
  },
  {
    "topic": "Corner framing extras",
    "rule": "Add studs per corner ON TOP of the field count, by corner type: conventional 3-stud corner (also the 'California' / U-shaped corner) = +3 studs; old-style 4-stud blocked corner = +4; advanced-framing 2-stud corner with drywall clips = +2. Default to +3 per corner in quotes unless the job specifies advanced framing. Interior partition T-intersections add +2 to +3 studs each (ladder blocking or partition post) — count them the same way if partitions are in scope.",
    "formula": "cornerStuds = numCorners * 3 (default); rectangle = 4 corners = +12",
    "example": "20x20 rectangle, 3-stud corners: 4 x 3 = 12 extra studs.",
    "notes": "Sources: https://www.justneedspaint.com/california-corners-framing-corners-for-remodels-and-new-builds/ , https://bsesc.energy.gov/energy-basics/advanced-framing-insulated-corners , https://calcsummit.com/calculators/construction/framing/ Stacking note: the per-wall field count already places 2 stud"
  },
  {
    "topic": "King + jack studs per opening",
    "rule": "Every door or window opening in a framed wall gets 2 king studs (one full-height stud nailed to each header end, per IRC R602.7.5 / Table R602.7.5) and jack (trimmer) studs under each header end per the NJ column of IRC Table R602.7(1). Field convention that matches the table for normal residential loads: 1 jack per side for header spans up to ~6 ft, 2 jacks per side above ~6 ft (and for wide garage doors). So a standard 3-ft door or window = 2 kings + 2 jacks = 4 added studs; a wide slider or double window over ~6 ft = 2 kings + 4 jacks = 6 added studs. Wider openings in high-wind/tall-wall c",
    "formula": "openingStuds = 2 kings + 2*NJ jacks; NJ = 1 for span <= ~6 ft, 2 for span > ~6 ft",
    "example": "3'0\" window: 2 + 2 = 4 studs. 8'0\" patio slider: 2 + 4 = 6 studs. Quick adder: +4 studs per ordinary door/window.",
    "notes": "Where NJ = 1, an approved framing anchor may replace the jack (rarely used in field quotes). Sources: https://up.codes/s/supports-for-headers , https://www.thebuildingcodeforum.com/forum/threads/irc-section-r602-7-headers-table-r602-7-1.36086/ , https://www.jlconline.com/how-to/framing/exterior-wall"
  },
  {
    "topic": "Header sizing and header lumber",
    "rule": "Header length = rough opening width + 3\" (1-1/2\" bearing on the jack each side; +6\" if 2 jacks per side). Header is typically 2 plies of 2x lumber (with 1/2\" plywood spacer in a 2x4 wall) sized from IRC Table R602.7(1) by span, building width, and load. Safe single-story (roof+ceiling only) defaults for quoting: 2-2x6 up to ~4 ft span, 2-2x8 to ~5.5 ft, 2-2x10 to ~7 ft, 2-2x12 to ~8 ft; garage doors over 10 ft use triple 2x12 or LVL. Order rule: one stock board yields 2 plies when 2 x headerLength <= board length.",
    "formula": "headerLenIn = ROwidthIn + 3; headerBoardFt per opening = 2 * headerLenIn / 12, rounded up to next stock length",
    "example": "3'0\" door, RO 38\": header = 41\" ; 2 plies x 41\" = 82\" — one 2x8x8' board per opening cuts both plies.",
    "notes": "Always flag: header size is jurisdiction/load dependent — quote from Table R602.7(1) when snow load or building width is known. Sources: https://www.jlconline.com/how-to/framing/exterior-wall-headers_o/ , https://frcog.org/wp-content/uploads/2014/02/headerbeamtable.pdf"
  },
  {
    "topic": "Cripple studs (above/below openings) — no-deduct rule",
    "rule": "Cripple studs continue the 16\"/24\" OC layout above headers and below window sills, so the number of cripples equals the field studs the opening displaced. Takeoff convention: NEVER deduct field studs for openings — the displaced studs are cut down into cripples, and kings/jacks/headers/sills are pure adders. In an 8-ft wall with precut studs, a door/window header set at standard 6'10\" head height leaves only ~3\" to the top plate, so above-header cripples are usually zero (flat blocking from scrap); in 9-ft+ walls, count above-header cripples the same OC way.",
    "formula": "crippleCount per opening ≈ floor(ROwidthIn / oc) + 1 (below sill, and above header when a gap exists) — supplied by the un-deducted field studs, not ordered separately",
    "example": "3'0\" window (RO 38\") @ 16\" OC: floor(38/16)+1 = 3 sill cripples below — cut from the 3 field studs that the opening displaced, so 0 extra studs ordered.",
    "notes": "Source for cripples continuing OC layout: https://easytakeoffs.com/calculators/framing-lumber , https://www.redxapps.com/window-framing"
  },
  {
    "topic": "Window sills",
    "rule": "Each window gets a flat 2x4 rough sill, single or double (double is common practice), length = RO width (+3\" if run past the jacks). Takeoff adder: +1 stud (or one 8-ft 2x4) per window covers a doubled sill for windows up to ~4 ft wide. Common shorthand rolls this in as 'add 4 studs per door, 6 per window' (4 kings/jacks + sill + cripple stock).",
    "formula": "sillLF per window = ROwidthIn/12 * plies; adder = 1 stud per window (<= 4 ft wide)",
    "example": "3'0\" window, doubled sill: 2 x 38.5\" = 77\" — one 8-ft 2x4 (or one precut stud) per window.",
    "notes": "The 'doors 4 / windows 6' shorthand appears in multiple estimating guides: https://www.hunker.com/12611815/how-to-calculate-a-materials-list-for-garage-framing/ , https://www.omnicalculator.com/construction/framing"
  },
  {
    "topic": "Bottom plate math",
    "rule": "One bottom plate = wall length in linear feet. Run it through door openings and cut the doorway out after the wall is raised — never deduct door widths from plate lumber. On concrete slabs the bottom plate must be pressure-treated (or foundation-grade) — quote it as a separate PT line item. Order per wall in stock lengths (8/10/12/14/16 ft) that sum to >= wall length; offcuts become corner laps and blocking.",
    "formula": "bottomPlateLF = sum(wallLengthsFt); boards = per wall, mix of stock lengths covering the length",
    "example": "20x20 building: 80 lf of bottom plate = per wall one 16' + one 8' (trim 4 ft) = 4 pcs 16' + 4 pcs 8' PT on a slab.",
    "notes": "PT-on-slab convention shown in garage takeoff threads: https://www.diychatroom.com/threads/building-a-20-x-20-wood-frame-garage.97944/"
  },
  {
    "topic": "Double top plate + lap splice math",
    "rule": "Wood stud walls are capped with a DOUBLE top plate (IRC R602.3.2): top plate + cap plate = 2 x wall length. End joints in each plate run must be offset at least 24\" from joints in the other run, and the cap plate laps the intersecting wall's top plate at corners. Practical order math: buy each plate run in stock lengths per wall and start the cap-plate run with a different-length board (e.g., lead with the 8-footer if the top plate led with the 16-footer) so splices auto-offset; the corner laps come out of trim offcuts. Splice fastening: 8-16d nails each side of each end joint.",
    "formula": "topPlateLF = 2 * sum(wallLengthsFt); total plate LF (bottom+double top) = 3 * wall LF",
    "example": "20 ft wall: top plate = 16' + 8' (splice at 16 ft), cap plate = 8' + 16' (splice at 8 ft) — 8 ft offset >= the 24\" minimum.",
    "notes": "IRC R602.3.2: https://codes.iccsafe.org/s/IRC2021P3/chapter-6-wall-construction/IRC2021P3-Pt03-Ch06-SecR602.3.2 . A single top plate is allowed by exception (advanced framing) with metal splice ties and studs aligned within 1\" of rafters/joists — only quote it when the plan says so."
  },
  {
    "topic": "Plate order conversion",
    "rule": "Total plate linear feet = 3 x total wall length (1 bottom + 2 top). Convert to boards by dividing by the stock length you'll buy and rounding up PER WALL PER RUN (splices can't fall on corners and offset rules burn inches), then add 10-15% or simply accept the round-up slack. Never order plate stock shorter than the shortest wall if avoidable — fewer splices is faster and code-cleaner.",
    "formula": "plateBoards ≈ ceil(3 * wallLF * 1.10 / stockLengthFt), floor-checked against per-wall layout",
    "example": "80 lf perimeter: 3 x 80 = 240 lf; 240 x 1.10 / 16 = 16.5 → ~17 pcs 2x4x16' equivalent (or the per-wall mix: 12 pcs 16' + 12 pcs 8').",
    "notes": "3x-wall-length plate rule cited by Buildxact and every framing calculator: https://www.buildxact.com/us/blog/estimate-a-framing-takeoff/ , https://easytakeoffs.com/calculators/framing-lumber"
  },
  {
    "topic": "Stud length selection (precuts)",
    "rule": "For 8-ft ceilings order 92-5/8\" precut studs (92-5/8 + 1-1/2 bottom plate + 3 double top plate = 97-1/8\" wall, sized for 5/8\" ceiling drywall + two 4-ft sheets with 1/2\" floor gap). 9-ft walls use 104-5/8\" precuts; 10-ft use 116-5/8\". Only order 96\" '8-foot' studs when studs will actually be cut (rake walls, blocking stock). A quoting tool should map wallHeightFt → precut length, not height x 12.",
    "formula": "studLengthIn = wallHeightIn - 4.5 (one bottom + two top plates); 8ft→92-5/8\", 9ft→104-5/8\", 10ft→116-5/8\"",
    "example": "8 ft wall: 97.125 - 4.5 = 92.625\" = the standard precut.",
    "notes": "Sources: https://www.jlconline.com/how-to/framing/precut-stud-lengths_o/ , https://www.finehomebuilding.com/project-guides/framing/framing-walls-with-8-ft-studs"
  },
  {
    "topic": "Blocking / fire-blocking",
    "rule": "Platform-framed walls up to 10 ft tall need NO added fireblocking — the top and bottom plates already cut off the vertical cavity, and IRC R302.11 only requires blocking in concealed cavities at ceiling/floor lines and at 10-ft maximum intervals (vertical and horizontal). Add a row of solid 2x blocking only when: walls exceed 10 ft (one row per 10 ft of height), balloon framing, soffit/dropped-ceiling connections, sheathing panel edges specced 'blocked', or backing for cabinets/handrails. Material math for one row: linear feet = wall length; piece count = stud bays = studCount - 1 per wall; ea",
    "formula": "blockingRowLF = wallLF; pieces = bays = fieldStuds - 1; boards = ceil(wallLF / stockLengthFt) if not from offcuts",
    "example": "One row on 80 lf of 8-ft wall (specced, not code-required): 80 lf ≈ 7 pcs 2x4x12', cut into ~60 blocks @ 14.5\".",
    "notes": "Sources: https://www.finehomebuilding.com/2024/07/16/the-what-and-where-of-fireblocking , https://codes.iccsafe.org/s/IRC2018P7/part-iii-building-planning-and-construction/IRC2018P7-Pt03-Ch03-SecR302.11"
  },
  {
    "topic": "Sheathing sheet count",
    "rule": "Wall area = perimeter x wall height; sheets = ceiling(area / 32) for 4x8 panels, then add 10% waste (15% for gables/cut-up walls). Do NOT deduct normal door/window openings — the cutouts are waste; deduct only garage-door-sized openings (> ~50 sf). Gable triangles add 0.5 x width x rise per gable. If sheathing must lap the rim joist or foundation sill, either add one horizontal course (perimeter/4 sheets ripped) or switch that wall to 4x9/4x10 panels.",
    "formula": "sheets = ceil(perimeterFt * heightFt / 32 * 1.10); per 8-ft-tall course shortcut: sheets = ceil(perimeterFt / 4)",
    "example": "80 lf perimeter x 8 ft = 640 sf; 640/32 = 20 sheets; +10% = 22 sheets of 7/16\" OSB.",
    "notes": "Sources: https://www.builditcalc.com/sheathing-calculator.html , https://www.inchcalculator.com/roof-sheathing-calculator/ , https://babbagecalculator.com/calculator/osb-sheathing-calculator"
  },
  {
    "topic": "Studs-per-linear-foot conversion (the contractor shortcut)",
    "rule": "The classic order convention: 'one stud per linear foot of wall at 16-inch OC' — the 0.75/lf field rate plus corners, kings, jacks, cripples, and waste lands near 1.0/lf on typical residential layouts (a corner every 15-25 lf, an opening every 12-16 lf). A refined version: 0.75/lf field + 3/corner + 4/opening + 5-10% waste ≈ 1.0-1.2/lf. At 24\" OC the equivalent all-in rate is ~0.65-0.75/lf.",
    "formula": "quickStuds = wallLF * 1.0 (16\" OC, typical layout); detailed = ceil(0.75*wallLF) + endStuds + 3*corners + 4*openings + waste",
    "example": "80 lf perimeter, typical layout: quick order = 80 studs; detailed 20x20 with 6 openings = 104-110 (see worked example) — the shortcut under-buys on opening-heavy plans.",
    "notes": "Sources: https://www.billdr.ai/resources/construction-calculators/free-framing-calculator , https://www.diychatroom.com/threads/building-a-20-x-20-wood-frame-garage.97944/ , https://www.ruh.ai/industrial/construction/tools/stud-calculator"
  },
  {
    "topic": "When the 1-stud/LF shortcut breaks down",
    "rule": "Use the detailed count instead of 1 stud/lf when ANY of: (a) more than ~1 opening per 12 lf of wall (window walls, storefronts) — true rate climbs to 1.25-1.4/lf; (b) 24\" OC framing — the shortcut over-buys ~35%; (c) long unbroken walls with few corners/openings — over-buys, real rate ~0.8/lf; (d) many short wall segments or interior partitions with T-intersections — each corner/tee adds 2-3 studs the average doesn't capture; (e) walls over 10 ft (different stud lengths, possibly doubled studs); (f) advanced framing specs (2-stud corners, single top plate, headers only where loaded) — over-buy",
    "formula": "sanityRate = totalStuds / wallLF; flag if <0.9 or >1.25 (16\" OC)",
    "example": "20x20 with 6 openings: 110 studs / 80 lf = 1.375/lf → the flat 1.0/lf rule would have shorted the order by ~30 studs.",
    "notes": "Failure modes synthesized from calculator methodology pages: https://calcsummit.com/calculators/construction/framing/ , https://bsesc.energy.gov/energy-basics/advanced-framing-insulated-corners"
  },
  {
    "topic": "Waste factors",
    "rule": "Standard quoting waste: studs 5-10% (precuts have almost no cut waste; damage/culls only), plates 10-15% (splice-offset and corner-lap offcuts), headers round up to stock lengths (waste is inherent), sheathing 10% plain rectangles / 15% gables and cut-up elevations. Blocking and sill stock come from offcuts first. Round every line up to whole boards/sheets; never quote fractional pieces.",
    "formula": "orderQty = ceil(netQty * (1 + wastePct))",
    "example": "104 net studs x 1.06 → order 110; 240 lf plates x 1.15 → 276 lf; 20 sheets x 1.10 → 22.",
    "notes": "10-15% buffer convention: https://www.omnicalculator.com/construction/framing , https://smartcutlist.com/tools/plywood-calculator"
  },
  {
    "topic": "Worked example 20x20 — stud count buildup",
    "rule": "One-story 20x20 ft, 8-ft walls, 16\" OC, 2 doors (3'0\") + 4 windows (3'0\" x 4'0\"), 3-stud corners, roof+ceiling load only. Field: 4 walls x [ceil(240/16)+1] = 4 x 16 = 64. Corners: 4 x 3 = 12. Doors: 2 x (2 kings + 2 jacks) = 8. Windows: 4 x (2 kings + 2 jacks) = 16. Window sill stock: 4 x 1 = 4. Cripples: cut from the un-deducted field studs (3 per window below the sill; none above headers in an 8-ft wall) = +0. Net = 64+12+8+16+4 = 104 studs; +5% waste → order 110 precut studs.",
    "formula": "total = 64 field + 12 corner + 8 door + 16 window + 4 sill = 104; order = ceil(104*1.05) = 110",
    "example": "20x20, 8ft, 16\" OC, 2 doors + 4 windows → 110 pcs 2x4 x 92-5/8\" precut studs (1.375 studs/lf — opening-heavy, correctly above the 1/lf rule).",
    "notes": "Each component formula grounded in the rules above; cross-check via https://www.omnicalculator.com/construction/framing and https://www.hunker.com/12611815/how-to-calculate-a-materials-list-for-garage-framing/"
  },
  {
    "topic": "Worked example 20x20 — plates, headers, blocking",
    "rule": "Plates: perimeter 80 lf; bottom = 80 lf pressure-treated if on slab (per wall: 16' + 8', trim to 20 ft) = 4 pcs 2x4x16' PT + 4 pcs 2x4x8' PT. Double top plate = 160 lf; per wall per run 16' + 8', cap run reversed so splices offset 8 ft (>= 24\" code min) = 8 pcs 2x4x16' + 8 pcs 2x4x8'. Headers: 6 openings, all 3'0\" (RO ~38\", header 41\"), 2-ply 2x8 w/ 1/2\" ply spacer; one 2x8x8' yields both plies → 6 pcs 2x8x8' + spacer strips from sheathing scrap. Window sills: doubled 2x4 @ 77\"/window — covered by the 4 sill studs in the stud count. Fireblocking: none required (8-ft platform walls, plates sati",
    "formula": "PT bottom = 80 lf; top+cap = 160 lf; headerBoards = 6 openings x 1 pc 2x8x8'; blocking = 0 required",
    "example": "Plate order: 4 pcs 16' PT + 4 pcs 8' PT + 8 pcs 16' + 8 pcs 8' (2x4). Headers: 6 pcs 2x8x8'.",
    "notes": "Splice offset per IRC R602.3.2 (https://codes.iccsafe.org/s/IRC2021P3/chapter-6-wall-construction/IRC2021P3-Pt03-Ch06-SecR602.3.2); fireblocking exemption per R302.11 platform framing (https://www.finehomebuilding.com/2024/07/16/the-what-and-where-of-fireblocking)"
  },
  {
    "topic": "Worked example 20x20 — complete 2x4-package order",
    "rule": "Final lumber order for the 20x20, 8-ft, 16\" OC, 2-door/4-window structure: (1) 110 pcs 2x4 x 92-5/8\" precut studs (SPF stud grade) — field, corners, kings, jacks, cripples, sills, waste; (2) 4 pcs 2x4x16' + 4 pcs 2x4x8' pressure-treated — bottom plates on slab (substitute untreated over a wood subfloor); (3) 8 pcs 2x4x16' + 8 pcs 2x4x8' No.2 — double top plates with 8-ft splice offsets; (4) 6 pcs 2x8x8' No.2 — one per opening, cut into 2-ply headers @ 41\" with 1/2\" plywood spacers from scrap; (5) 22 sheets 7/16\" OSB 4x8 — 640 sf walls + 10%; (6) optional 7 pcs 2x4x12' utility — mid-height bloc",
    "formula": "order = {studs: 110 precut, PTplate: 4x16'+4x8', plate: 8x16'+8x8', header: 6 x 2x8x8', OSB: 22 sheets, blocking: 7 x 2x4x12' optional}",
    "example": "Total 2x4 count: 110 precuts + 24 plate boards (+7 optional blocking) ≈ 134-141 sticks of 2x4, 6 sticks of 2x8, 22 sheets OSB for the whole shell.",
    "notes": "Header size assumes roof+ceiling only, <=28 ft building width, moderate snow — verify against IRC Table R602.7(1) for the jurisdiction. Garage-door variant: swap one wall's studs for a triple-2x12/LVL header + 2 jacks per side."
  },
  {
    "topic": "IRC anchors for the quoting assistant",
    "rule": "Cite these when a customer questions the math: stud spacing/height limits — IRC Table R602.3(5) (2x4 @ 16\" OC standard bearing; 2x4 @ 24\" OC only roof+ceiling, <=10 ft; 2x6 allows 24\" OC with a floor above). Double top plate + 24\" splice offset + corner lap — R602.3.2. Header sizes and jack count (NJ) — Table R602.7(1); full-height (king) studs per header end — Table R602.7.5 (1 king each end for short spans; more for wide openings/high wind). Fireblocking — R302.11 (10-ft max cavity intervals; platform plates qualify). Always add: 'local amendments govern — confirm with the AHJ.'",
    "formula": "n/a — citation map",
    "example": "Customer asks why 24\" OC isn't quoted on a two-story: Table R602.3(5) limits 2x4 bearing walls supporting one floor + roof to 16\" OC — quote 16\" OC 2x4 or 24\" OC 2x6.",
    "notes": "Sources: https://codes.iccsafe.org/s/IRC2018P5/chapter-6-wall-construction/IRC2018P5-Ch06-SecR602.3.1 , https://codes.iccsafe.org/s/IRC2021P3/chapter-6-wall-construction/IRC2021P3-Pt03-Ch06-SecR602.3.2 , https://up.codes/s/supports-for-headers , https://codes.iccsafe.org/s/IRC2018P7/part-iii-buildin"
  }
],
  },
  {
    name: "Posts, beams, headers & joists",
    blurb: "Sizing and counting rules for structural members, with simplified span figures.",
    rules: [
  {
    "topic": "Post size: 4x4 vs 6x6",
    "rule": "Per IRC Table R507.4, a 4x4 post is only allowed up to 8 ft of unbraced height and small tributary areas (roughly 48-72 sq ft for most species); a 6x6 is good to 14 ft of height at typical deck/porch loads. Practical quoting rule: spec a 4x4 only when post height is 8 ft or less AND tributary area is 48 sq ft or less AND the beam does not need to bear on a notched post top; otherwise spec 6x6. Any post supporting a multi-ply beam that sits on (not beside) the post should be 6x6, since a 4x4 cannot be notched to seat a 2-ply beam. Tributary area per post = post spacing x (joist span / 2 + any c",
    "formula": "tributaryAreaSqFt = postSpacingFt * (joistSpanFt / 2 + cantileverFt); postSize = (postHeightFt <= 8 AND tributaryAreaSqFt <= 48 AND beamNotBearingOnNotch) ? \"4x4\" : \"6x6\"; hard limits: 4x4 max height 8 ft, 6x6 max height 14 ft",
    "example": "20x20 ft porch, beam posts 8 ft apart, roof framing spans 10 ft onto the beam: TA = 8 * (10/2) = 40 sq ft. Post height 9 ft > 8 ft, so 6x6 required. Same porch with 7 ft posts and beam face-fixed per hardware: 4x4 permissible, but most quoting tools should default to 6x6 (many jurisdictions require it for all decks).",
    "notes": "Source: IRC Table R507.4 (up.codes/s/deck-posts; permitdeck.com/deck-permits/codes/post-size; jlconline.com 'New Height Limits for Deck Posts'). Species/grade and load shift exact limits; the 8-ft/48-sf gate is the safe simplified cut."
  },
  {
    "topic": "Post count per beam span",
    "rule": "Number of posts under a beam = number of beam spans + 1. Beam spans = beam length divided by the allowable post-to-post span for the chosen beam (see built-up beam rule). Space posts evenly. Typical porch/deck practice: posts every 6-8 ft OC; never exceed the R507.5 allowable span for the beam ply/depth and joist span.",
    "formula": "postCount = ceil(beamLengthFt / maxBeamSpanFt) + 1; actualSpacingFt = beamLengthFt / (postCount - 1)",
    "example": "20 ft porch beam, 2-ply 2x10 carrying 10-ft joists (allowable span 8 ft): postCount = ceil(20/8) + 1 = 3 + 1 = 4 posts, evenly spaced at 20/3 = 6 ft 8 in OC.",
    "notes": "For an attached deck the house ledger replaces one beam; only the outer beam needs posts. Corner posts are included in the count (formula already counts both ends)."
  },
  {
    "topic": "Built-up beam allowable spans (2-ply / 3-ply 2x)",
    "rule": "Planning rule for built-up 2x beams (SPF-class, deck/porch loads): allowable beam span in feet ≈ ply-depth-minus-2 for 2-ply (2-2x8 ≈ 6 ft, 2-2x10 ≈ 8 ft, 2-2x12 ≈ 10 ft), +1 ft for 3-ply. These figures are valid for joist spans up to 8 ft onto the beam; for longer joist spans reduce beam span (post spacing) by about 1 ft per 2 ft of extra joist span, or size from IRC Table R507.5(1). Ply butt joints must land on post centerlines — never mid-span — so order ply lengths in multiples of the post spacing.",
    "formula": "beamSpanFt ≈ (nominalDepth - 2) [2-ply, joistSpan<=8ft] ; plyLengths = multiples of postSpacingFt so joints land over posts",
    "example": "20-ft beam on posts at 6'-8\": 2-ply 2x10 OK for 8-ft joists. Order plies as 13'-4\" + 6'-8\" pieces (cut from 14-ft and 8-ft stock) so both ply joints land on posts — not 2 butted 10-footers, whose joint would fall mid-span.",
    "notes": "IRC Table R507.5(1) at 40 psf gives SPF 2-ply 2x10 ≈ 7'-9\" when carrying 10-ft joists — hence the 8-ft joist-span cap on the simplified figures."
  },
  {
    "topic": "Header sizing over openings (single story, bearing wall)",
    "rule": "Simplified single-story (roof+ceiling, ~24 ft building width, moderate snow) header sizing for quoting: 2-2x6 up to 5 ft span, 2-2x8 to 6.5 ft, 2-2x10 to 8 ft, 2-2x12 to 9.5 ft (2021 IRC Table R602.7(1) lists 2-2x12 at 9'-9\"). Anything wider — garage doors 10 ft and up — moves to triple-ply or LVL, sized from the table or by the supplier. Header length = rough opening + 3\" (one jack each side) for spans up to 6 ft, +6\" (two jacks per side) above 6 ft.",
    "formula": "headerSize = span<=5 ? '2-2x6' : span<=6.5 ? '2-2x8' : span<=8 ? '2-2x10' : span<=9.5 ? '2-2x12' : '3-ply/LVL — size from IRC R602.7(1) or supplier'; headerLenIn = ROwidthIn + (span<=6 ? 3 : 6)",
    "example": "6-ft patio door: 2-2x8 header, length 72 + 3 = 75 in (6'-3\") — one jack each side. 9-ft garage door: 2-2x12, length 108 + 6 = 114 in, two jacks per side. 16-ft garage door: LVL, engineered.",
    "notes": "Values are conservative planning figures for typical loads; wider buildings, heavy snow, or a floor above shrink allowable spans — confirm against IRC Table R602.7(1)."
  },
  {
    "topic": "Opening stud package (kings/jacks per header)",
    "rule": "Extras ordered per opening are the kings and jacks only (plus sill stock for windows): 2 kings + 1 jack per side for spans up to ~6 ft (4 studs), 2 jacks per side above (6 studs). Cripples above the header and below the sill are NOT extra orders — the field-stud count is never reduced for openings, and those displaced field studs get cut down into the cripples. Counting cripples as adders double-counts lumber.",
    "formula": "openingExtras = 2 + 2*(span<=6ft ? 1 : 2) studs (+1 stud sill stock per window); cripples = 0 extra (supplied by un-deducted field studs)",
    "example": "3-ft window: 2 kings + 2 jacks + 1 sill stud = 5 extras; its 3 cripples come from the 3 field studs the opening displaced. 8-ft slider: 2 kings + 4 jacks = 6 extras.",
    "notes": "Feeds the stud takeoff: add these on top of the wall's base stud count."
  },
  {
    "topic": "Floor joist max spans (SPF #2 class, 16 in OC)",
    "rule": "Simplified maximum clear spans for living-area floors (40 psf live / 10 psf dead, L/360), Spruce-Pine-Fir #2 at 16 in OC: 2x8 = 12'-3\", 2x10 = 15'-5\", 2x12 = 17'-10\". For quoting use round figures 12 ft / 15 ft / 17.5 ft. (Published 30-psf sleeping-area values are longer - up to 2x8 12'-4\"...2x12 19'-2\" - quote the 40-psf numbers as the safe default.) Southern Pine or Doug Fir #2 gain roughly 5-10%. If the room dimension exceeds the max span, add a girder line and split the span.",
    "formula": "requiredJoistSize = smallest of {2x8:12.25, 2x10:15.4, 2x12:17.8} with maxFt >= clearSpanFt; if clearSpanFt > 17.8 then girder required",
    "example": "20x20 ft floor: 20 ft exceeds every 16-in-OC SPF #2 span, so add a center girder -> two 10-ft joist spans -> 2x8 @ 16 OC works (10 <= 12.25).",
    "notes": "Source: IRC Table R502.3.1(2) class values (calculateroofpitch.com/floor-joist-calculator; trademastercalc.com/span-tables/floor-joist; NELMA SPF span tables; awc.org span tutorial). Spacing alternatives: at 12 OC add ~10% span; at 24 OC subtract ~20%."
  },
  {
    "topic": "Floor joist count from room dimensions",
    "rule": "Joists run parallel to the SHORT dimension (they span it); they are spaced along the LONG dimension. Count per continuous row = (spaced dimension in inches / OC spacing) rounded up, plus 1 for the closing joist. If a center girder splits the span and joists are lapped (not continuous), double the piece count (two shorter pieces per line). Add doubles under parallel bearing partitions and around stair openings - practical adder ~5%.",
    "formula": "joistLines = ceil(spacedDimensionFt * 12 / spacingIn) + 1; pieceCount = joistLines * rows (rows = 1 continuous, 2 if lapped at girder); stockLengthFt = roundUpToEven(clearSpanFt + 1 ft for lap+bearing)",
    "example": "20x20 ft floor @ 16 in OC with center girder: joistLines = ceil(240/16) + 1 = 15 + 1 = 16; lapped at girder -> 16 x 2 = 32 pcs 2x8x12 ft (10-ft span + lap/bearing). Add ~2 doubles -> quote 34 pcs.",
    "notes": "Same formula applies to any spacing: 12 OC -> ceil(240/12)+1 = 21 lines; 24 OC -> 11 lines."
  },
  {
    "topic": "Girder/beam count for a floor",
    "rule": "Number of interior girder lines = (dimension the joists must cross / max joist span) rounded up, minus 1. Girders run perpendicular to the joists, full building length. Interior floor girders are built-up 3-ply as a default. Posts/columns under an interior girder: simplified allowable girder spans carrying one floor (24-ft-wide building, #2 lumber, IRC Table R602.7(2) class): 3-2x8 ~ 5.5 ft, 3-2x10 ~ 7 ft, 3-2x12 ~ 8 ft, 4-2x12 ~ 9 ft between supports.",
    "formula": "girderLines = ceil(joistCrossDimensionFt / maxJoistSpanFt) - 1; girderLengthFt = perpendicularDimensionFt; interiorPosts = ceil(girderLengthFt / girderMaxSpanFt) - 1 (ends bear on foundation)",
    "example": "20x20 ft floor, 2x8 joists (max 12.25 ft): girderLines = ceil(20/12.25) - 1 = 1 center girder, 20 ft long. Choose 3-2x10 (7-ft spans): interiorPosts = ceil(20/7) - 1 = 2 posts (three ~6'-8\" spans). Material: 3 plies x 20 ft = girder plies ordered in multiples of the post spacing so every butt joint lands on a post centerline (e.g. posts at 6'-8\": 13'-4\" + 6'-8\" pieces per ply), plus 2 adjustable s",
    "notes": "Source: IRC Table R602.7(2)/R602.7(3) girder tables (up.codes/s/allowable-girder-spans; jaspector.com IRC 2024 R502.5). Steel I-beam or LVL replaces built-up 2x when fewer posts are wanted."
  },
  {
    "topic": "Rim/band joist count",
    "rule": "Rim (band) joists close the joist ends: they run along the two walls parallel to the joist run direction (perpendicular to the joists), same depth lumber as the joists. Linear feet = 2 x the spaced (long) dimension. Where joists lap over a center girder, add one row of solid blocking over the girder = spaced dimension in LF, cut from joist stock.",
    "formula": "rimLF = 2 * spacedDimensionFt; rimPieces = ceil(rimLF / stockLengthFt); blockingLF (if lapped at girder) = spacedDimensionFt",
    "example": "20x20 ft floor with 2x8 joists: rimLF = 2 * 20 = 40 LF -> 4 pcs 2x8x10 ft (or 3 pcs 2x8x16 ft, 48 LF with cutoff). Lapped joists at center girder: + 20 LF blocking = 2 more 2x8x10 ft. Total band + blocking = 6 pcs 2x8x10 ft.",
    "notes": "On decks the rim is often doubled (fascia/rim beam) - add 2x LF if the design shows a flush or doubled rim."
  },
  {
    "topic": "Ceiling joist sizing and count",
    "rule": "Ceiling joist spans, SPF #2 @ 16 in OC (IRC Tables R802.4(1)/(2) class values): uninhabitable attic WITHOUT storage (10 psf): 2x6 = ~16'-10\", 2x8 = ~20'-0\", 2x10 = 20 ft+. Attic WITH limited storage (20 psf): 2x6 = ~12'-10\", 2x8 = ~16'-3\", 2x10 = ~19'-10\". Count uses the same formula as floor joists: spaced along the ridge/long dimension. Ceiling joists double as rafter ties - run them parallel to rafters and lap them over the center bearing wall.",
    "formula": "joistLines = ceil(spacedDimensionFt * 12 / 16) + 1; size = smallest with maxSpanFt >= clearSpanFt (use storage table if attic access/storage); pieces double if lapped at a center wall",
    "example": "20x20 ft house, no attic storage: single 20-ft clear span needs 2x8 (20'-0\" max - marginal) -> spec 2x10 x 16 lines = 16 pcs; with a center bearing wall, two 10-ft spans of 2x6: ceil(240/16)+1 = 16 lines x 2 pieces = 32 pcs 2x6x12 ft.",
    "notes": "Source: AWC ceiling joist span data and IRC R802.4 (ckcog.com ceiling joist span table PDF; awc.org span tutorial; mycarpentry.com joist span tables). If storage is possible (pull-down stairs), always use the 20-psf column. Limited-storage (20 psf) figures are SPF #2 per IRC Table R802.5.1(2); South"
  },
  {
    "topic": "Rafter length from span + pitch",
    "rule": "Rafter length = slope factor x (horizontal run + horizontal overhang), where slope factor = sqrt(1 + (pitch/12)^2) and run = building span/2 (subtract half the ridge thickness, ~0.75 in, for cut accuracy - ignore for quoting). Round up to the next even 2-ft stock length. Common slope factors: 4/12 = 1.054, 5/12 = 1.083, 6/12 = 1.118, 8/12 = 1.202, 12/12 = 1.414.",
    "formula": "slopeFactor = sqrt(1 + (pitchRise/12)^2); rafterLenFt = (spanFt/2 + overhangFt) * slopeFactor; stockLenFt = roundUpToEven(rafterLenFt)",
    "example": "20 ft wide building, 6/12 pitch, 12-in overhang: rafterLen = (10 + 1) * 1.118 = 12.30 ft -> buy 14-ft stock.",
    "notes": "Source: rafter formula pages (shinglescalculator.com/calculators/rafter-length-calculator; roofpitch.net/rafter-calculator). Sizing: SPF #2 @ 16 OC under ~20 psf snow spans about 2x6 = 10'-6\", 2x8 = 13'-11\", 2x10 = 17'-9\" horizontal - a 20-ft-wide gable (10-ft run) frames with 2x6, use 2x8 in snow c"
  },
  {
    "topic": "Rafter count",
    "rule": "Rafters come in pairs, one each side of the ridge. Pairs = (ridge length in inches / OC spacing) rounded up, plus 1 for the end pair; total rafters = 2 x pairs. Add a ridge board one nominal size deeper than the rafters (2x8 ridge for 2x6 rafters), length = ridge length. Add collar ties in the upper third at 4 ft OC max, and rafter ties/ceiling joists at the plate (usually already counted as ceiling joists).",
    "formula": "pairs = ceil(ridgeLengthFt * 12 / spacingIn) + 1; rafters = 2 * pairs; ridgeLF = ridgeLengthFt; collarTies = ceil(ridgeLengthFt / 4)",
    "example": "20x20 ft gable roof @ 16 in OC: pairs = ceil(240/16) + 1 = 16; rafters = 32 pcs 2x6x14 ft (from length rule); ridge = 20 LF of 2x8 (2 pcs 2x8x10 ft); collar ties = ceil(20/4) = 5 pcs 2x4.",
    "notes": "Hip/valley roofs: add hip/valley rafters (length ~ 1.4 x common run x slope factor) and shortening jacks - quote ~15% extra rafter LF for a simple hip."
  },
  {
    "topic": "Trusses vs stick-framed rafters; truss count",
    "rule": "Use manufactured trusses when: the span is clear-spanned with no interior bearing (standard residential trusses handle 20-40+ ft), the roof is a simple gable/hip, or labor speed matters - trusses are the default on most new US homes. Stick-frame with rafters when: attic living space or vaulted ceilings are wanted (unless attic/scissor trusses), the roof is complex/cut-up, or crane/delivery access is poor. Trusses go 24 in OC standard: count = (building length / 2 ft) rounded up + 1, and the two end units are gable-end trusses (included in the count).",
    "formula": "trussCount = ceil(buildingLengthFt * 12 / 24) + 1 = ceil(buildingLengthFt / 2) + 1; per-truss span = building width (no interior bearing needed)",
    "example": "20x20 ft building: trussCount = ceil(240/24) + 1 = 10 + 1 = 11 trusses spanning 20 ft @ 24 in OC (includes 2 gable-end trusses). No ceiling joists or ridge needed - the truss bottom chord is the ceiling frame.",
    "notes": "When trusses are used, remove ceiling joists, rafters, ridge, and collar ties from the takeoff; add hurricane ties (1-2 per truss end) and 2x4 lateral bracing (~1.5 LF per LF of building length)."
  },
  {
    "topic": "Porch/deck post spacing quick rule",
    "rule": "Default porch and deck layout for quoting: 6x6 posts at 8 ft OC max under a 2-ply 2x10 (SPF class) or at 6 ft OC under 2-ply 2x8; drop to ~6 ft OC when supported joist span exceeds 10 ft. Each post gets a footing sized to the tributary area (tributary sq ft x 50 psf / soil bearing).",
    "formula": "postCount = ceil(beamLengthFt / 8) + 1 for 2-2x10; footingLoadLb = postSpacingFt * (joistSpanFt/2) * 50",
    "example": "20-ft-wide front porch, 8-ft deep roof: beam posts = ceil(20/8) + 1 = 4 posts 6x6; footing load = 6.67 * 4 * 50 = ~1,334 lb each (light - minimum footing governs).",
    "notes": "Source: IRC R507.5 spacing practice (concretecalculate.com/deck-post-spacing-chart; deckmath.com beam guides). Roofed porches in snow country: use snow load instead of 50 psf combined."
  },
  {
    "topic": "Species/grade adjustment",
    "rule": "All simplified spans above are SPF #2 class (safe for SPF, Hem-Fir #2). Southern Pine #2 and Douglas Fir-Larch #2 span roughly 5-10% farther - apply a 1.05 multiplier when the region stocks SYP/DF and the quote allows it; never adjust downward below the SPF figures for #2 or better lumber. #3/stud grade or wet-service (deck) conditions: multiply spans by 0.85.",
    "formula": "adjustedSpanFt = baseSpanFt * factor, factor = 1.05 (SYP/DF #2), 1.0 (SPF/HF #2), 0.85 (#3 grade or wet service)",
    "example": "2x10 floor joist @ 16 OC: SPF base 15.4 ft -> SYP #2: 15.4 * 1.05 = 16.2 ft; treated 2x10 deck joist: 15.4 * 0.85 = 13.1 ft.",
    "notes": "Keeps one table in the tool with a single regional multiplier instead of four species tables."
  }
],
  },
  {
    name: "Contractor rules of thumb",
    blurb: "The shorthand pros use: lumber per sq ft, fasteners, post holes, decks, fences, stairs, waste.",
    rules: [
  {
    "topic": "Framing lumber per sq ft of house",
    "rule": "Framing lumber by scope: wall framing alone runs ~3–4 board feet per sq ft of floor area; the FULL structural package (floor decks + walls + roof stack) runs ~6–6.5 BF/sq ft — use 6.3 BF/sq ft as the full-package planning average, plus ~3 sq ft of panel goods (sheathing/subfloor) per sq ft of house.",
    "formula": "wallsOnlyBF = houseSqFt * 3.5; fullPackageBF = houseSqFt * 6.3; panelSqFt = houseSqFt * 3; order = BF * 1.05–1.10",
    "example": "2,000 sq ft house, full package: 2000 × 6.3 = ~12,600 BF + ~6,000 sq ft of panels; order ~13,200–13,900 BF with waste.",
    "notes": "Sources: lumber-takeoff.com, easytakeoffs.com, coohom.com. Spacing (16 vs 24 OC), wall height, and roof complexity swing this materially; use as a sanity check against a real takeoff, not as the bid."
  },
  {
    "topic": "Stud count",
    "rule": "Exact count: one stud per spacing interval plus one end stud. Shorthand: at 16 in OC, figure ~0.75 studs per linear foot of wall for the bare wall, or 1 stud per linear foot once corners, partition tees, jacks/kings and blocking are included. Add ~10% waste.",
    "formula": "studs = ceil(wallLengthFt * 12 / spacingIn) + 1; quickStuds = wallLengthFt * 1.0 (16 in OC, with extras)",
    "example": "20 ft wall @ 16 in OC -> ceil(20*12/16)+1 = 16 studs; quoting shorthand: 20 LF -> ~20 studs including corners and openings",
    "notes": "Sources: calculator.academy, homedit.com, buildestimatory.com. Add 2-3 studs per corner/tee and 2-4 per opening (king+jack each side) if counting explicitly instead of using the 1-per-LF shorthand."
  },
  {
    "topic": "Stud spacing / code basis",
    "rule": "Default load-bearing wall: 2x4 @ 16 in OC (IRC Table R602.3(5)). 2x4 @ 24 in OC only when supporting roof+ceiling and wall height limits are met; 2x6 or larger @ 24 in OC allowed when supporting roof-ceiling assembly only (IRC 2021 R602.3.1). Interior non-bearing: 2x4 @ 24 in OC permitted. 16 in OC lands 4x8 sheet edges on studs (16/32/48).",
    "formula": "spacingIn = 16 (default bearing); 24 allowed per IRC R602.3.1 conditions",
    "example": "8 ft tall bearing wall under roof+ceiling only, framed 2x6 -> 24 in OC is code-legal; same wall carrying a floor above -> use 16 in OC 2x4 or check Table R602.3(5)",
    "notes": "Sources: codes.iccsafe.org IRC2021 R602.3, up.codes. A quoting tool should default to 16 OC and flag 24 OC as an option needing code check."
  },
  {
    "topic": "Header sizing quick rule",
    "rule": "MNEMONIC ONLY — NOT FOR QUOTING: 'an inch of header depth per foot of span' is a memory aid that runs a full size class hot versus the code table. For actual sizing use the simplified table: 2-2x6 to 5 ft, 2-2x8 to 6.5 ft, 2-2x10 to 8 ft, 2-2x12 to 9.5 ft, 3-ply/LVL beyond.",
    "formula": "use the simplified header table, not the mnemonic",
    "example": "A 6-ft opening: the mnemonic suggests 2-2x6; the table (and IRC R602.7(1)) says 2-2x8. Quote the 2x8.",
    "notes": "Sources: jlconline.com Exterior Wall Headers, finehomebuilding.com, up.codes IRC 602.7.3. Flag: rule of thumb only - quote should print 'verify per IRC R602.7(1)'."
  },
  {
    "topic": "Framing nails quantity",
    "rule": "Army-engineer estimating formula for 12d-60d common nails: pounds = (pennyweight/6) x (boardFeet/100). For 16d framing nails that is ~27 lb per 1,000 BF. Cross-check: typical wood framing uses 4-8 nails per sq ft of building, and 3-4 nails per lumber-to-lumber connection.",
    "formula": "lbs = (d/6) * (boardFeet/100); e.g. 16d: lbs = 2.67 * boardFeet/100",
    "example": "12,600 BF frame -> 2.67 * 126 = ~336 lb of 16d nails (round to ~350 lb / roughly seven 50-lb boxes)",
    "notes": "Sources: armyengineer.tpub.com via buildestimatory.com framing-nail-calculator, hunker.com. Gun nails are sold by count (2,000-5,000/box); a 2,000-sq-ft house typically burns 10,000-15,000 framing gun nails at 4-8 per sq ft."
  },
  {
    "topic": "Sheathing nails per sheet",
    "rule": "Code-standard panel nailing is 6 in OC at edges and 12 in OC in the field. A 4x8 sheet on 16 in OC framing takes ~60 nails at 6/12; at a uniform 8 in spacing (6 nails per truss/stud crossing) figure ~48 per sheet. Shorthand: 60 nails per sheet, so one 7,200-count box does ~120 sheets.",
    "formula": "nailsPerSheet = (perimeterIn/6) + interiorSupports * (96/12) ~= 60 for 4x8 @ 16 OC; totalNails = sheets * 60",
    "example": "40 sheets of roof sheathing -> 40 * 60 = 2,400 nails (~one 2,500-count coil box with spare)",
    "notes": "Sources: hunker.com, vcalc.com nails-for-wall-sheathing. High-wind/seismic zones tighten edge spacing to 4 in - add ~30%."
  },
  {
    "topic": "Drywall sheet count",
    "rule": "Sheets = total wall + ceiling area divided by sheet area (4x8 = 32 sq ft, 4x12 = 48 sq ft), plus ~10% waste (up to 15-20% on chopped-up plans). Do not deduct normal doors/windows - offcuts cover them.",
    "formula": "sheets = ceil(areaSqFt * 1.10 / 32) (4x8); or /48 for 4x12",
    "example": "12x12 room, 8 ft ceilings: walls 4*12*8=384 + ceiling 144 = 528 sq ft -> 528*1.1/32 = ~19 sheets of 4x8",
    "notes": "Sources: drywall101.com, realestimateservice.com. Waste factor per trade guides: 5% flat planes, 7-10% complex."
  },
  {
    "topic": "Drywall screws per sheet",
    "rule": "~32 screws per 4x8 sheet, ~50 per 4x12 (walls: 8 in OC edges / 16 in field; ceilings tighter: 7-8 in edges / 12 in field, so add ~25% for ceilings). Fast shorthand: 1 screw per sq ft of board.",
    "formula": "screws = sheetSqFt * 1.0; or screws4x8 = 32, screws4x12 = 50; ceilingScrews = wallCount * 1.25",
    "example": "60 sheets of 4x8 -> 60 * 32 = ~1,920 screws; buy a 5-lb box (~2,500 screws of 1-1/4 in) per ~60-70 sheets",
    "notes": "Sources: angi.com, drywall101.com, avsforum.com. Field spacing assumes 16 in OC studs; 24 in OC framing uses fewer."
  },
  {
    "topic": "Drywall hanging labor",
    "rule": "Framing labor: ~400–500 sq ft per framer per day applies PER MAJOR PHASE (floor deck, wall framing, roof stack each). Whole-frame all-in productivity is ~60–100 sq ft per framer-day, which is why a full frame takes weeks, not days.",
    "formula": "perPhaseDays = houseSqFt / (framers * 450); wholeFrameDays = houseSqFt / (framers * 80)",
    "example": "2,000 sq ft, 4-man crew: each phase ≈ 2000/(4×450) ≈ 1.1 crew-days; whole frame ≈ 2000/(4×80) ≈ 6–12 working days plus complexity.",
    "notes": "Sources: contractortalk.com and drywalltalk.com pro forums. Quote the low end (25-30 sheets/day) for remodels and high ceilings."
  },
  {
    "topic": "Drywall mud (joint compound)",
    "rule": "USG figure: ~0.9 gal of ready-mix per 100 sq ft of board for a standard tape+2 coat finish, i.e. ~9-10 gal per 1,000 sq ft = two 4.5-5 gal pails per 1,000 sq ft. Pro habit: order a bucket per 1,000 sq ft per coat stage and one spare. Tape: ~370 LF per 1,000 sq ft.",
    "formula": "gallons = boardSqFt * 0.009; pails5gal = ceil(boardSqFt/1000 * 2)",
    "example": "5,000 sq ft of board -> ~45 gal -> ~10 five-gal pails; plus ~1,850 LF of tape (4 x 500 ft rolls)",
    "notes": "Sources: finehomebuilding.com forum (USG figure), thesitemath.com, diychatroom.com. Level 5 skim adds ~50%."
  },
  {
    "topic": "Concrete per post hole",
    "rule": "Volume = tube area x depth; an 80-lb bag yields 0.60 cu ft (60-lb = 0.45). At 3 ft deep: 8 in tube ~1.05 cu ft -> 2 x 80-lb (or 2-3 x 60-lb); 10 in tube ~1.64 cu ft -> 3 x 80-lb; 12 in tube ~2.36 cu ft -> 4 x 80-lb (5 with waste). Subtract the post volume for tight counts; pros usually don't bother and round up.",
    "formula": "bags80 = ceil( (3.1416 * (diaIn/24)^2 * depthFt) / 0.60 ); bags60 = ceil(cuFt/0.45)",
    "example": "12 in tube @ 3 ft -> 3.1416*(0.5)^2*3 = 2.36 cu ft -> 2.36/0.6 = 3.9 -> 4 bags of 80-lb (order 5)",
    "notes": "Sources: concretecalculator.pro sonotube guide, sonotubecalculator.com, diychatroom.com. Fence-post shorthand (8 in hole, 2 ft deep): 1.5-2 bags of 60-lb per post."
  },
  {
    "topic": "Deck joist count",
    "rule": "Joists run perpendicular to decking at 16 in OC standard (12 in OC for diagonal decking or many composites): count = width along the ledger x 12 / spacing + 1, then add rim/doubled ends and doubles under parting boards. Most decking cannot span more than 16 in OC.",
    "formula": "joists = ceil(deckWidthFt * 12 / 16) + 1 (+2 for rim/doubles)",
    "example": "16 ft wide x 12 ft deep deck @ 16 in OC -> 16*12/16+1 = 13 joists of 12 ft, plus 2 rim boards -> order 15",
    "notes": "Sources: decks.com, timbertech.com, fortressbp.com. Composite mfr specs may force 12 in OC -> width*12/12+1."
  },
  {
    "topic": "Deck beams and posts",
    "rule": "Support posts land every 6-8 ft under the beam for typical residential loads (max ~10-12 ft with engineered beams; many decks settle at ~8 ft because common beam sizes work there). Decks under 6 ft tall: 4x4 posts adequate up to 12 ft spacing, but 6x6 is the modern default. Beam lines no more than ~12 ft apart for low decks.",
    "formula": "posts = ceil(beamLengthFt / 8) + 1; footings = posts",
    "example": "16 ft beam -> 16/8+1 = 3 posts -> 3 footings (12 in tube @ 3 ft = ~4 bags 80-lb each, 12 total)",
    "notes": "Sources: thebackyardstandard.com, decks.com, millardlumber.com. Verify against DCA-6/IRC R507 beam span tables for the bid's fine print."
  },
  {
    "topic": "Fence math",
    "rule": "Posts every 8 ft (6 ft for heavy privacy fence in windy areas): posts = run/8 + 1, add 1 per gate side and per corner. Rails: 1 per 24 in of fence height (6 ft fence = 3 rails) x number of sections. Pickets: run_inches / (picketWidth + gap); 5.5 in picket butted tight = ~2.2 per LF, with 1/2 in gap = 2 per LF. Concrete: ~1.5-2 bags 60-lb per post.",
    "formula": "posts = ceil(runFt/8) + 1; rails = ceil(heightFt/2) * sections; pickets = ceil(runFt*12 / (picketW + gapIn))",
    "example": "100 ft of 6-ft privacy fence @ 8 ft OC: 14 posts, 13 sections * 3 = 39 rails, 100*12/5.5 = ~218 pickets butted tight, ~21-28 bags of concrete",
    "notes": "Sources: inchcalculator.com, calcsummit.com fence calculator, omnicalculator.com. Board-on-board overlap adds ~30% pickets."
  },
  {
    "topic": "Stair math (rise/run)",
    "rule": "Risers = total rise / 7.75 rounded UP (IRC R311.7.5 max riser 7-3/4 in), actual riser = totalRise/risers; treads = risers - 1; tread depth min 10 in (IRC). Comfort targets: the 7-11 rule (7 in riser, 11 in tread) and 2R + T = 24-25 in. Total run = treads x treadDepth. Stringer length = sqrt(totalRise^2 + totalRun^2). Max 3/8 in riser variation.",
    "formula": "risers = ceil(totalRiseIn / 7.75); riserH = totalRiseIn / risers; treads = risers - 1; runIn = treads * 10 (min); stringerLen = sqrt(riseIn^2 + runIn^2) / 12",
    "example": "Deck 55 in high -> ceil(55/7.75) = 8 risers @ 6.875 in, 7 treads @ 10.5 in -> run 73.5 in, stringer = sqrt(55^2+73.5^2)=91.8 in -> cut from a 10 ft 2x12",
    "notes": "Sources: codes.iccsafe.org IRC R311.7.5, familyhandyman.com, redxapps.com. Cut stringers need 3.5 in minimum throat - always from 2x12."
  },
  {
    "topic": "Stair stringer count",
    "rule": "Stair stringers: wood treads need a stringer every ~18 in of width, minimum 3 — so 36-in stairs = 3 stringers, 48-in = 4. Composite treads flex more: one every ~12 in (36-in composite stairs = 4 stringers).",
    "formula": "wood: stringers = max(3, ceil(stairWidthIn / 18) + 1); composite: ceil(stairWidthIn / 12) + 1",
    "example": "36-in wood stairs: max(3, ceil(36/18)+1) = 3. 48-in: max(3, ceil(48/18)+1) = 4. 36-in composite: ceil(36/12)+1 = 4.",
    "notes": "Sources: truetips.blog 3-rule, engineerfix.com, stairs4u.com. One 2x12 yields one stringer; add one spare board for a miscut."
  },
  {
    "topic": "Roofing squares & bundles",
    "rule": "1 square = 100 sq ft of roof. Squares = footprint x pitch factor / 100, where pitchFactor = sqrt(1 + (rise/12)^2): 4/12 = 1.054, 6/12 = 1.118, 8/12 = 1.202, 12/12 = 1.414. Standard 3-tab and most architectural shingles: 3 bundles per square (33.3 sq ft/bundle); thick designer/architectural lines run 4-5 bundles per square. Waste: 10% simple gable, 12-15% hip, 15-20% cut-up roofs.",
    "formula": "squares = footprintSqFt * sqrt(1+(rise/12)^2) / 100; bundles = ceil(squares * 1.10 * 3)",
    "example": "1,800 sq ft footprint @ 6/12 -> 1800*1.118 = 2,012 sq ft = 20.1 squares -> 20.1*1.1*3 = ~67 bundles",
    "notes": "Sources: iko.com, usasuperior.com, brandonjroofing.com, ez-estimates.com waste guide. Add starter (~1 bundle per 100 LF eave) and hip/ridge caps separately."
  },
  {
    "topic": "Roofing nails",
    "rule": "4 nails per shingle standard = ~320 nails per square; high-wind installs use 5-6 per shingle = ~480 per square. A 7,200-count coil box covers ~22 squares standard (~20 with 10% loss), ~15 squares high-wind.",
    "formula": "nails = squares * 320 (standard) or * 480 (high-wind); boxes7200 = ceil(nails/7200)",
    "example": "20-square roof, standard: 20*320 = 6,400 nails -> one 7,200-count box just covers it; order 2 for high-wind",
    "notes": "Sources: homeconstructionimprovement.com, mcswusa.com, iko.com. Larger-format shingles (fewer per square) drop this to ~240/square."
  },
  {
    "topic": "Siding squares",
    "rule": "Squares = (wall area - openings) x waste / 100. Wall area = perimeter x eave height + gables (0.5 x base x height each). Vinyl waste: 10% baseline, 12-15% many corners/openings, 15-20% gables/dormers/angles; fiber cement runs higher. Deduct only large openings (garage doors); leave normal windows in as the waste cushion.",
    "formula": "squares = ceil( (perimFt*heightFt + sum(0.5*gableB*gableH) - bigOpenings) * 1.10 / 100 )",
    "example": "40x30 house, 9 ft walls, 2 gables 30 ft x 5 ft: (140*9 + 2*75) = 1,410 sq ft -> *1.1/100 = ~15.5 -> 16 squares",
    "notes": "Sources: certainteed.com estimating guide, calcsummit.com, kalooziecomfort.com. Trim (J-channel, corners, starter) is takeoff-by-LF, not by square."
  },
  {
    "topic": "Paint coverage",
    "rule": "Figure 350 sq ft per gallon per coat for topcoat on smooth primed walls (the 400 on the can is ideal-condition); 250-300 for textured/porous surfaces; primer 200-300 sq ft/gal. Standard job = 2 coats.",
    "formula": "gallons = ceil(wallSqFt * coats / 350); primerGal = ceil(wallSqFt / 250)",
    "example": "12x12 room, 8 ft ceilings = ~384 sq ft of wall -> 384*2/350 = 2.2 -> 2-3 gallons for two coats",
    "notes": "Sources: thisoldhouse.com, angi.com, buildcalculate.com. Deduct openings only when they exceed ~100 sq ft total; dark-over-light or color changes may need a third coat."
  },
  {
    "topic": "Waste percentages by trade",
    "rule": "Standard adders on net takeoff quantities: framing lumber 10% (15% complex); trim/millwork 12-15%; drywall 5% flat / 7-10% complex; roofing shingles 10% gable / 12-15% hip / 15-20% cut-up; vinyl siding 10% (15-20% gabled); flooring 10-15% straight / +15% diagonal (NWFA); tile 10% straight-lay / 15-20% diagonal or herringbone (TCNA); concrete flatwork 5-10%.",
    "formula": "orderQty = netQty * (1 + wastePct); pick wastePct from the trade table above",
    "example": "Net 2,400 sq ft of shingles on a hip roof -> 2400 * 1.15 = 2,760 sq ft -> 27.6 squares -> ~83 bundles",
    "notes": "Sources: ez-estimates.com waste-factor reference, buildvisionai.com, calcforhomes.com. A quoting tool should expose these as per-line defaults the user can override."
  },
  {
    "topic": "Framing labor productivity",
    "rule": "A framing crew produces 400-500 sq ft of house per framer per day under standard conditions. Labor cost check: at 500 sq ft/day and $30/hr, labor = ~$0.48-0.60/sq ft raw wage - loaded/billed framing labor runs $4-10/sq ft of house. Complex work (curved walls, cathedral ceilings, cantilevers) can double hours; chopped-up plans add 40-80%.",
    "formula": "crewDays = houseSqFt / (framers * 450); laborCost = houseSqFt * 4 to 10",
    "example": "2,000 sq ft house, 4-man crew -> 2000/(4*450) = ~1.1 wk-adjusted... 2000/1800 = ~1.1 crew-days per major phase; full frame typically 2-4 weeks; labor line $8,000-20,000",
    "notes": "Sources: eb3construction.com, jlconline.com unit-price method, costflowai.com. Use the per-framer-day figure for wall/floor phases, not roof stacking."
  },
  {
    "topic": "Framing cost sanity check (2025-26)",
    "rule": "Full house framing (labor + material) runs $11-30 per sq ft of house, i.e. $22k-60k on a 2,000 sq ft home. Materials alone: framing lumber $3-6/sq ft; sheathing adds $2-8/sq ft; house wrap $0.50-1/sq ft. Stick prices: 2x4 stud ~$3-6, 2x6 ~$6-9, 2x8 ~$10-13. If a framing quote falls outside $11-30/sq ft, re-check the takeoff.",
    "formula": "framingTotal = houseSqFt * 11 to 30; lumberOnly = houseSqFt * 3 to 6",
    "example": "2,000 sq ft house -> lumber package sanity band $6,000-12,000; full framing bid sanity band $22,000-60,000",
    "notes": "Sources: angi.com cost-to-frame (2025-26 data), homeadvisor.com, homeguide.com, mysiteplan.com. 2025->2026 saw ~3.5-5% increases; regional labor ($40-70/hr skilled framer) drives the spread."
  },
  {
    "topic": "Wall/floor sheathing count",
    "rule": "Sheets of 4x8 sheathing or subfloor = area / 32, plus 10% waste. Roof: use the pitched area (footprint x pitch factor). Rule pairs with the 3-sq-ft-of-panel-per-sq-ft-of-house package figure.",
    "formula": "sheets = ceil(areaSqFt * 1.10 / 32)",
    "example": "1,000 sq ft subfloor -> 1000*1.1/32 = 34.4 -> 35 sheets of 3/4 in T&G",
    "notes": "Sources: easytakeoffs.com framing calculator, lumber-takeoff.com. Glue: ~one 28-oz tube of subfloor adhesive per 3-4 sheets."
  }
],
  },
];
