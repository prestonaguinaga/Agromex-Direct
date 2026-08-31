/**
 * Full researched dataset backing the /guide page — GENERATED from the
 * multi-agent research run (new-build, remodel, formula researchers plus an
 * adversarial verify pass). US national averages, 2025–2026.
 */

export interface GuideItem {
  name: string;
  unit: string;
  typicalLowUSD?: number;
  typicalHighUSD?: number;
  notes?: string;
}

export interface GuidePhase {
  name: string;
  description?: string;
  shareOfBudgetPct?: number;
  items: GuideItem[];
}

export const NEW_BUILD_GUIDE: {
  costPerSqftNotes: string;
  phases: GuidePhase[];
} = {
  "costPerSqftNotes": "Construction cost only — excludes land, financing, and sales costs. Grounding: NAHB 2024 Cost of Construction Survey puts average hard construction cost at $428,215 for a 2,647 sq ft home = ~$162/sq ft before GC overhead/profit; adding the typical 15-25% GC markup yields ~$195/sq ft for a contractor build. HomeGuide (2025-26) lists $180-$280/sq ft builder-grade and $280-$450+/sq ft custom; multiple 2025 sources (Felix, Opendoor, Amerisave) put budget builds at $100-$200/sq ft with a $150 median, and owner-builders save roughly 10-20% by cutting GC markup — hence low ~$120-$150 (owner-builder/budget, low-cost region), mid ~$180-$210 (typical contractor build), high $280-$450+ (custom/high-end). Phase shares below follow NAHB 2024 stage shares (site work 7.6%, foundation 10.5%, framing 16.6%, exterior finishes 13.4%, major-system rough-ins 19.2%, interior finishes 24.1%, final steps 6.5%) remapped to finer phases; they sum to ~99%, with the remaining ~1-2% being NAHB's 'other' (misc overhead, jobsite costs).",
  "phases": [
    {
      "name": "Pre-construction (permits, plans, surveys, fees, utility hookups)",
      "description": "Everything before dirt moves: building permit, impact and utility-connection fees, house plans/architecture and engineering, land survey, soil/perc testing, and bringing water/sewer/electric service to the site. NAHB 202",
      "shareOfBudgetPct": 6,
      "items": [
        {
          "name": "Building permit (new single-family)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1200,
          "typicalHighUSD": 7500,
          "notes": "HomeGuide/Angi: new-house permits typically $1,000-$3,000, up to ~$8,500 in high-fee jurisdictions; NAHB 2024 national average $7,640. Fee only — 0.5-2% of construction cost."
        },
        {
          "name": "House plans / architecture & engineering",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1000,
          "typicalHighUSD": 10000,
          "notes": "Stock plan sets ~$700-$3,000; custom architect/engineering runs to $10,000+. NAHB 2024 avg $6,480. Labor/professional-services cost."
        },
        {
          "name": "Land survey (boundary, topo, construction staking)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 800,
          "typicalHighUSD": 6500,
          "notes": "Angi/HomeGuide: boundary $500-$1,500; full new-construction survey package (boundary + topographic + staking) $1,800-$6,500. Professional service."
        },
        {
          "name": "Soil test / perc test / geotechnical report",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 400,
          "typicalHighUSD": 2500,
          "notes": "HomeAdvisor: soil test avg $1,382 ($652-$2,112); perc test $750-$1,900 (basic from ~$300). Geotech reports for difficult sites $1,000-$5,000. Professional service."
        },
        {
          "name": "Impact & utility connection fees",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2000,
          "typicalHighUSD": 15000,
          "notes": "NAHB 2024 averages: impact fee $6,367 plus water/sewer inspection/connection fees $6,260. Varies enormously by municipality (near zero to $25k+). Fee only."
        },
        {
          "name": "Utility hookups to site (water, sewer, electric service lines)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2500,
          "typicalHighUSD": 25000,
          "notes": "Labor-inclusive. HomeGuide/Angi: city water hookup $1,000-$6,000; sewer line/connection $1,500-$15,000; with utilities at the street and house within ~50 ft, total commonly $10,000-$25,000. Well/septi"
        }
      ]
    },
    {
      "name": "Site work (clearing, grading, site prep)",
      "description": "Preparing the lot to build: tree/brush clearing, rough grading, access, erosion control. (Foundation excavation is counted in the foundation phase, per NAHB.)",
      "shareOfBudgetPct": 3,
      "items": [
        {
          "name": "Land clearing",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1400,
          "typicalHighUSD": 5800,
          "notes": "Labor-inclusive. Angi/LawnStarter 2025-26: typical lot clearing $1,400-$5,800; lightly forested $733-$2,333/acre, heavily forested $3,395-$6,155/acre."
        },
        {
          "name": "Site preparation & rough grading",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1300,
          "typicalHighUSD": 5600,
          "notes": "Labor-inclusive. Angi: site prep averages $3,800 (range $1,300-$5,600), or $1.50-$5.00 per sq ft."
        }
      ]
    },
    {
      "name": "Foundation",
      "description": "Excavation, footings, foundation walls/slab, concrete flatwork, backfill. NAHB 2024: foundations = 10.5% of construction cost (~$44,748); excavation+foundation+concrete+retaining walls+backfill together were >$43,000. Th",
      "shareOfBudgetPct": 10.5,
      "items": [
        {
          "name": "Foundation excavation",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1700,
          "typicalHighUSD": 6700,
          "notes": "Labor/equipment-inclusive. Angi 2025-26: excavation averages $3,980, most jobs $1,659-$6,710."
        },
        {
          "name": "Concrete slab-on-grade foundation (option A)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 12000,
          "typicalHighUSD": 28000,
          "notes": "Labor-inclusive. HomeGuide/Inch Calculator: $6-$14/sq ft; $12,000-$28,000 at 2,000 sq ft of slab (a 2-story home's ~1,000-1,300 sq ft footprint lands at the low end)."
        },
        {
          "name": "Crawl space foundation (option B)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 15000,
          "typicalHighUSD": 36000,
          "notes": "Labor-inclusive. HomeGuide: $15-$18/sq ft; $30,000-$36,000 for 2,000 sq ft of footprint, less for a 2-story footprint."
        },
        {
          "name": "Full basement foundation, unfinished (option C)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 40000,
          "typicalHighUSD": 100000,
          "notes": "Labor-inclusive. HomeGuide/HomeAdvisor: $20-$50/sq ft unfinished; full-basement foundations commonly $70,000-$100,000+."
        }
      ]
    },
    {
      "name": "Framing (structure, trusses, sheathing)",
      "description": "The structural shell: floor/wall/roof framing, roof trusses, wall and roof sheathing. NAHB 2024: framing incl. trusses and sheathing = 16.6% (~$71,000; framing alone $49,763, largest single line item).",
      "shareOfBudgetPct": 16.5,
      "items": [
        {
          "name": "Framing labor + lumber package (floors, walls, roof structure)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 14000,
          "typicalHighUSD": 32000,
          "notes": "Labor-inclusive at $7-$16/sq ft (Angi/HomeAdvisor 2025-26) = $14,000-$32,000 for 2,000 sq ft. Lumber (material only) is $1-$5/sq ft, i.e. $2,000-$10,000 of that, plus 15-20% waste factor."
        },
        {
          "name": "Roof trusses",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 6000,
          "typicalHighUSD": 16000,
          "notes": "Installed at $5-$14/sq ft of roof area (HomeGuide/Angi); wood trusses $60-$500 each material-only. NAHB 2024 avg $12,903. Low end reflects a 2-story home's smaller roof plane."
        },
        {
          "name": "Wall & roof sheathing (OSB/plywood)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 3500,
          "typicalHighUSD": 9000,
          "notes": "7/16-in OSB $14-$20/sheet, 1/2-in CDX plywood $28-$52/sheet (material); installed $2-$8/sq ft incl. labor. NAHB 2024 avg $6,513."
        }
      ]
    },
    {
      "name": "Roofing",
      "description": "Underlayment, shingles/roof covering, flashing, drip edge. NAHB 2024: roofing avg $16,732 (~3.9% of construction cost).",
      "shareOfBudgetPct": 4,
      "items": [
        {
          "name": "Asphalt shingle roof, installed (underlayment + shingles + flashing)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 6000,
          "typicalHighUSD": 15000,
          "notes": "Labor-inclusive. Materials $80-$280/square; installed $200-$700/square (HomeGuide). HomeGuide: $5,700-$12,000 typical for a 2,000 sq ft home; Angi range $7,500-$24,000. Labor is ~60% of total. Metal/t"
        }
      ]
    },
    {
      "name": "Windows & exterior doors",
      "description": "All window units, entry/exterior doors, garage door. NAHB 2024: windows and doors avg $15,990 (3.7%).",
      "shareOfBudgetPct": 3.5,
      "items": [
        {
          "name": "New-construction windows (~15-20 units)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 7000,
          "typicalHighUSD": 21000,
          "notes": "Labor-inclusive. HomeAdvisor: new-construction (flange-mount) windows $450-$1,050 each installed; Homewyse national avg $639-$978/window. Range = 15-20 standard vinyl double-pane units."
        },
        {
          "name": "Entry / exterior doors (2-3)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1500,
          "typicalHighUSD": 7000,
          "notes": "Labor-inclusive. HomeAdvisor: exterior door install avg $1,456 ($546-$2,374 each); entry doors $500-$4,500 depending on material/glazing."
        },
        {
          "name": "Garage door (double)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2400,
          "typicalHighUSD": 4500,
          "notes": "Labor-inclusive. This Old House/HomeGuide: single-car $844-$3,498 (avg $2,171); double-car $2,435-$4,522 (avg $3,478); installation labor $150-$700 of that."
        }
      ]
    },
    {
      "name": "Siding & exterior finish",
      "description": "House wrap, siding/masonry veneer, exterior trim, gutters. NAHB 2024: exterior wall finish avg $24,450 (~5.7%).",
      "shareOfBudgetPct": 6,
      "items": [
        {
          "name": "Siding, installed (vinyl to fiber cement)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 7000,
          "typicalHighUSD": 25000,
          "notes": "Labor-inclusive. For a 2,000 sq ft house: vinyl $3.50-$5.50/sq ft = $7,000-$11,700; fiber cement (Hardie) $8-$15/sq ft = ~$9,400-$30,000; most 2,000 sq ft jobs land $10,000-$25,000 (Angi/This Old Hous"
        },
        {
          "name": "Gutters & downspouts (~200 linear ft)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1000,
          "typicalHighUSD": 3000,
          "notes": "Labor-inclusive. This Old House/Angi: vinyl $3-$7/LF, aluminum $4-$15/LF installed; a 2,000 sq ft home needs ~200 LF. Seamless/copper systems can reach $12,000."
        }
      ]
    },
    {
      "name": "Rough plumbing",
      "description": "Supply and DWV piping through the structure (fixtures excluded — see fixtures phase). NAHB 2024: plumbing except fixtures avg $27,180 (6.3%).",
      "shareOfBudgetPct": 6,
      "items": [
        {
          "name": "Rough-in plumbing, whole house (2.5-3 baths)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 20000,
          "notes": "Labor-inclusive. HomeGuide/trade guides 2025: new-construction rough-in $300-$600 per fixture, or ~$4.00-$5.00/sq ft = $8,000-$12,000 typical for 2,000 sq ft; high end covers 3+ baths, PEX-to-copper u"
        }
      ]
    },
    {
      "name": "Rough electrical",
      "description": "Service panel, wiring, boxes, devices (light fixtures excluded — see fixtures phase). NAHB 2024: electrical except fixtures avg $27,383 (6.4%).",
      "shareOfBudgetPct": 6,
      "items": [
        {
          "name": "Complete house wiring (200A service, rough + finish)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 18000,
          "notes": "Labor-inclusive. HomeGuide/Fixr: new-house wiring $4-$9/sq ft = $8,000-$18,000 for 2,000 sq ft. Rough-in-only portion is $2-$4/sq ft ($4,000-$8,000); labor is $2-$5/sq ft of the total."
        }
      ]
    },
    {
      "name": "HVAC",
      "description": "Heating/cooling equipment plus duct distribution. NAHB 2024: HVAC rough-in ~$27,700 (part of the 19.2% major-systems stage).",
      "shareOfBudgetPct": 6.5,
      "items": [
        {
          "name": "Furnace + central AC system, installed",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 10000,
          "typicalHighUSD": 20000,
          "notes": "Labor-inclusive. HomeGuide/Angi: full heat+cool system for a 2,000-2,500 sq ft home $10,000-$20,000 (most pay ~$14,000); new-construction guideline $1.75-$2.50/sq ft plus ductwork; 2026 mid-size-home "
        },
        {
          "name": "Ductwork (new install)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2000,
          "typicalHighUSD": 5000,
          "notes": "Labor-inclusive. Fixr/HomeGuide: new ductwork adds $2,000-$5,000 in new construction ($1-$13/LF, walls open)."
        }
      ]
    },
    {
      "name": "Insulation",
      "description": "Wall batts, attic blown-in, air sealing. NAHB 2024 avg $6,992 (1.6%). Spray-foam item is an upgrade alternative.",
      "shareOfBudgetPct": 1.5,
      "items": [
        {
          "name": "Fiberglass batts (walls) + blown-in attic insulation",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2500,
          "typicalHighUSD": 7000,
          "notes": "Labor-inclusive. HomeAdvisor/Thumbtack: batts $0.50-$1.30/sq ft installed; blown-in attic $975-$2,200. NAHB 2024 avg $6,992."
        },
        {
          "name": "Spray foam whole-house upgrade (alternative)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 25000,
          "notes": "Labor-inclusive. HomeAdvisor/HomeGuide: $1-$4/sq ft (open-cell $1.00-$3.50, closed-cell $1.50-$5.00); insulating an average new-construction home with spray foam runs $14,100-$30,500."
        }
      ]
    },
    {
      "name": "Drywall",
      "description": "Hang, tape, finish, and texture all interior walls/ceilings. NAHB 2024 avg $13,962 (3.3%).",
      "shareOfBudgetPct": 3.5,
      "items": [
        {
          "name": "Drywall installed & finished, whole house",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 20000,
          "notes": "Labor-inclusive. HomeGuide: $1.50-$3.50/sq ft of surface ($30-$70/sheet hung+finished); a 2,000 sq ft house runs $8,000-$30,000 with high ceilings/level-5 finish at the extreme. Board material alone $"
        }
      ]
    },
    {
      "name": "Interior trim & doors",
      "description": "Interior doors, baseboard, casing, window stools, closet shelving, stair rail. NAHB 2024: interior trims/doors/mirrors avg $12,920 (3.0%).",
      "shareOfBudgetPct": 3,
      "items": [
        {
          "name": "Interior doors (~10, prehung)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1500,
          "typicalHighUSD": 6500,
          "notes": "Labor-inclusive. Angi/Homewyse: $150-$600 per basic door installed (Homewyse avg $444-$675). Hollow-core slab low end; solid-core/shaker high end."
        },
        {
          "name": "Baseboard, casing & misc trim",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2500,
          "typicalHighUSD": 7000,
          "notes": "Labor-inclusive. HomeGuide/HomeAdvisor: baseboard $5-$9/LF installed; whole-house trim packages scale with LF count and material (MDF vs hardwood)."
        }
      ]
    },
    {
      "name": "Cabinets & countertops",
      "description": "Kitchen cabinetry, bath vanities, and countertops. NAHB 2024: cabinets+countertops avg $19,056 (4.5%).",
      "shareOfBudgetPct": 4.5,
      "items": [
        {
          "name": "Kitchen cabinets",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 4000,
          "typicalHighUSD": 15000,
          "notes": "Labor-inclusive. Angi 2025: average kitchen cabinet project $6,317; stock RTA at the low end, semi-custom at the high end; full custom exceeds this range."
        },
        {
          "name": "Kitchen countertops (granite/quartz)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2000,
          "typicalHighUSD": 8000,
          "notes": "Labor-inclusive. HomeAdvisor 2025: granite $2,000-$4,000 (avg $3,250; material $40-$60/sq ft); quartz $1,500-$8,000 (avg $4,500; $50-$200/sq ft with $10-$30/sq ft labor). Laminate is cheaper."
        },
        {
          "name": "Bathroom vanities (2-3)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 800,
          "typicalHighUSD": 5000,
          "notes": "Labor-inclusive. Angi/HomeGuide: $400-$2,200 each installed premade; custom $1,000-$4,000 each."
        }
      ]
    },
    {
      "name": "Flooring",
      "description": "Finish floor coverings throughout. NAHB 2024 avg $15,388 (3.6%). Typical builds mix LVP/carpet; items below show per-material totals if used for the whole 2,000 sq ft.",
      "shareOfBudgetPct": 3.5,
      "items": [
        {
          "name": "Luxury vinyl plank (LVP), whole house",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 22000,
          "notes": "Labor-inclusive. 2025 guides: $4-$11/sq ft installed (budget $4-$6, mid $6-$8, high $8-$11+)."
        },
        {
          "name": "Carpet (bedrooms/upstairs)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 8000,
          "typicalHighUSD": 13000,
          "notes": "Labor-inclusive. $4.00-$6.50/sq ft installed (2025); shown as whole-house total — a typical mixed build carpets only ~40-50% of the area."
        },
        {
          "name": "Hardwood (upgrade alternative)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 18000,
          "typicalHighUSD": 46000,
          "notes": "Labor-inclusive. 2025: $9-$23/sq ft installed depending on species and labor market."
        }
      ]
    },
    {
      "name": "Paint",
      "description": "Interior prime and finish coats on walls, ceilings, and trim (exterior paint typically rides with the siding line). NAHB 2024: painting avg $11,150 (2.6%).",
      "shareOfBudgetPct": 2.5,
      "items": [
        {
          "name": "Interior painting, whole house",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 6000,
          "typicalHighUSD": 12200,
          "notes": "Labor-inclusive. HomeGuide/HomeAdvisor: $1-$3/sq ft; a 2,000 sq ft interior typically totals $6,000-$12,200 including trim/baseboard painting ($1-$4/LF)."
        }
      ]
    },
    {
      "name": "Fixtures & appliances",
      "description": "Finish plumbing fixtures, water heater, light fixtures, and appliance package. NAHB 2024: plumbing fixtures $7,922 + lighting $5,392 + appliances $7,499 + fireplace $2,378 = ~5.4%.",
      "shareOfBudgetPct": 5.5,
      "items": [
        {
          "name": "Plumbing fixtures (toilets, sinks, faucets, tub/shower units)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 3000,
          "typicalHighUSD": 10000,
          "notes": "Mostly material; setting labor often in the plumbing contract. Toilets $100-$500+ each (material); tub/shower units drive the high end. NAHB 2024 avg $7,922."
        },
        {
          "name": "Water heater, installed",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 900,
          "typicalHighUSD": 3000,
          "notes": "Labor-inclusive. Angi 2025: tank replacement/install $881-$1,825 (avg $1,347); 50-gal gas $1,200-$1,800; whole-house tankless $1,800-$5,500."
        },
        {
          "name": "Light fixtures, whole house",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2000,
          "typicalHighUSD": 6500,
          "notes": "Labor-inclusive. Angi/HomeGuide: $100-$650 per fixture installed; recessed cans $130-$300 each. NAHB 2024 avg $5,392."
        },
        {
          "name": "Kitchen appliance package (fridge, range, dishwasher, microwave)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2100,
          "typicalHighUSD": 6800,
          "notes": "Material (retail package $2,100-$6,800 per HomeGuide/HomeAdvisor); installation labor adds $100-$350 per appliance. Pro-grade packages far exceed this."
        }
      ]
    },
    {
      "name": "Driveway, landscaping & final steps",
      "description": "Flatwork, final grade, lawn/plantings, optional deck/porch, and final cleanup. NAHB 2024 final steps = 6.5% ($27,710): driveway $9,635, landscaping $9,239, outdoor structures $4,722, cleanup $3,183.",
      "shareOfBudgetPct": 7,
      "items": [
        {
          "name": "Concrete driveway",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 2700,
          "typicalHighUSD": 14500,
          "notes": "Labor-inclusive. Angi/HomeAdvisor 2025-26: $8-$20/sq ft (most standard installs $8-$12/sq ft), avg project $6,400; NAHB 2024 avg $9,635. Asphalt or gravel cheaper."
        },
        {
          "name": "Final grading, lawn seed/sod & landscaping",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 3000,
          "typicalHighUSD": 10000,
          "notes": "Labor-inclusive. Homewyse: finish grading $1.13-$1.52/sq ft; grade-and-seed $0.65-$2.70/sq ft; new lawn establishment $0.25-$0.70/sq ft. NAHB 2024 landscaping avg $9,239."
        },
        {
          "name": "Deck / porch / patio (optional)",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 4000,
          "typicalHighUSD": 16000,
          "notes": "Labor-inclusive, optional scope. HomeAdvisor 2025: deck avg $8,250 ($4,340-$12,589) at $30-$60/sq ft; porches $4,800-$24,000. NAHB 2024 outdoor-structures avg $4,722."
        },
        {
          "name": "Final construction cleanup & debris removal",
          "unit": "typ. total — 2,000 sf ref build",
          "typicalLowUSD": 1000,
          "typicalHighUSD": 3500,
          "notes": "Labor-inclusive. NAHB 2024 avg $3,183 for cleanup on a 2,647 sq ft build; smaller homes at the low end."
        }
      ]
    }
  ]
};

export interface RemodelGuide {
  name: string;
  lowUSD: number;
  highUSD: number;
  costBasis: string;
  phases: GuidePhase[];
}

export const REMODEL_GUIDE: RemodelGuide[] = [
  {
    "name": "Kitchen remodel",
    "lowUSD": 14500,
    "highUSD": 65000,
    "costBasis": "Total project, mid-size (~150-200 sq ft) US kitchen, labor + materials; low = minor remodel keeping layout (Angi/HomeAdvisor typical range $14,589-$41,538, avg ~$27,000), high = major remodel with new cabinets, appliance",
    "phases": [
      {
        "name": "Planning, permits & site protection",
        "items": [
          {
            "name": "Design / kitchen designer fee",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 5000,
            "notes": "Optional; design-build firms often charge a % of project instead"
          },
          {
            "name": "Building permit",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 1500,
            "notes": "Single-room renovation permits run ~$500-$2,000 (Angi); required for plumbing/electrical/gas changes"
          },
          {
            "name": "Ram Board floor protection",
            "unit": "per 38 in x 50 ft roll",
            "typicalLowUSD": 36,
            "typicalHighUSD": 40,
            "notes": "Material only; $35.95/roll at Home Depot; protects flooring along demo/delivery paths"
          },
          {
            "name": "Dust barrier (plastic sheeting + ZipWall-style poles or tape)",
            "unit": "flat",
            "typicalLowUSD": 30,
            "typicalHighUSD": 250,
            "notes": "Material only; 3-mil poly is cheap, spring-pole kits ~$100-$250; commonly forgotten"
          }
        ]
      },
      {
        "name": "Demolition & disposal",
        "items": [
          {
            "name": "Demo labor (cabinets, counters, flooring tear-out)",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 3000,
            "notes": "Labor; interior gut demo runs $2-$8 per sq ft (Angi)"
          },
          {
            "name": "Dumpster rental (10-20 yd, 1 week)",
            "unit": "per week",
            "typicalLowUSD": 225,
            "typicalHighUSD": 700,
            "notes": "National avg roll-off ~$485; 10-yd $225-$575, 20-yd $275-$700 (Dumpsters.com/HomeGuide)"
          },
          {
            "name": "Old appliance haul-away/disposal fee",
            "unit": "per appliance",
            "typicalLowUSD": 25,
            "typicalHighUSD": 100,
            "notes": "Often forgotten; retailers charge per unit at delivery"
          }
        ]
      },
      {
        "name": "Rough-in changes (plumbing, electrical, gas)",
        "items": [
          {
            "name": "Plumbing rough-in / fixture relocation",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 8500,
            "notes": "Labor-inclusive; kitchen plumbing rough-in $2,000-$8,500 (nat. avg ~$4,500); low end = keeping sink location; moving plumbing can run $1,500-$15,000"
          },
          {
            "name": "Electrical rework (new circuits, GFCI outlets, code updates)",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 3000,
            "notes": "Labor-inclusive; electrical relocations $500-$3,000"
          },
          {
            "name": "Gas line modification",
            "unit": "flat",
            "typicalLowUSD": 375,
            "typicalHighUSD": 750,
            "notes": "Labor-inclusive; only if range/cooktop moves or converts"
          },
          {
            "name": "Drywall patch / replacement",
            "unit": "per sq ft",
            "typicalLowUSD": 2.4,
            "typicalHighUSD": 4,
            "notes": "Labor-inclusive (HomeAdvisor); needed after rough-in changes"
          }
        ]
      },
      {
        "name": "Cabinets & countertops",
        "items": [
          {
            "name": "Cabinets (stock to semi-custom, materials)",
            "unit": "flat",
            "typicalLowUSD": 5000,
            "typicalHighUSD": 25000,
            "notes": "Material only for wood cabinets (Angi); stainless/custom can hit $25k-$38k"
          },
          {
            "name": "Cabinet installation labor",
            "unit": "flat",
            "typicalLowUSD": 2000,
            "typicalHighUSD": 9000,
            "notes": "Labor; installation/labor is roughly 25% of a kitchen remodel budget (Angi)"
          },
          {
            "name": "Countertops installed",
            "unit": "flat",
            "typicalLowUSD": 1800,
            "typicalHighUSD": 4400,
            "notes": "Labor-inclusive (Angi/HomeAdvisor); quartz/stainless can reach $10,000+"
          },
          {
            "name": "Sink + faucet installed",
            "unit": "flat",
            "typicalLowUSD": 600,
            "typicalHighUSD": 2000,
            "notes": "Labor-inclusive; sink install alone $216-$663, faucet labor $260-$480 (Angi)"
          }
        ]
      },
      {
        "name": "Surfaces & finishes",
        "items": [
          {
            "name": "Backsplash installed",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 1500,
            "notes": "Labor-inclusive; avg ~$1,000, ~$25/sq ft typical, $5-$150/sq ft by material (Fixr)"
          },
          {
            "name": "Kitchen flooring installed (tile or LVP)",
            "unit": "per sq ft",
            "typicalLowUSD": 4,
            "typicalHighUSD": 15,
            "notes": "Labor-inclusive; LVP $4-$11/sq ft, ceramic tile $5-$15/sq ft"
          },
          {
            "name": "Interior painting (walls/ceiling)",
            "unit": "flat",
            "typicalLowUSD": 300,
            "typicalHighUSD": 1200,
            "notes": "Labor-inclusive at $2-$6 per sq ft of wall area for a kitchen-sized room"
          },
          {
            "name": "Lighting (recessed, pendants, under-cabinet)",
            "unit": "flat",
            "typicalLowUSD": 300,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive; scales with fixture count"
          }
        ]
      },
      {
        "name": "Appliances",
        "items": [
          {
            "name": "Appliance package installed (range, fridge, dishwasher, microwave/hood)",
            "unit": "flat",
            "typicalLowUSD": 2200,
            "typicalHighUSD": 26500,
            "notes": "Labor-inclusive (HomeAdvisor); mid-range packages cluster $4,000-$10,000"
          }
        ]
      },
      {
        "name": "Finish & punch list",
        "items": [
          {
            "name": "Baseboard/trim reinstall or replace",
            "unit": "per linear foot",
            "typicalLowUSD": 5.7,
            "typicalHighUSD": 9,
            "notes": "Labor-inclusive (Angi/HomeAdvisor)"
          },
          {
            "name": "Caulk, touch-up paint & cabinet hardware",
            "unit": "flat",
            "typicalLowUSD": 50,
            "typicalHighUSD": 300,
            "notes": "Material only; commonly forgotten line item"
          },
          {
            "name": "Post-construction cleaning",
            "unit": "flat",
            "typicalLowUSD": 200,
            "typicalHighUSD": 600,
            "notes": "Labor; deep clean incl. dust removal"
          }
        ]
      }
    ]
  },
  {
    "name": "Bathroom remodel",
    "lowUSD": 6500,
    "highUSD": 28000,
    "costBasis": "Total project, full bath (~40 sq ft), labor + materials; low = basic pull-and-replace with stock fixtures, high = mid-to-high-end remodel with tile shower; luxury primary baths exceed $40,000",
    "phases": [
      {
        "name": "Planning, permits & site protection",
        "items": [
          {
            "name": "Building permit",
            "unit": "flat",
            "typicalLowUSD": 200,
            "typicalHighUSD": 800,
            "notes": "Single-room permit; required for plumbing/electrical changes"
          },
          {
            "name": "Floor/hallway protection + dust barrier",
            "unit": "flat",
            "typicalLowUSD": 30,
            "typicalHighUSD": 100,
            "notes": "Material only; Ram Board ~$36/50-ft roll + poly sheeting"
          }
        ]
      },
      {
        "name": "Demolition & disposal",
        "items": [
          {
            "name": "Demo labor (tub/tile/vanity tear-out)",
            "unit": "flat",
            "typicalLowUSD": 300,
            "typicalHighUSD": 1500,
            "notes": "Labor; gut demo $2-$8 per sq ft, small footprint"
          },
          {
            "name": "Dumpster rental (10 yd, 1 week)",
            "unit": "per week",
            "typicalLowUSD": 225,
            "typicalHighUSD": 575,
            "notes": "HomeGuide/Dumpsters.com; tile and cast-iron tub debris is heavy — watch weight limits"
          },
          {
            "name": "Old fixture removal/disposal (toilet, tub)",
            "unit": "per fixture",
            "typicalLowUSD": 50,
            "typicalHighUSD": 200,
            "notes": "Labor + dump fee; toilet removal alone runs $50-$200 (HomeAdvisor)"
          }
        ]
      },
      {
        "name": "Rough-in changes (plumbing, electrical, ventilation)",
        "items": [
          {
            "name": "Plumbing rough-in changes / valve replacement",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 4000,
            "notes": "Labor-inclusive; moving fixtures pushes toward high end"
          },
          {
            "name": "Electrical updates (GFCI, lighting circuit)",
            "unit": "flat",
            "typicalLowUSD": 200,
            "typicalHighUSD": 1500,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Exhaust fan installed (vented outside)",
            "unit": "each",
            "typicalLowUSD": 250,
            "typicalHighUSD": 950,
            "notes": "Labor-inclusive (HomeGuide/Angi); avg ~$400; new duct run raises cost"
          },
          {
            "name": "Shower waterproofing (cement board + membrane)",
            "unit": "flat",
            "typicalLowUSD": 300,
            "typicalHighUSD": 1200,
            "notes": "Labor + materials; skipping it risks $5,000-$15,000 water-damage repairs later"
          }
        ]
      },
      {
        "name": "Tub/shower & tile",
        "items": [
          {
            "name": "Bathtub replacement (standard alcove)",
            "unit": "each",
            "typicalLowUSD": 1600,
            "typicalHighUSD": 6500,
            "notes": "Labor-inclusive (Fixr); like-for-like swap commonly $2,000-$3,000"
          },
          {
            "name": "Walk-in shower installed",
            "unit": "each",
            "typicalLowUSD": 4000,
            "typicalHighUSD": 20000,
            "notes": "Labor-inclusive (Angi/This Old House); prefab $4,000-$7,000, custom tile $14,000-$20,000+"
          },
          {
            "name": "Shower wall tile installed",
            "unit": "flat",
            "typicalLowUSD": 800,
            "typicalHighUSD": 2600,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Bathroom floor tile installed",
            "unit": "flat",
            "typicalLowUSD": 600,
            "typicalHighUSD": 2400,
            "notes": "Labor-inclusive"
          }
        ]
      },
      {
        "name": "Fixtures",
        "items": [
          {
            "name": "Toilet installed",
            "unit": "each",
            "typicalLowUSD": 224,
            "typicalHighUSD": 600,
            "notes": "Labor-inclusive (HomeAdvisor/Angi); avg ~$374"
          },
          {
            "name": "Vanity (unit + install)",
            "unit": "each",
            "typicalLowUSD": 300,
            "typicalHighUSD": 1800,
            "notes": "Premade vanities $300-$900 material; custom $1,300-$1,800; add sink/faucet hookup labor"
          },
          {
            "name": "Bathroom faucet installed",
            "unit": "each",
            "typicalLowUSD": 150,
            "typicalHighUSD": 500,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Shower door (framed to frameless)",
            "unit": "each",
            "typicalLowUSD": 600,
            "typicalHighUSD": 1400,
            "notes": "Labor-inclusive; frameless slider ~$1,000"
          }
        ]
      },
      {
        "name": "Finish & punch list",
        "items": [
          {
            "name": "Painting (moisture-resistant)",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 500,
            "notes": "Labor-inclusive for small room"
          },
          {
            "name": "Accessories (mirror, towel bars, hooks)",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 500,
            "notes": "Material only"
          },
          {
            "name": "Caulk, grout sealer & touch-up",
            "unit": "flat",
            "typicalLowUSD": 25,
            "typicalHighUSD": 150,
            "notes": "Material only; commonly forgotten"
          },
          {
            "name": "Post-construction cleaning",
            "unit": "flat",
            "typicalLowUSD": 150,
            "typicalHighUSD": 400,
            "notes": "Labor"
          }
        ]
      }
    ]
  },
  {
    "name": "Whole-home remodel",
    "lowUSD": 28000,
    "highUSD": 300000,
    "costBasis": "Total project, 2,000 sq ft US home; low = cosmetic whole-home refresh at $15-$60/sq ft (paint, flooring, fixtures), high = full gut renovation at $60-$150/sq ft (HomeGuide/Rocket Mortgage)",
    "phases": [
      {
        "name": "Planning, design & permits",
        "items": [
          {
            "name": "Architect/design fees",
            "unit": "flat",
            "typicalLowUSD": 2000,
            "typicalHighUSD": 20000,
            "notes": "Often 5-15% of construction cost for full-scope design; low end = drafting only"
          },
          {
            "name": "Whole-home renovation permit",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 2000,
            "notes": "Angi: up to ~$2,000 for whole-home renovation"
          },
          {
            "name": "Dust barriers + floor protection (whole house)",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 500,
            "notes": "Material only; Ram Board rolls + poly sheeting per work zone"
          }
        ]
      },
      {
        "name": "Demolition & disposal",
        "items": [
          {
            "name": "Interior demo / gut to studs",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 8,
            "notes": "Labor + disposal (Angi); most homeowners spend ~$3,000 for partial gut, full-house gut far more"
          },
          {
            "name": "Dumpster rental (30 yd)",
            "unit": "per week",
            "typicalLowUSD": 311,
            "typicalHighUSD": 718,
            "notes": "HomeGuide; budget 2-4 pulls for a full gut"
          },
          {
            "name": "Hazmat surprises allowance (asbestos/lead in pre-1980 homes)",
            "unit": "flat",
            "typicalLowUSD": 0,
            "typicalHighUSD": 5000,
            "notes": "Testing + abatement; commonly forgotten contingency"
          }
        ]
      },
      {
        "name": "Structural & systems rough-in",
        "items": [
          {
            "name": "Load-bearing wall removal with beam",
            "unit": "each",
            "typicalLowUSD": 1200,
            "typicalHighUSD": 10000,
            "notes": "Labor-inclusive; non-load-bearing walls are far cheaper"
          },
          {
            "name": "Electrical panel upgrade (to 200A)",
            "unit": "flat",
            "typicalLowUSD": 1200,
            "typicalHighUSD": 4500,
            "notes": "Labor-inclusive (Fixr); ~$3,000 typical for 100A-to-200A swap in place"
          },
          {
            "name": "HVAC system replacement",
            "unit": "flat",
            "typicalLowUSD": 5000,
            "typicalHighUSD": 12500,
            "notes": "Labor-inclusive (HomeAdvisor); avg ~$7,500 unit + labor"
          },
          {
            "name": "Whole-house repipe (if plumbing is failing)",
            "unit": "flat",
            "typicalLowUSD": 4000,
            "typicalHighUSD": 15000,
            "notes": "Labor-inclusive; optional — only when existing supply lines are at end of life"
          },
          {
            "name": "Water heater replacement",
            "unit": "each",
            "typicalLowUSD": 800,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive; tankless conversions run higher"
          },
          {
            "name": "Insulation (walls/attic where opened)",
            "unit": "per sq ft",
            "typicalLowUSD": 0.3,
            "typicalHighUSD": 6.75,
            "notes": "Labor-inclusive; range spans batts to spray foam"
          }
        ]
      },
      {
        "name": "Surfaces (drywall, paint, flooring, windows)",
        "items": [
          {
            "name": "Drywall replacement",
            "unit": "per sq ft",
            "typicalLowUSD": 2.4,
            "typicalHighUSD": 4,
            "notes": "Labor-inclusive (HomeAdvisor)"
          },
          {
            "name": "Interior painting (walls; add ceilings/trim at high end)",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 6,
            "notes": "Labor-inclusive; $4.70-$6.75/sq ft with ceilings, trim, doors"
          },
          {
            "name": "Flooring installed (material-dependent)",
            "unit": "per sq ft",
            "typicalLowUSD": 3,
            "typicalHighUSD": 12,
            "notes": "Labor-inclusive; hardwood runs $9-$23/sq ft"
          },
          {
            "name": "Window replacement",
            "unit": "each",
            "typicalLowUSD": 300,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive; 2025 avg ~$491/window (This Old House/Angi)"
          }
        ]
      },
      {
        "name": "Kitchen & bath sub-projects",
        "items": [
          {
            "name": "Kitchen remodel allowance",
            "unit": "flat",
            "typicalLowUSD": 14500,
            "typicalHighUSD": 65000,
            "notes": "Labor-inclusive; see Kitchen remodel breakdown"
          },
          {
            "name": "Bathroom remodel allowance",
            "unit": "per bathroom",
            "typicalLowUSD": 6500,
            "typicalHighUSD": 28000,
            "notes": "Labor-inclusive; see Bathroom remodel breakdown"
          }
        ]
      },
      {
        "name": "Finish & punch list",
        "items": [
          {
            "name": "Interior doors installed",
            "unit": "each",
            "typicalLowUSD": 150,
            "typicalHighUSD": 800,
            "notes": "Labor-inclusive; prehung slab in existing opening at low end"
          },
          {
            "name": "Baseboard & trim installed",
            "unit": "per linear foot",
            "typicalLowUSD": 5.7,
            "typicalHighUSD": 9,
            "notes": "Labor-inclusive (Angi/HomeAdvisor)"
          },
          {
            "name": "Touch-up paint & caulk",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 400,
            "notes": "Material only"
          },
          {
            "name": "Final construction clean (whole house)",
            "unit": "flat",
            "typicalLowUSD": 400,
            "typicalHighUSD": 1000,
            "notes": "Labor"
          }
        ]
      }
    ]
  },
  {
    "name": "Basement finish",
    "lowUSD": 15000,
    "highUSD": 75000,
    "costBasis": "Total project, ~500-1,500 sq ft unfinished basement converted to living space at $30-$50/sq ft (HomeGuide); high end includes a bathroom and wet bar",
    "phases": [
      {
        "name": "Planning, permits & site prep",
        "items": [
          {
            "name": "Building permit",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 2000,
            "notes": "Habitable-space conversion needs permits + egress compliance"
          },
          {
            "name": "Dumpster rental (20 yd)",
            "unit": "per week",
            "typicalLowUSD": 275,
            "typicalHighUSD": 700,
            "notes": "HomeGuide/Dumpsters.com; less debris than a gut but still needed"
          },
          {
            "name": "Moisture testing & crack sealing",
            "unit": "flat",
            "typicalLowUSD": 250,
            "typicalHighUSD": 1000,
            "notes": "Labor-inclusive; do before covering walls — commonly skipped and regretted"
          }
        ]
      },
      {
        "name": "Water management & egress",
        "items": [
          {
            "name": "Egress window installed (code-required for bedrooms)",
            "unit": "each",
            "typicalLowUSD": 2000,
            "typicalHighUSD": 5900,
            "notes": "Labor-inclusive incl. concrete cutting + well; national avg $3,850-$4,200 (The Basement Guide)"
          },
          {
            "name": "Sump pump installed",
            "unit": "each",
            "typicalLowUSD": 600,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive (Angi avg ~$1,100); optional if basement is dry"
          }
        ]
      },
      {
        "name": "Framing & rough-in",
        "items": [
          {
            "name": "Basement framing",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 3000,
            "notes": "Labor-inclusive; avg ~$1,795, $7-$16 per linear foot framing only (HomeAdvisor)"
          },
          {
            "name": "Electrical rough-in + recessed lighting",
            "unit": "flat",
            "typicalLowUSD": 1500,
            "typicalHighUSD": 5000,
            "notes": "Labor-inclusive; new circuits, outlets, cans"
          },
          {
            "name": "HVAC duct extensions",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 2000,
            "notes": "Labor-inclusive; extend supply/return runs to new rooms"
          }
        ]
      },
      {
        "name": "Insulation, drywall & ceiling",
        "items": [
          {
            "name": "Insulation",
            "unit": "per sq ft",
            "typicalLowUSD": 0.3,
            "typicalHighUSD": 6.75,
            "notes": "Labor-inclusive; rigid foam/spray foam on rim joists and walls at high end"
          },
          {
            "name": "Drywall installed",
            "unit": "per sq ft of surface",
            "typicalLowUSD": 1.5,
            "typicalHighUSD": 3.5,
            "notes": "Labor-inclusive (HomeGuide basement figure)"
          },
          {
            "name": "Drop ceiling (alternative to drywall ceiling)",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 10,
            "notes": "Labor-inclusive; keeps utility access; sources range $2-$20/sq ft"
          }
        ]
      },
      {
        "name": "Flooring & surfaces",
        "items": [
          {
            "name": "LVP flooring installed (moisture-tolerant)",
            "unit": "per sq ft",
            "typicalLowUSD": 4,
            "typicalHighUSD": 11,
            "notes": "Labor-inclusive; most common basement choice"
          },
          {
            "name": "Carpet installed",
            "unit": "per sq ft",
            "typicalLowUSD": 4,
            "typicalHighUSD": 6.5,
            "notes": "Labor-inclusive (HomeGuide)"
          },
          {
            "name": "Painting (walls + ceiling)",
            "unit": "flat",
            "typicalLowUSD": 800,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive at $2-$6/sq ft of wall area"
          }
        ]
      },
      {
        "name": "Optional basement bathroom",
        "items": [
          {
            "name": "Basement bathroom addition",
            "unit": "flat",
            "typicalLowUSD": 3000,
            "typicalHighUSD": 12500,
            "notes": "Labor-inclusive; $200-$250 per sq ft for 15-50 sq ft (HomeGuide)"
          },
          {
            "name": "Sewage ejector pump (below-grade drains)",
            "unit": "each",
            "typicalLowUSD": 2000,
            "typicalHighUSD": 5500,
            "notes": "Labor-inclusive; required when bathroom sits below the main drain line — commonly forgotten"
          }
        ]
      },
      {
        "name": "Finish & punch list",
        "items": [
          {
            "name": "Interior doors + baseboard/trim",
            "unit": "flat",
            "typicalLowUSD": 800,
            "typicalHighUSD": 3000,
            "notes": "Labor-inclusive; baseboard $5.70-$9 per linear foot"
          },
          {
            "name": "Touch-up paint & caulk",
            "unit": "flat",
            "typicalLowUSD": 50,
            "typicalHighUSD": 250,
            "notes": "Material only"
          },
          {
            "name": "Post-construction cleaning",
            "unit": "flat",
            "typicalLowUSD": 200,
            "typicalHighUSD": 500,
            "notes": "Labor"
          }
        ]
      }
    ]
  },
  {
    "name": "Room addition",
    "lowUSD": 16000,
    "highUSD": 50000,
    "costBasis": "Total project, ~200 sq ft single-room ground-level addition at $80-$250 per sq ft including labor and materials (Angi/HomeAdvisor/HomeGuide); bathroom or kitchen additions and second-story work run higher",
    "phases": [
      {
        "name": "Planning, design & permits",
        "items": [
          {
            "name": "Architect/structural plans",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 5000,
            "notes": "Stamped drawings usually required for additions"
          },
          {
            "name": "Building permit",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 2000,
            "notes": "Addition-scale permit"
          },
          {
            "name": "Dumpster rental (20 yd)",
            "unit": "per week",
            "typicalLowUSD": 275,
            "typicalHighUSD": 700,
            "notes": "For excavation spoils staging + construction debris"
          }
        ]
      },
      {
        "name": "Site prep, demo & foundation",
        "items": [
          {
            "name": "Exterior wall demo / opening into house",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 5000,
            "notes": "Labor-inclusive; includes header/beam where the addition ties in"
          },
          {
            "name": "Foundation (slab or crawlspace)",
            "unit": "flat",
            "typicalLowUSD": 4011,
            "typicalHighUSD": 14819,
            "notes": "Labor-inclusive (Angi addition figure); $5-$37 per sq ft poured"
          }
        ]
      },
      {
        "name": "Framing & weathertight shell",
        "items": [
          {
            "name": "Framing",
            "unit": "per sq ft",
            "typicalLowUSD": 7,
            "typicalHighUSD": 16,
            "notes": "Labor-inclusive (HomeAdvisor)"
          },
          {
            "name": "Roofing tie-in (asphalt shingles)",
            "unit": "per square (100 sq ft)",
            "typicalLowUSD": 200,
            "typicalHighUSD": 700,
            "notes": "Labor-inclusive (HomeGuide); matching existing shingles adds cost"
          },
          {
            "name": "Siding to match house",
            "unit": "per sq ft",
            "typicalLowUSD": 3,
            "typicalHighUSD": 12,
            "notes": "Labor-inclusive (vinyl figure; fiber cement/wood higher)"
          },
          {
            "name": "Windows",
            "unit": "each",
            "typicalLowUSD": 300,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive; avg ~$500/window"
          },
          {
            "name": "Exterior door (if added)",
            "unit": "each",
            "typicalLowUSD": 546,
            "typicalHighUSD": 2374,
            "notes": "Labor-inclusive (HomeAdvisor avg ~$1,456)"
          }
        ]
      },
      {
        "name": "Rough-in (electrical, HVAC, plumbing)",
        "items": [
          {
            "name": "Electrical (new circuit, outlets, lighting)",
            "unit": "flat",
            "typicalLowUSD": 500,
            "typicalHighUSD": 3000,
            "notes": "Labor-inclusive"
          },
          {
            "name": "HVAC extension or ductless mini-split",
            "unit": "flat",
            "typicalLowUSD": 1500,
            "typicalHighUSD": 8000,
            "notes": "Labor-inclusive; duct extension at low end, dedicated mini-split at high"
          },
          {
            "name": "Plumbing rough-in (only if bath/wet bar)",
            "unit": "flat",
            "typicalLowUSD": 2000,
            "typicalHighUSD": 8500,
            "notes": "Labor-inclusive; optional"
          }
        ]
      },
      {
        "name": "Insulation & drywall",
        "items": [
          {
            "name": "Insulation (walls/ceiling)",
            "unit": "per sq ft",
            "typicalLowUSD": 0.3,
            "typicalHighUSD": 6.75,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Drywall installed",
            "unit": "per sq ft",
            "typicalLowUSD": 2.4,
            "typicalHighUSD": 4,
            "notes": "Labor-inclusive"
          }
        ]
      },
      {
        "name": "Finishes & punch list",
        "items": [
          {
            "name": "Flooring installed",
            "unit": "per sq ft",
            "typicalLowUSD": 3,
            "typicalHighUSD": 12,
            "notes": "Labor-inclusive; match or transition to existing floors"
          },
          {
            "name": "Painting",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 6,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Baseboard & trim",
            "unit": "per linear foot",
            "typicalLowUSD": 5.7,
            "typicalHighUSD": 9,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Gutters on new roofline",
            "unit": "per linear foot",
            "typicalLowUSD": 5,
            "typicalHighUSD": 15,
            "notes": "Installed, aluminum/vinyl; seamless or specialty up to ~$25/LF. Whole-house (~150 LF) total ≈ $750–$2,250."
          },
          {
            "name": "Touch-up, caulk & final clean",
            "unit": "flat",
            "typicalLowUSD": 150,
            "typicalHighUSD": 500,
            "notes": "Materials + labor"
          }
        ]
      }
    ]
  },
  {
    "name": "Flooring replacement (whole home)",
    "lowUSD": 6000,
    "highUSD": 30000,
    "costBasis": "Total project, ~2,000 sq ft home, installed; low = LVP/carpet mix at ~$3-$5/sq ft, high = engineered hardwood/tile mix at ~$12-$15/sq ft; solid hardwood throughout ($9-$23/sq ft) can reach $46,000",
    "phases": [
      {
        "name": "Planning & prep",
        "items": [
          {
            "name": "Material delivery & acclimation",
            "unit": "flat",
            "typicalLowUSD": 0,
            "typicalHighUSD": 500,
            "notes": "Delivery fees; wood/LVP must sit on site 48-72 hrs — plan the schedule around it"
          },
          {
            "name": "Furniture moving",
            "unit": "per room",
            "typicalLowUSD": 20,
            "typicalHighUSD": 50,
            "notes": "Labor; many installers charge per room — often forgotten"
          },
          {
            "name": "Dust protection (plastic sheeting over cabinets/vents)",
            "unit": "flat",
            "typicalLowUSD": 20,
            "typicalHighUSD": 100,
            "notes": "Material only"
          }
        ]
      },
      {
        "name": "Removal & disposal",
        "items": [
          {
            "name": "Old flooring removal",
            "unit": "per sq ft",
            "typicalLowUSD": 1,
            "typicalHighUSD": 4,
            "notes": "Labor + disposal; tile tear-out is the high end"
          },
          {
            "name": "Dumpster rental (10 yd)",
            "unit": "per week",
            "typicalLowUSD": 225,
            "typicalHighUSD": 575,
            "notes": "Alternative: junk-haul truckloads at $100-$800 each"
          }
        ]
      },
      {
        "name": "Subfloor prep",
        "items": [
          {
            "name": "Subfloor repair/patch (where damaged)",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 10,
            "notes": "Labor-inclusive; budget a contingency — hidden until tear-out"
          },
          {
            "name": "Underlayment",
            "unit": "per sq ft",
            "typicalLowUSD": 0.3,
            "typicalHighUSD": 1,
            "notes": "Material only; some LVP has it attached"
          }
        ]
      },
      {
        "name": "Installation",
        "items": [
          {
            "name": "Luxury vinyl plank installed",
            "unit": "per sq ft",
            "typicalLowUSD": 4,
            "typicalHighUSD": 11,
            "notes": "Labor-inclusive"
          },
          {
            "name": "Carpet installed",
            "unit": "per sq ft",
            "typicalLowUSD": 4,
            "typicalHighUSD": 6.5,
            "notes": "Labor-inclusive incl. pad (HomeGuide)"
          },
          {
            "name": "Hardwood installed",
            "unit": "per sq ft",
            "typicalLowUSD": 9,
            "typicalHighUSD": 23,
            "notes": "Labor-inclusive; species and site-finish drive range"
          },
          {
            "name": "Ceramic tile installed",
            "unit": "per sq ft",
            "typicalLowUSD": 5,
            "typicalHighUSD": 15,
            "notes": "Labor-inclusive; porcelain/natural stone $10-$45/sq ft"
          }
        ]
      },
      {
        "name": "Transitions & trim",
        "items": [
          {
            "name": "Baseboard or quarter-round installed",
            "unit": "per linear foot",
            "typicalLowUSD": 5.7,
            "typicalHighUSD": 9,
            "notes": "Labor-inclusive; quarter-round alone is cheaper"
          },
          {
            "name": "Transition strips / stair nosing",
            "unit": "each",
            "typicalLowUSD": 10,
            "typicalHighUSD": 40,
            "notes": "Material only; one per doorway between floor types — commonly forgotten"
          }
        ]
      },
      {
        "name": "Finish & punch list",
        "items": [
          {
            "name": "Baseboard touch-up painting",
            "unit": "per linear foot",
            "typicalLowUSD": 1,
            "typicalHighUSD": 4,
            "notes": "Labor-inclusive (HomeGuide); baseboards get scuffed during install"
          },
          {
            "name": "Final clean & felt pads for furniture",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 400,
            "notes": "Labor + small materials"
          }
        ]
      }
    ]
  },
  {
    "name": "Exterior refresh (roof, siding, windows)",
    "lowUSD": 17000,
    "highUSD": 55000,
    "costBasis": "Total project, ~2,000 sq ft US home doing all three: asphalt shingle roof replacement ($6,885-$23,993), vinyl siding replacement ($6,370-$18,378, avg $12,303), and ~8-10 window replacement ($3,436-$11,837); doing a subse",
    "phases": [
      {
        "name": "Planning, permits & site protection",
        "items": [
          {
            "name": "Roofing/siding permits",
            "unit": "flat",
            "typicalLowUSD": 250,
            "typicalHighUSD": 1000,
            "notes": "Varies widely by municipality"
          },
          {
            "name": "Dumpster rental (30 yd)",
            "unit": "per week",
            "typicalLowUSD": 311,
            "typicalHighUSD": 718,
            "notes": "HomeGuide; shingle tear-off is heavy — confirm weight allowance"
          },
          {
            "name": "Landscaping/deck protection (tarps, plywood)",
            "unit": "flat",
            "typicalLowUSD": 50,
            "typicalHighUSD": 200,
            "notes": "Material only; commonly forgotten"
          }
        ]
      },
      {
        "name": "Roof",
        "items": [
          {
            "name": "Tear-off of old shingles",
            "unit": "per sq ft",
            "typicalLowUSD": 1,
            "typicalHighUSD": 3,
            "notes": "Labor + dump fees; ~$50-$150 per square (HomeGuide); multiple layers cost more"
          },
          {
            "name": "Roof decking repair/replacement (as found)",
            "unit": "per sq ft",
            "typicalLowUSD": 2,
            "typicalHighUSD": 5,
            "notes": "Labor-inclusive (HomeGuide); contingency item — hidden until tear-off"
          },
          {
            "name": "Asphalt shingles installed (incl. underlayment, flashing, vents)",
            "unit": "per square (100 sq ft)",
            "typicalLowUSD": 200,
            "typicalHighUSD": 700,
            "notes": "Labor-inclusive (HomeGuide); materials alone $80-$280/square"
          },
          {
            "name": "Gutters & downspouts replaced",
            "unit": "per linear foot",
            "typicalLowUSD": 5,
            "typicalHighUSD": 15,
            "notes": "Installed, aluminum/vinyl; seamless or specialty up to ~$25/LF. Whole-house (~150 LF) total ≈ $750–$2,250."
          }
        ]
      },
      {
        "name": "Siding",
        "items": [
          {
            "name": "Old siding removal & disposal",
            "unit": "flat",
            "typicalLowUSD": 1000,
            "typicalHighUSD": 3000,
            "notes": "Labor + disposal for an average home"
          },
          {
            "name": "Vinyl siding installed (incl. house wrap)",
            "unit": "per sq ft",
            "typicalLowUSD": 3,
            "typicalHighUSD": 12,
            "notes": "Labor-inclusive (HomeAdvisor/HomeGuide); labor portion $2.50-$5/sq ft"
          },
          {
            "name": "Fascia/soffit repair or replacement",
            "unit": "per linear foot",
            "typicalLowUSD": 6,
            "typicalHighUSD": 20,
            "notes": "Labor-inclusive; often discovered rotten during siding removal"
          }
        ]
      },
      {
        "name": "Windows & doors",
        "items": [
          {
            "name": "Window replacement (insert/retrofit)",
            "unit": "each",
            "typicalLowUSD": 300,
            "typicalHighUSD": 2500,
            "notes": "Labor-inclusive; 2025 avg ~$491/window, ~$4,225/project (This Old House/Angi)"
          },
          {
            "name": "Exterior/entry door replacement",
            "unit": "each",
            "typicalLowUSD": 546,
            "typicalHighUSD": 2374,
            "notes": "Labor-inclusive (HomeAdvisor avg ~$1,456)"
          }
        ]
      },
      {
        "name": "Paint, sealing & finish",
        "items": [
          {
            "name": "Exterior painting (trim only, or whole house if siding kept)",
            "unit": "per sq ft",
            "typicalLowUSD": 1.5,
            "typicalHighUSD": 4,
            "notes": "Labor-inclusive (HomeAdvisor; avg project ~$3,177); skip full paint if siding was replaced"
          },
          {
            "name": "Exterior caulk/sealant & touch-up",
            "unit": "flat",
            "typicalLowUSD": 50,
            "typicalHighUSD": 200,
            "notes": "Material only; around windows, doors, penetrations"
          },
          {
            "name": "Site cleanup & magnetic nail sweep",
            "unit": "flat",
            "typicalLowUSD": 100,
            "typicalHighUSD": 300,
            "notes": "Labor; roofing nails in the lawn are the classic forgotten hazard"
          }
        ]
      }
    ]
  }
];

export interface FormulaRef {
  name: string;
  category: string;
  unit: string;
  formula: string;
  wastePct: number;
  unitCostLowUSD: number;
  unitCostHighUSD: number;
  notes?: string;
}

export const FORMULA_GUIDE: { assumptions: string[]; formulas: FormulaRef[] } =
  {
  "assumptions": [
    "All unit prices are 2025-2026 US national-average, Home Depot-level retail, MATERIAL ONLY unless a note says otherwise (concrete is delivered material; short-load and placement labor excluded). Regional prices vary roughly -20% to +30% from these ranges.",
    "The quoting tool applies waste as: quantityToBuy = ceil(formula result * (1 + wastePct/100)). Waste percentages are NOT baked into the formulas.",
    "Framing: studs at 16 in on center (wallLinearFt * 12 / 16), 8 ft precut 2x4 studs for 8 ft walls; 2 extra studs per corner (cornerCount) and 2 per framed opening (openingCount) for king/jack framing; plates are 1 bottom + 2 top = 3 x wallLinearFt, purchased as 16 ft 2x4s.",
    "Sheet goods: sheathing and drywall computed on 4x8 sheets = 32 sqft; for 4x12 drywall divide combined area by 48 instead of 32.",
    "Drywall finishing coverage: one 4.5-gal joint compound bucket finishes ~450-500 sqft of board; ~32 screws per 4x8 sheet; ~12 LF of tape per sheet.",
    "Paint coverage: 350 sqft per gallon per coat, 2 coats for finish paint; primer 1 coat at 300 sqft per gallon on new drywall.",
    "Tile setting: 50 lb thinset bag covers ~80 sqft at 1/4 in notch trowel; 25 lb sanded grout bag covers ~150 sqft for 12 in tile with 1/8-3/16 in joints.",
    "Roofing: 1 square = 100 sqft = 3 bundles of architectural shingles; true roof area = roofFootprintSqFt * roofPitchMultiplier with multipliers 4/12=1.054, 5/12=1.083, 6/12=1.118, 8/12=1.202, 10/12=1.302, 12/12=1.414; synthetic underlayment in 10-square (1,000 sqft) rolls; drip edge in 10 ft sticks es",
    "Concrete: cubic yards = floorAreaSqFt * (slabThicknessIn / 12) / 27; typical residential slab 4 in; reinforcement is EITHER 6x6 remesh (5x10 ft sheets, 50 sqft each) OR #4 rebar 18 in OC both ways (~1.33 LF/sqft) - not both.",
    "Insulation: wall batts sized for 2x4 cavities (R-13/R-15), area = gross wallAreaSqFt with openings offset by the waste factor; attic blown-in fiberglass at R-38 covers ~19 sqft per bag (~53 bags/1,000 sqft).",
    "Exterior envelope: siding and house wrap use wallAreaSqFt = EXTERIOR wall area only; house wrap rolls are 9x100 ft = 900 sqft; siding trim accessories (J-channel, corners, starter) are excluded and add ~10-15%.",
    "Input conventions: openingCount = all framed exterior-wall openings (windows + exterior doors); exteriorDoorCount is an added input (default 2); interior doors = roomCount (one per room; add closet doors per bedroom manually); wallLinearFt in the drip-edge formula means the exterior perimeter.",
    "Key sources consulted (2025-2026): homeguide.com/costs/sheetrock-drywall-prices, homeguide.com/costs/rebar-prices, homeguide.com/costs/concrete-prices, homeguide.com/costs/drip-edge-cost, homeguide.com/costs/luxury-vinyl-flooring-cost, homeadvisor.com/cost/insulation/install-blown-in-insulation, hom"
  ],
  "formulas": [
    {
      "name": "2x4 studs (16 in OC)",
      "category": "Framing",
      "unit": "stud (8 ft precut)",
      "formula": "wallLinearFt * 12 / 16 + cornerCount * 2 + openingCount * 2",
      "wastePct": 10,
      "unitCostLowUSD": 3.5,
      "unitCostHighUSD": 5,
      "notes": "One stud per 16 in of wall plus 2 extra per corner and 2 per framed opening (king + jack). #2 KD whitewood/SPF stud at Home Depot ran roughly $3.50-$5.00 in 2025-2026 (lumber is volatile; wholesale composite ran ~$400-$9"
    },
    {
      "name": "2x4 plate lumber",
      "category": "Framing",
      "unit": "16 ft 2x4 board",
      "formula": "wallLinearFt * 3 / 16",
      "wastePct": 10,
      "unitCostLowUSD": 8.5,
      "unitCostHighUSD": 13,
      "notes": "1 bottom plate + 2 top plates = 3 x wall length in linear feet, bought as 16 ft sticks. Equivalent $0.55-$0.80 per LF of 2x4."
    },
    {
      "name": "Wall sheathing 7/16 in OSB",
      "category": "Framing",
      "unit": "4x8 sheet (32 sqft)",
      "formula": "wallAreaSqFt / 32",
      "wastePct": 10,
      "unitCostLowUSD": 14,
      "unitCostHighUSD": 22,
      "notes": "7/16 in OSB rated sheathing; big-box price hovered ~$10-$22/sheet in 2025-2026 depending on region and market swings ($14.98 promo lows; typical shelf $15-$20). CDX plywood alternative runs $28-$45/sheet."
    },
    {
      "name": "Drywall 1/2 in",
      "category": "Drywall",
      "unit": "4x8 sheet (32 sqft)",
      "formula": "(wallAreaSqFt + ceilingAreaSqFt) / 32",
      "wastePct": 12,
      "unitCostLowUSD": 12,
      "unitCostHighUSD": 18,
      "notes": "1/2 in lightweight gypsum board; Home Depot listed 4x8 sheets ~$15.98, national range $10-$20 ($0.30-$0.50/sqft). For 4x12 sheets divide by 48 instead of 32; 4x12 sheets cost roughly 1.5x the 4x8 price ($18-$27)."
    },
    {
      "name": "Drywall finishing set (mud + tape + screws)",
      "category": "Drywall",
      "unit": "per-sheet consumables set",
      "formula": "(wallAreaSqFt + ceilingAreaSqFt) / 32",
      "wastePct": 0,
      "unitCostLowUSD": 2.5,
      "unitCostHighUSD": 4.5,
      "notes": "Consumables per 4x8 sheet: ~1/15 of a 4.5-gal all-purpose joint compound bucket ($18-$25, covers ~450-500 sqft), ~12 ft of tape (paper $3-$5 or mesh $5-$15 per 300-500 ft roll), ~32 screws ($8-$12 per box of 1,000). Cove"
    },
    {
      "name": "Interior paint (2 coats)",
      "category": "Paint",
      "unit": "gallon",
      "formula": "wallAreaSqFt * 2 / 350",
      "wastePct": 10,
      "unitCostLowUSD": 30,
      "unitCostHighUSD": 55,
      "notes": "2 coats at ~350 sqft per gallon per coat. Behr Premium Plus $33-$43/gal, Behr Ultra/Marquee $44-$55; Sherwin-Williams retail lines run $42-$85. Add ceilingAreaSqFt * 2 / 350 if painting ceilings."
    },
    {
      "name": "Primer (1 coat)",
      "category": "Paint",
      "unit": "gallon",
      "formula": "wallAreaSqFt / 300",
      "wastePct": 10,
      "unitCostLowUSD": 15,
      "unitCostHighUSD": 30,
      "notes": "1 coat at ~300 sqft/gal on new drywall (PVA drywall primer at the low end, stain-blocking at the high end); $14-$28/gal per 2025-26 cost guides."
    },
    {
      "name": "LVP flooring",
      "category": "Flooring",
      "unit": "sqft",
      "formula": "floorAreaSqFt",
      "wastePct": 10,
      "unitCostLowUSD": 2,
      "unitCostHighUSD": 5,
      "notes": "Luxury vinyl plank material only: budget $2-$3, mid-range $3-$5, premium $5-$7+/sqft (2025 national data). Sold in cartons of ~19-24 sqft; round up to whole cartons. Underlayment, if not attached, adds $0.30-$0.60/sqft."
    },
    {
      "name": "Ceramic/porcelain floor tile",
      "category": "Flooring",
      "unit": "sqft",
      "formula": "floorAreaSqFt",
      "wastePct": 15,
      "unitCostLowUSD": 1.5,
      "unitCostHighUSD": 5,
      "notes": "Ceramic tile material $1.50-$5/sqft (glazed ceramic $4-$15 at the designer end; porcelain trends to the upper half). Use 15% waste for straight lay; bump to 20% for diagonal or patterned layouts."
    },
    {
      "name": "Thinset mortar",
      "category": "Flooring",
      "unit": "50 lb bag",
      "formula": "floorAreaSqFt / 80",
      "wastePct": 10,
      "unitCostLowUSD": 15,
      "unitCostHighUSD": 25,
      "notes": "Modified thinset (e.g. Custom VersaBond) 50 lb bag covers ~75-95 sqft with a 1/4 in notch trowel; 80 sqft used as the planning number. Retail $15-$23/bag (unmodified as low as $9)."
    },
    {
      "name": "Grout",
      "category": "Flooring",
      "unit": "25 lb bag",
      "formula": "floorAreaSqFt / 150",
      "wastePct": 10,
      "unitCostLowUSD": 16,
      "unitCostHighUSD": 25,
      "notes": "Sanded grout (e.g. Polyblend Plus 25 lb) covers ~100-200 sqft for 12 in tile with 1/8-3/16 in joints; 150 sqft used as the planning number. Small tile or wide joints cut coverage sharply."
    },
    {
      "name": "Architectural asphalt shingles",
      "category": "Roofing",
      "unit": "square (100 sqft, 3 bundles)",
      "formula": "roofFootprintSqFt * roofPitchMultiplier / 100",
      "wastePct": 12,
      "unitCostLowUSD": 110,
      "unitCostHighUSD": 145,
      "notes": "True roof area = footprint x pitch multiplier (4/12=1.054, 5/12=1.083, 6/12=1.118, 8/12=1.202, 10/12=1.302, 12/12=1.414). Big-box bundles ran $35-$47 in 2025-26 ($38.67 bulk to $46.97), x3 bundles/square. Use 12% waste f"
    },
    {
      "name": "Synthetic roofing underlayment",
      "category": "Roofing",
      "unit": "10-square roll (1,000 sqft)",
      "formula": "roofFootprintSqFt * roofPitchMultiplier / 1000",
      "wastePct": 10,
      "unitCostLowUSD": 90,
      "unitCostHighUSD": 160,
      "notes": "Standard synthetic felt replacement, $0.09-$0.16/sqft in roll form ($90-$160 per 1,000 sqft roll; premium breathable like GAF DeckArmor runs $314/1,000 sqft; small 400 sqft rolls ~$35-$158). 10% waste covers course overl"
    },
    {
      "name": "Aluminum drip edge",
      "category": "Roofing",
      "unit": "10 ft piece",
      "formula": "exteriorPerimeterFt * 1.15 / 10",
      "wastePct": 5,
      "unitCostLowUSD": 7,
      "unitCostHighUSD": 12,
      "notes": "Treat wallLinearFt here as the exterior wall perimeter; x1.15 approximates eave overhang plus rake length gain. Amerimax-type aluminum drip edge was $ Exterior perimeter only — not total wall LF."
    },
    {
      "name": "Ready-mix concrete for slab",
      "category": "Concrete",
      "unit": "cubic yard",
      "formula": "floorAreaSqFt * slabThicknessIn / 12 / 27",
      "wastePct": 8,
      "unitCostLowUSD": 140,
      "unitCostHighUSD": 185,
      "notes": "2025 national average ~$180/yd3 delivered; ranges $119-$147 (low-cost markets) to $160-$195. Price is material delivered up to ~20 mi - NOT placement labor. Short-load fee of $40-$60/yd3 applies under ~10 yd3. 8% waste c"
    },
    {
      "name": "Welded wire remesh (6x6 W1.4)",
      "category": "Concrete",
      "unit": "5x10 ft sheet (50 sqft)",
      "formula": "floorAreaSqFt / 50",
      "wastePct": 10,
      "unitCostLowUSD": 25,
      "unitCostHighUSD": 40,
      "notes": "Standard 6x6 W1.4xW1.4 remesh sheet, $25-$40/sheet ($0.35-$0.55/sqft) at home centers in 2025-26. 10% waste covers the required one-square overlap at sheet edges. Alternative to rebar for residential flatwork."
    },
    {
      "name": "#4 rebar (18 in OC grid)",
      "category": "Concrete",
      "unit": "20 ft stick",
      "formula": "floorAreaSqFt * 1.33 / 20",
      "wastePct": 10,
      "unitCostLowUSD": 12,
      "unitCostHighUSD": 22,
      "notes": "Both-ways 18 in OC grid needs ~1.33 LF of bar per sqft. Plain carbon #4 (1/2 in) rebar $0.40-$1.10/LF in 2025-26, so $10-$22 per 20 ft stick. Use this OR remesh, not both, for a basic slab; quote tie wire and chairs sepa"
    },
    {
      "name": "Wall batt insulation (R-13/R-15)",
      "category": "Insulation",
      "unit": "sqft",
      "formula": "wallAreaSqFt",
      "wastePct": 8,
      "unitCostLowUSD": 0.5,
      "unitCostHighUSD": 1.1,
      "notes": "Kraft-faced fiberglass for 2x4 walls: R-13 ~$0.49-$0.65/sqft, R-15 ~$0.89-$1.10/sqft (2025-26 retail; e.g. R-13 roll $24.97 = $0.62/sqft). Sold as batts/rolls of ~40-130 sqft - round up to whole packages. Openings not de"
    },
    {
      "name": "Attic blown-in insulation R-38",
      "category": "Insulation",
      "unit": "bag (fiberglass loose-fill)",
      "formula": "ceilingAreaSqFt / 50",
      "wastePct": 5,
      "unitCostLowUSD": 30,
      "unitCostHighUSD": 42,
      "notes": "ceilingAreaSqFt = attic floor area. Fiberglass loose-fill (AttiCat/Owens Corning class) covers ~19 sqft/bag at R-38 (~53 Coverage ~50 sqft/bag at R-38 (Owens Corning AttiCat class); use ~19 sqft/bag only for R-60 or cell"
    },
    {
      "name": "Vinyl siding",
      "category": "Siding",
      "unit": "sqft",
      "formula": "wallAreaSqFt",
      "wastePct": 10,
      "unitCostLowUSD": 1.5,
      "unitCostHighUSD": 4,
      "notes": "wallAreaSqFt = exterior wall area. Standard horizontal lap vinyl material $1.50-$4/sqft in 2025-26 (national avg ~$3.16; insulated or shake/board-and-batten profiles $5-$11). Sold in 2-square (200 sqft) cartons ~$300-$80"
    },
    {
      "name": "House wrap",
      "category": "Siding",
      "unit": "9x100 ft roll (900 sqft)",
      "formula": "wallAreaSqFt / 900",
      "wastePct": 10,
      "unitCostLowUSD": 150,
      "unitCostHighUSD": 225,
      "notes": "DuPont Tyvek HomeWrap 9x100 ft roll listed ~$225 in 2025-26; generic branded wraps run $150-$180/roll ($0.17-$0.25/sqft). 10% waste covers 6-12 in overlaps at seams. Wrap tape (~$15-$20/roll) extra."
    },
    {
      "name": "Exterior doors (prehung steel)",
      "category": "Doors & Windows",
      "unit": "each",
      "formula": "exteriorDoorCount",
      "wastePct": 0,
      "unitCostLowUSD": 250,
      "unitCostHighUSD": 600,
      "notes": "Material only: basic 36x80 prehung 6-panel primed steel entry door ~$250-$400 at Home Depot (JELD-WEN 6-panel ~$296; fiberglass and lite/glass options push $600+; sidelite units $1,600+). exteriorDoorCount is a new input"
    },
    {
      "name": "Interior doors (prehung hollow-core)",
      "category": "Doors & Windows",
      "unit": "each",
      "formula": "roomCount",
      "wastePct": 0,
      "unitCostLowUSD": 100,
      "unitCostHighUSD": 220,
      "notes": "One prehung 6-panel hollow-core door per room; Home Depot 2025-26 stock units cluster $100-$250. Add ~1 door per bedroom for closets and count bathrooms in roomCount. Hinges included prehung; knob ($15-$50) extra."
    },
    {
      "name": "Windows (vinyl, new construction)",
      "category": "Doors & Windows",
      "unit": "each",
      "formula": "windowCount",
      "wastePct": 0,
      "unitCostLowUSD": 200,
      "unitCostHighUSD": 500,
      "notes": "Convention: openingCount = all framed exterior-wall openings (windows + exterior doors), so windows = openingCount - exteriorDoorCount. Material only: nail-fin double-hung vinyl Low-E units $200-$500 at Home Depot (JELD-"
    }
  ]
};
