/**
 * Researched cost data — US national averages, 2025–2026. GENERATED from
 * the multi-agent research run (4 researchers + adversarial verify pass);
 * the full dataset with sources renders at /guide.
 */

export interface CostPerSqft {
  lowUSD: number;
  midUSD: number;
  highUSD: number;
  notes: string;
}

/** Construction cost only — excludes land, financing and sales costs. */
export const NEW_BUILD_COST_PER_SQFT: CostPerSqft = {
  lowUSD: 130,
  midUSD: 195,
  highUSD: 400,
  notes:
    "Low = owner-builder/budget region · mid = typical contractor build (NAHB 2024 + GC markup) · high = custom/high-end.",
};

export interface RemodelCost {
  name: string;
  lowUSD: number;
  highUSD: number;
  basis: string;
}

export const REMODEL_COSTS: RemodelCost[] = [
  {
    "name": "Kitchen remodel",
    "lowUSD": 14500,
    "highUSD": 65000,
    "basis": "Total project, mid-size (~150-200 sq ft) US kitchen, labor + materials; low = minor remodel keeping layout (Angi/HomeAdv"
  },
  {
    "name": "Bathroom remodel",
    "lowUSD": 6500,
    "highUSD": 28000,
    "basis": "Total project, full bath (~40 sq ft), labor + materials; low = basic pull-and-replace with stock fixtures, high = mid-to"
  },
  {
    "name": "Whole-home remodel",
    "lowUSD": 28000,
    "highUSD": 300000,
    "basis": "Total project, 2,000 sq ft US home; low = cosmetic whole-home refresh at $15-$60/sq ft (paint, flooring, fixtures), high"
  },
  {
    "name": "Basement finish",
    "lowUSD": 15000,
    "highUSD": 75000,
    "basis": "Total project, ~500-1,500 sq ft unfinished basement converted to living space at $30-$50/sq ft (HomeGuide); high end inc"
  },
  {
    "name": "Room addition",
    "lowUSD": 16000,
    "highUSD": 50000,
    "basis": "Total project, ~200 sq ft single-room ground-level addition at $80-$250 per sq ft including labor and materials (Angi/Ho"
  },
  {
    "name": "Flooring replacement (whole home)",
    "lowUSD": 6000,
    "highUSD": 30000,
    "basis": "Total project, ~2,000 sq ft home, installed; low = LVP/carpet mix at ~$3-$5/sq ft, high = engineered hardwood/tile mix a"
  },
  {
    "name": "Exterior refresh (roof, siding, windows)",
    "lowUSD": 17000,
    "highUSD": 55000,
    "basis": "Total project, ~2,000 sq ft US home doing all three: asphalt shingle roof replacement ($6,885-$23,993), vinyl siding rep"
  }
];

export interface OptionTier {
  name: string;
  lowUSD: number;
  highUSD: number;
  tier?: string;
  homeDepotSearch?: string;
  /** Price includes install labor — don't stack a labor % on top. */
  laborIncluded?: boolean;
  notes?: string;
}

export interface OptionLibraryEntry {
  /** Keywords matched against item names to auto-suggest this entry. */
  match: string[];
  item: string;
  unit: string;
  options: OptionTier[];
}

/** The "wood floor vs marble" library — material tiers for every big choice. */
export const OPTION_LIBRARY: OptionLibraryEntry[] = [
  {
    "match": [
      "floor"
    ],
    "item": "Flooring",
    "unit": "sq ft",
    "options": [
      {
        "name": "Laminate",
        "lowUSD": 1.5,
        "highUSD": 5,
        "tier": "budget",
        "homeDepotSearch": "laminate wood flooring",
        "notes": "Materials only (HomeAdvisor/HomeGuide 2025). Click-lock planks; underlayment sometimes attached."
      },
      {
        "name": "Carpet",
        "lowUSD": 1.5,
        "highUSD": 5,
        "tier": "budget",
        "homeDepotSearch": "carpet",
        "notes": "Materials only; add $0.50-1.00/sq ft for pad. Sold by sq ft or sq yd."
      },
      {
        "name": "Luxury vinyl plank (LVP)",
        "lowUSD": 2,
        "highUSD": 6,
        "tier": "budget",
        "homeDepotSearch": "luxury vinyl plank flooring",
        "notes": "Materials only. Waterproof; most popular remodel choice 2025."
      },
      {
        "name": "Porcelain tile",
        "lowUSD": 2,
        "highUSD": 12,
        "tier": "mid",
        "homeDepotSearch": "porcelain floor tile",
        "notes": "Materials only; add thinset/grout ~$1-2/sq ft. Install labor is high ($5-15/sq ft) vs floating floors."
      },
      {
        "name": "Engineered hardwood",
        "lowUSD": 4,
        "highUSD": 10,
        "tier": "mid",
        "homeDepotSearch": "engineered hardwood flooring",
        "notes": "Materials only. Real wood veneer over plywood core; more dimensionally stable than solid."
      },
      {
        "name": "Solid hardwood",
        "lowUSD": 5,
        "highUSD": 14,
        "tier": "premium",
        "homeDepotSearch": "solid hardwood flooring oak",
        "notes": "Materials only. Oak at low end; walnut/hickory/wide-plank at high end. Can be refinished repeatedly."
      },
      {
        "name": "Natural stone / marble tile",
        "lowUSD": 5,
        "highUSD": 30,
        "tier": "luxury",
        "homeDepotSearch": "marble floor tile",
        "notes": "Materials only. Basic white marble/travertine $5-10; premium marble (Calacatta, Breccia) $10-30+; onyx to $60. Needs sealing."
      }
    ]
  },
  {
    "match": [
      "countertop",
      "counter"
    ],
    "item": "Countertops",
    "unit": "sq ft",
    "options": [
      {
        "name": "Laminate",
        "lowUSD": 10,
        "highUSD": 40,
        "tier": "budget",
        "homeDepotSearch": "laminate countertop",
        "notes": "Materials only (prefab post-form sections). Installed comparison: $25-50/sq ft (SlabWise 2025-26)."
      },
      {
        "name": "Butcher block",
        "lowUSD": 25,
        "highUSD": 100,
        "tier": "mid",
        "homeDepotSearch": "butcher block countertop",
        "notes": "Materials only. Birch/acacia low end, walnut high end. Installed: $35-80+/sq ft (Angi/HomeAdvisor). Needs oiling."
      },
      {
        "name": "Quartz",
        "lowUSD": 25,
        "highUSD": 100,
        "tier": "premium",
        "homeDepotSearch": "quartz countertop sample",
        "notes": "Slab material only (SlabWise). LABOR-INCLUSIVE comparison: $50-150/sq ft installed; sold via fabricators, includes templating/fabrication."
      },
      {
        "name": "Granite",
        "lowUSD": 40,
        "highUSD": 100,
        "tier": "premium",
        "homeDepotSearch": "granite countertop sample",
        "notes": "Slab material only. LABOR-INCLUSIVE comparison: $40-175/sq ft installed depending on slab grade."
      },
      {
        "name": "Marble",
        "lowUSD": 50,
        "highUSD": 150,
        "tier": "luxury",
        "homeDepotSearch": "marble countertop sample",
        "notes": "Slab material only. LABOR-INCLUSIVE comparison: $65-250/sq ft installed (SlabWise). Etches/stains; needs sealing."
      }
    ]
  },
  {
    "match": [
      "cabinet"
    ],
    "item": "Kitchen cabinets",
    "unit": "linear ft",
    "options": [
      {
        "name": "Stock",
        "lowUSD": 50,
        "highUSD": 150,
        "tier": "budget",
        "homeDepotSearch": "in stock kitchen cabinets",
        "notes": "Cabinets only (HomeAdvisor: $50-100/LF material; $100-300/LF installed). Fixed sizes, limited finishes."
      },
      {
        "name": "Semi-custom",
        "lowUSD": 150,
        "highUSD": 450,
        "tier": "mid",
        "homeDepotSearch": "semi custom kitchen cabinets",
        "laborIncluded": true,
        "notes": "Cabinets only, low end; LABOR-INCLUSIVE range $150-700/LF installed (HomeAdvisor/Angi 2025-26). Modified sizes, more finishes."
      },
      {
        "name": "Custom",
        "lowUSD": 500,
        "highUSD": 1500,
        "tier": "luxury",
        "homeDepotSearch": "custom kitchen cabinets",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE: custom is quoted built-and-installed, $500-1,200/LF typical, $1,500+ high end (Angi 2025-26)."
      }
    ]
  },
  {
    "match": [
      "interior door"
    ],
    "item": "Interior doors",
    "unit": "per door",
    "options": [
      {
        "name": "Hollow core",
        "lowUSD": 30,
        "highUSD": 240,
        "tier": "budget",
        "homeDepotSearch": "hollow core interior door",
        "notes": "Door only (HomeGuide $30-240; typical $50-150). Slabs cheapest; prehung at upper end. Poor sound blocking."
      },
      {
        "name": "Solid core",
        "lowUSD": 60,
        "highUSD": 500,
        "tier": "mid",
        "homeDepotSearch": "solid core interior door",
        "notes": "Door only. Slabs $60-330; common prehung solid core $150-500. MDF/engineered core, good sound dampening."
      },
      {
        "name": "Solid wood",
        "lowUSD": 150,
        "highUSD": 850,
        "tier": "premium",
        "homeDepotSearch": "solid wood interior door",
        "notes": "Door only (HomeGuide/HomeAdvisor 2025). Pine at low end, hardwood (knotty alder, oak) high end. Install labor $100-350/door extra."
      }
    ]
  },
  {
    "match": [
      "siding"
    ],
    "item": "Siding",
    "unit": "sq ft",
    "options": [
      {
        "name": "Vinyl",
        "lowUSD": 2,
        "highUSD": 7,
        "tier": "budget",
        "homeDepotSearch": "vinyl siding",
        "notes": "Materials only. LABOR-INCLUSIVE comparison: $3-12/sq ft installed (HomeAdvisor/Forbes 2025-26)."
      },
      {
        "name": "Fiber cement",
        "lowUSD": 2.5,
        "highUSD": 8,
        "tier": "mid",
        "homeDepotSearch": "hardie plank fiber cement siding",
        "notes": "Materials only (James Hardie lap boards). LABOR-INCLUSIVE: $6-15/sq ft installed; heavy, labor-intensive."
      },
      {
        "name": "Stucco",
        "lowUSD": 7,
        "highUSD": 17,
        "tier": "mid",
        "homeDepotSearch": "stucco base coat",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE: stucco is a site-applied finish so pricing is quoted installed (HomeAdvisor 2025). Raw cement materials are minor share."
      },
      {
        "name": "Brick veneer",
        "lowUSD": 8,
        "highUSD": 13,
        "tier": "premium",
        "homeDepotSearch": "brick veneer",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE installed (HomeAdvisor); full brick $11-27 installed. Brick + mortar materials alone roughly $4-10/sq ft."
      },
      {
        "name": "Stone veneer",
        "lowUSD": 10,
        "highUSD": 35,
        "tier": "luxury",
        "homeDepotSearch": "manufactured stone veneer",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE installed (This Old House 2026). Manufactured veneer flats alone ~$6-15/sq ft; natural full stone $30-48 installed."
      }
    ]
  },
  {
    "match": [
      "shingle",
      "roofing"
    ],
    "item": "Roofing",
    "unit": "per square (100 sq ft)",
    "options": [
      {
        "name": "3-tab asphalt shingles",
        "lowUSD": 80,
        "highUSD": 130,
        "tier": "budget",
        "homeDepotSearch": "3 tab roof shingles",
        "notes": "Materials only (2025 material guides). 15-20 yr typical life."
      },
      {
        "name": "Architectural asphalt shingles",
        "lowUSD": 100,
        "highUSD": 250,
        "tier": "mid",
        "homeDepotSearch": "architectural roof shingles",
        "notes": "Materials only. Dimensional/laminated; 25-30 yr life; the default US choice."
      },
      {
        "name": "Metal (steel/aluminum panels)",
        "lowUSD": 100,
        "highUSD": 800,
        "tier": "premium",
        "homeDepotSearch": "metal roof panels",
        "notes": "Materials only. Corrugated/ribbed panels low end; standing seam high end; copper $900-2,000/square."
      },
      {
        "name": "Concrete/clay tile",
        "lowUSD": 300,
        "highUSD": 1600,
        "tier": "premium",
        "homeDepotSearch": "concrete roof tile",
        "notes": "Materials only. Concrete $3-5/sq ft; clay ~$8-16/sq ft. Heavy - may need structural reinforcement (labor extra)."
      },
      {
        "name": "Slate",
        "lowUSD": 600,
        "highUSD": 1600,
        "tier": "luxury",
        "homeDepotSearch": "slate roofing",
        "notes": "Materials only ($6-16/sq ft). LABOR-INCLUSIVE comparison: $2,400-3,300/square installed (2025). 75-100+ yr life."
      }
    ]
  },
  {
    "match": [
      "window"
    ],
    "item": "Windows",
    "unit": "per window",
    "options": [
      {
        "name": "Vinyl",
        "lowUSD": 150,
        "highUSD": 700,
        "tier": "budget",
        "homeDepotSearch": "vinyl replacement window double hung",
        "notes": "Window unit only at retail. LABOR-INCLUSIVE comparison: $400-1,200 installed; 2025 This Old House survey average $558."
      },
      {
        "name": "Fiberglass",
        "lowUSD": 400,
        "highUSD": 1200,
        "tier": "mid",
        "homeDepotSearch": "fiberglass replacement window",
        "notes": "Window unit only. LABOR-INCLUSIVE comparison: $1,100-2,200 installed (2025-26). ~30-50% premium over vinyl, better durability."
      },
      {
        "name": "Wood-clad",
        "lowUSD": 600,
        "highUSD": 1800,
        "tier": "premium",
        "homeDepotSearch": "wood clad window Andersen",
        "notes": "Window unit only at low end; LABOR-INCLUSIVE $950-1,800+ installed (Modernize/Pella). Wood interior, aluminum/fiberglass exterior."
      }
    ]
  },
  {
    "match": [
      "vanity"
    ],
    "item": "Bathroom vanity",
    "unit": "per vanity",
    "options": [
      {
        "name": "Stock (big-box)",
        "lowUSD": 200,
        "highUSD": 1500,
        "tier": "budget",
        "homeDepotSearch": "bathroom vanity with top",
        "notes": "Vanity + top only. Basic single-sink units start ~$150; most $200-800 (CostHelper/HomeAdvisor 2025-26)."
      },
      {
        "name": "Semi-custom",
        "lowUSD": 1500,
        "highUSD": 4500,
        "tier": "mid",
        "homeDepotSearch": "72 inch double sink bathroom vanity",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE at upper end ($1,800-3,500 installed typical). Solid wood box, stone top, chosen finish/hardware."
      },
      {
        "name": "Custom built-in",
        "lowUSD": 3000,
        "highUSD": 12000,
        "tier": "luxury",
        "homeDepotSearch": "custom bathroom vanity cabinet",
        "laborIncluded": true,
        "notes": "LABOR-INCLUSIVE: quoted built-and-installed ($6,000-12,000+ common for full custom, 2025-26 guides)."
      }
    ]
  },
  {
    "match": [
      "shower",
      "surround",
      "tub"
    ],
    "item": "Shower surround",
    "unit": "per surround",
    "options": [
      {
        "name": "Acrylic/fiberglass kit",
        "lowUSD": 300,
        "highUSD": 1500,
        "tier": "budget",
        "homeDepotSearch": "shower wall surround kit",
        "notes": "Materials only; Home Depot acrylic surrounds span $50-3,000, typical 3-5 piece alcove kits $300-1,500. Installed comparison $3,000-6,000."
      },
      {
        "name": "Tile (porcelain/ceramic)",
        "lowUSD": 500,
        "highUSD": 2500,
        "tier": "mid",
        "homeDepotSearch": "shower wall tile",
        "notes": "Materials only estimate for ~100 sq ft of walls: tile $2-15/sq ft plus backer board and waterproofing. LABOR-INCLUSIVE comparison: $4,000-12"
      },
      {
        "name": "Stone/solid-surface slab panels",
        "lowUSD": 1000,
        "highUSD": 3500,
        "tier": "luxury",
        "homeDepotSearch": "solid surface shower wall panels",
        "notes": "Materials only for cultured marble/solid-surface panel sets. Natural stone slab walls fabricated and installed can exceed $10,000 (LABOR-INC"
      }
    ]
  },
  {
    "match": [
      "paint"
    ],
    "item": "Interior paint",
    "unit": "per gallon",
    "options": [
      {
        "name": "Builder grade",
        "lowUSD": 20,
        "highUSD": 35,
        "tier": "budget",
        "homeDepotSearch": "Behr Premium Plus interior paint",
        "notes": "Paint only. Glidden Essentials ~$20; Behr Premium Plus under $30-35 (2025-26)."
      },
      {
        "name": "Mid grade",
        "lowUSD": 40,
        "highUSD": 60,
        "tier": "mid",
        "homeDepotSearch": "Behr Marquee interior paint",
        "notes": "Paint only. Behr Ultra $44-52, Marquee ~$50-55; SW SuperPaint ~$62 full retail."
      },
      {
        "name": "Premium line",
        "lowUSD": 60,
        "highUSD": 115,
        "tier": "premium",
        "homeDepotSearch": "premium interior paint one coat",
        "notes": "Paint only. SW Duration ~$88, Emerald $79-115, Benjamin Moore Aura ~$90 (sold at SW/BM stores, not Home Depot; Behr Dynasty is HD's top line"
      }
    ]
  },
  {
    "match": [
      "water heater"
    ],
    "item": "Water heater",
    "unit": "per unit",
    "options": [
      {
        "name": "Electric tank 40-50 gal",
        "lowUSD": 400,
        "highUSD": 900,
        "tier": "budget",
        "homeDepotSearch": "50 gallon electric water heater",
        "notes": "Unit only (Home Depot/Rheem 2025). Installed comparison $600-3,000."
      },
      {
        "name": "Gas tank 40-50 gal",
        "lowUSD": 550,
        "highUSD": 1100,
        "tier": "budget",
        "homeDepotSearch": "40 gallon gas water heater",
        "notes": "Unit only; Rheem Performance 40-gal $589 at Home Depot (2025), Performance Platinum toward $1,100. Installed $700-3,100."
      },
      {
        "name": "Electric tankless",
        "lowUSD": 200,
        "highUSD": 800,
        "tier": "mid",
        "homeDepotSearch": "tankless electric water heater",
        "notes": "Unit only. Whole-home electric tankless often needs major panel/wiring upgrades (labor extra); installed $1,800-4,200."
      },
      {
        "name": "Gas tankless",
        "lowUSD": 1000,
        "highUSD": 2300,
        "tier": "premium",
        "homeDepotSearch": "Rheem tankless gas water heater",
        "notes": "Unit only; Rheem 9.0-9.5 GPM $1,299-1,469 at Home Depot, condensing models higher. LABOR-INCLUSIVE comparison: $2,700-6,500 installed (venti"
      }
    ]
  },
  {
    "match": [
      "hvac",
      "furnace",
      "heat pump",
      "condenser"
    ],
    "item": "HVAC (central AC + furnace)",
    "unit": "per system",
    "options": [
      {
        "name": "Standard 14 SEER2 single-stage",
        "lowUSD": 7000,
        "highUSD": 10000,
        "tier": "budget",
        "homeDepotSearch": "central air conditioner condenser",
        "laborIncluded": true,
        "notes": "Installed price for the full AC + furnace pair (2025-26 market)."
      },
      {
        "name": "16 SEER2 two-stage",
        "lowUSD": 9000,
        "highUSD": 13000,
        "tier": "mid",
        "homeDepotSearch": "16 seer central air conditioner",
        "laborIncluded": true,
        "notes": "Installed price for the full AC + furnace pair (2025-26 market)."
      },
      {
        "name": "18+ SEER2 variable-speed",
        "lowUSD": 12000,
        "highUSD": 18000,
        "tier": "premium",
        "homeDepotSearch": "variable speed heat pump system",
        "laborIncluded": true,
        "notes": "Installed price for the full AC + furnace pair (2025-26 market)."
      }
    ]
  },
  {
    "match": [
      "garage door"
    ],
    "item": "Garage door",
    "unit": "per door",
    "options": [
      {
        "name": "Steel single (non-insulated)",
        "lowUSD": 600,
        "highUSD": 1500,
        "tier": "budget",
        "homeDepotSearch": "16x7 garage door",
        "notes": "Door only (HomeGuide/This Old House 2025-26). Installed single steel $1,200-2,200."
      },
      {
        "name": "Steel double (insulated)",
        "lowUSD": 1200,
        "highUSD": 3000,
        "tier": "mid",
        "homeDepotSearch": "insulated double garage door",
        "notes": "Door only. LABOR-INCLUSIVE comparison: $2,400-4,500 installed for mid-range double."
      },
      {
        "name": "Wood / carriage house",
        "lowUSD": 1200,
        "highUSD": 8000,
        "tier": "luxury",
        "homeDepotSearch": "carriage house garage door",
        "notes": "Door only ($900-4,500 wood; carriage style to $8,000). Custom wood carriage doors $3,000-10,000+ installed (LABOR-INCLUSIVE)."
      }
    ]
  },
  {
    "match": [
      "entry door",
      "front door"
    ],
    "item": "Front entry door",
    "unit": "per door",
    "options": [
      {
        "name": "Steel",
        "lowUSD": 300,
        "highUSD": 800,
        "tier": "budget",
        "homeDepotSearch": "steel entry door prehung",
        "notes": "Materials only (Bob Vila 2025-26): slab $300-700, prehung unit $470-800. Dents/rusts if coating breached."
      },
      {
        "name": "Fiberglass",
        "lowUSD": 500,
        "highUSD": 2000,
        "tier": "mid",
        "homeDepotSearch": "fiberglass entry door prehung",
        "notes": "Materials only. Best long-term value; woodgrain textures; premium units to $3,500 installed (LABOR-INCLUSIVE)."
      },
      {
        "name": "Solid wood",
        "lowUSD": 1000,
        "highUSD": 5000,
        "tier": "luxury",
        "homeDepotSearch": "mahogany wood front door",
        "notes": "Materials only ($1,000-3,000 typical; custom $2,500-5,000+). Needs periodic refinishing."
      }
    ]
  },
  {
    "match": [
      "baseboard",
      "casing",
      "trim"
    ],
    "item": "Baseboard / trim",
    "unit": "linear ft",
    "options": [
      {
        "name": "PVC/polystyrene",
        "lowUSD": 0.9,
        "highUSD": 1.4,
        "tier": "budget",
        "homeDepotSearch": "pvc baseboard moulding",
        "notes": "Materials only (2025-26 guides). Moisture-proof; baths/basements."
      },
      {
        "name": "Primed MDF",
        "lowUSD": 1,
        "highUSD": 4.5,
        "tier": "budget",
        "homeDepotSearch": "primed mdf baseboard",
        "notes": "Materials only. $1-3.50 standard profiles; taller 5-7 in. profiles $2-4.50. Dents and swells if wet."
      },
      {
        "name": "Pine (finger-joint/clear)",
        "lowUSD": 3,
        "highUSD": 6.5,
        "tier": "mid",
        "homeDepotSearch": "pine baseboard moulding",
        "notes": "Materials only. Stainable solid softwood."
      },
      {
        "name": "Hardwood (oak)",
        "lowUSD": 5,
        "highUSD": 10,
        "tier": "premium",
        "homeDepotSearch": "oak baseboard moulding",
        "notes": "Materials only ($5-9 oak; cherry/mahogany to $10+). Installed comparison: $5-9/LF total with labor for standard material."
      }
    ]
  },
  {
    "match": [
      "deck"
    ],
    "item": "Deck boards",
    "unit": "sq ft",
    "options": [
      {
        "name": "Pressure-treated pine",
        "lowUSD": 3,
        "highUSD": 6,
        "tier": "budget",
        "homeDepotSearch": "pressure treated deck boards",
        "notes": "Decking boards only (2025-26 guides). Needs staining/sealing every 1-2 yrs."
      },
      {
        "name": "Cedar",
        "lowUSD": 7,
        "highUSD": 12,
        "tier": "mid",
        "homeDepotSearch": "cedar deck boards",
        "notes": "Boards only. Naturally rot-resistant; still needs periodic sealing."
      },
      {
        "name": "Composite",
        "lowUSD": 5,
        "highUSD": 18,
        "tier": "premium",
        "homeDepotSearch": "Trex composite decking",
        "notes": "Boards only. Entry composite $5-9; premium capped lines (Trex Transcend, TimberTech) $12-18. Near-zero maintenance."
      }
    ]
  }
];

export function homeDepotSearchUrl(q: string): string {
  return `https://www.homedepot.com/s/${encodeURIComponent(q)}`;
}

/** Best-match library entry for an item name, or null. */
export function matchLibrary(itemName: string): OptionLibraryEntry | null {
  const n = itemName.toLowerCase();
  let best: OptionLibraryEntry | null = null;
  let bestLen = 0;
  for (const e of OPTION_LIBRARY)
    for (const kw of e.match)
      if (n.includes(kw) && kw.length > bestLen) {
        best = e;
        bestLen = kw.length;
      }
  return best;
}
