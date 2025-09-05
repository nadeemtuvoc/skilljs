

// -------------------- MASTER LIST (domains & exact skill names) --------------------
const MASTER_LIST = {"Accounting Standards (Ind AS)":["101 - First-time Adoption of Ind AS","109 - Financial Instruments","102 - Share-based Payment","108 - Operating Segments","114 - Regulatory Deferral Accounts","113 - Fair Value Measurement","106 - Exploration for and Evaluation of Mineral Resources","110 - Consolidated Financial Statements","115 - Revenue from Contracts with Customers","103 - Business Combinations","19 - Employee Benefits","10 - Events after the Reporting Period","111 - Joint Arrangements","12 - Income Taxes","2 - Inventories","8 - Policies, Changes in Estimates and Errors","16 - Property, Plant and Equipment","1 - Presentation of Financial Statements","116 - Leases","112 - Disclosure of Interests in Other Entities","23 - Borrowing Costs","34 - Interim Financial Reporting","38 - Intangible Assets","28 - Investments in Associates and Joint Ventures","24 - Related Party Disclosures","36 - Impairment of Assets","40 - Investment Property","32 - Financial Instruments: Presentation","33 - Earnings per Share","21 - Effects of Changes in Forex Rates","37 - Provisions, Contingent Liabilities and Assets","107 - Financial Instruments: Disclosures","105 - NC Assets Held for Sale and Discontinued Ops","7 - Statement of Cash Flows"],"Tech Proficiency":["SQL","Tally Prime","AI Literacy","SAP S/4 HANA","Power BI","Excel Advanced","Digital Literacy","Excel Intermediate","Excel Beginner"],"Goods & Service Tax (GST)":["Input Tax Credit","Accounting","Registratioin","Payment & Filings","E-invoicing & E-way Bill","Audit & Assessment"],"General Accounting":["Journal Entry & Accounting Equation","Rectification of Errors","Accounting Principles","Inventory Accounting","Fixed Asset Accounting","Account Receivables","Accounts Payable","Accounting Period Closure","Bank Reconciliation Statement"],"Treasury":["Capital Structure Management","Cash Management","Surplus Deployment","Working Capital & Trade Finance","Governance","Risk Management - Forex & Int Rate","Option Instruments & Valuation"],"Strategic Finance":["Fund Raise","Operating & Financial Leverage","Debt Valuation","Equity Valuation"],"Business Finance":["Capital Budgeting","Ratio Analysis","Budgeting & Variance"],"Corporate Tax":["TDS & TCS Compliance","TP & International Taxation","Advance Tax & Interest","Computation & ITR","Tax Benefits & Restructuring","Assessment Procedures"],"Aptitude":["Business Math"]}

const ALLOWED_DIFFICULTY = new Set(["Simple", "Medium", "Complex"]);

// Build reverse lookup: skill -> domain(s)
const SKILL_TO_DOMAIN = (() => {
  const map = new Map();
  Object.entries(MASTER_LIST).forEach(([domain, skills]) => {
    skills.forEach((skill) => {
      const arr = map.get(skill) || [];
      arr.push(domain);
      map.set(skill, arr);
    });
  });
  return map;
})();

// -------------------- UTILITIES --------------------
function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’'`]/g, "'")
    .trim();
}

// Levenshtein distance
function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

function bestFuzzyMatch(input, candidates, opts = {}) {
  const normInput = normalize(input);
  const byNorm = new Map(candidates.map(c => [normalize(c), c]));
  if (byNorm.has(normInput)) return byNorm.get(normInput);

  // If exact normalized not found, pick closest by Levenshtein
  let best = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    const dist = levenshtein(normInput, normalize(cand));
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }

  // Accept only if close enough (absolute <= 3 OR <= 30% of length)
  const len = Math.max(normInput.length, 1);
  const ratio = bestDist / len;
  const maxDist = Math.min(3, Math.ceil(len * 0.3));
  if (bestDist <= maxDist || ratio <= 0.3) return best;

  return null;
}

function canonicalizeDifficulty(diff) {
  const d = String(diff || "").trim();
  // Fix extra spaces / case only (no fuzzy needed)
  const title = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
  return ALLOWED_DIFFICULTY.has(title) ? title : null;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// -------------------- CORE MAPPER & VALIDATOR --------------------
/**
 * Try to map an item {domain, skill, difficulty, questions} to canonical values.
 * - Fixes case/spacing via normalization.
 * - Fuzzy-matches skill first (across all domains), then uses its domain if unique.
 * - If skill fuzzy not found, tries domain fuzzy; if both fail => invalid.
 */
function toCanonicalItem(item) {
  const raw = clone(item);

  // 1) Difficulty
  const difficulty = canonicalizeDifficulty(raw.difficulty);
  if (!difficulty) return null;

  // 2) Skill (fuzzy across all skills)
  const allSkills = Array.from(SKILL_TO_DOMAIN.keys());
  const skill = bestFuzzyMatch(raw.skill, allSkills);
  if (!skill) return null;

  // 3) Domain: prefer domain owning the skill
  const owningDomains = SKILL_TO_DOMAIN.get(skill) || [];
  let domain = null;

  if (owningDomains.length === 1) {
    domain = owningDomains[0];
  } else if (owningDomains.length > 1) {
    // If multiple, try to fuzzy-match provided domain within owningDomains
    const guess = bestFuzzyMatch(raw.domain, owningDomains);
    domain = guess || owningDomains[0];
  } else {
    // Shouldn't happen because skill came from map, but guard anyway
    return null;
  }

  // Ensure (domain, skill) pair exists in master
  if (!MASTER_LIST[domain] || !MASTER_LIST[domain].includes(skill)) return null;

  // 4) Questions: keep as-is for now (adjusted later)
  let questions = Number(raw.questions);
  if (!Number.isFinite(questions)) questions = 0;

  return { domain, skill, difficulty, questions };
}

/**
 * Deduplicate by Domain+Skill only (keep first occurrence).
 */
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = `${it.domain}||${it.skill}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

// -------------------- QUESTION COUNT ADJUSTMENTS --------------------
function ensurePerItemBounds(items) {
  for (const it of items) {
    // Step 7: raise to 4 (loop +1)
    while (it.questions < 4) it.questions += 1;
    // Step 8: cap to 8 (loop -1)
    while (it.questions > 8) it.questions -= 1;
  }
}

function totalQuestions(items) {
  return items.reduce((s, it) => s + it.questions, 0);
}

function increaseToTarget(items, target) {
  // Step 9: Ascending by current questions; add +1 from the least, skip those already at 8
  let total = totalQuestions(items);
  if (total >= target) return;

  while (total < target) {
    // Sort ascending
    items.sort((a, b) => a.questions - b.questions);
    let progressed = false;
    for (const it of items) {
      if (it.questions < 8) {
        it.questions += 1;
        total += 1;
        progressed = true;
        if (total >= target) break;
      }
    }
    if (!progressed) break; // all at 8
  }
}

function decreaseToTarget(items, target) {
  // Step 10: Deduct starting from the combo having most count (sort DESC)
  let total = totalQuestions(items);
  if (total <= target) return;

  while (total > target) {
    // Sort descending
    items.sort((a, b) => b.questions - a.questions);
    let progressed = false;
    for (const it of items) {
      if (it.questions > 4) {
        it.questions -= 1;
        total -= 1;
        progressed = true;
        if (total <= target) break;
      }
    }
    if (!progressed) break; // all at 4
  }
}
const want = [
      {
    domain: 'Aptitude',
    skill: 'Business Math',
    difficulty: 'Medium',
  },
  {
    domain: 'General Accounting',
    skill: 'Accounting',
    difficulty: 'Medium',
  },{
    domain: 'Tech Proficiency',
    skill: 'Excel Intermediate',
    difficulty: 'Medium',
  },{
    domain: 'Tech Proficiency',
    skill: 'SQL',
    difficulty: 'Medium',
  },
   { domain: "General Accounting", skill: "Journal Entry & Accounting",difficulty: 'Medium' }
  ];

// -------------------- FALLBACKS & SIZE LIMITS --------------------
function addFallbacksIfNeeded(items) {
  // Step 5: If valid < 4, add:
  // - Aptitude > Business Math > Medium
  // - OR General Accounting > Accounting Principles > Medium
  // whichever is not present.
  function has(domain, skill) {
    return items.some(it => it.domain === domain && it.skill === skill);
  }

  

  for (const combo of want) {
    if (items.length >= 4) break;
    if (!has(combo.domain, combo.skill)) {
      items.push({
        domain: combo.domain,
        skill: combo.skill,
        difficulty: combo.difficulty,
        questions: 4
      });
    }
  }

  // If still < 4 after trying to add both, return false
  return items.length >= 4;
}

function capToMaxEight(items) {
  // Step 6: If > 8, sort by questions DESC and drop bottom ones
  if (items.length <= 8) return items;
  const sorted = [...items].sort((a, b) => b.questions - a.questions);
  return sorted.slice(0, 8);
}
/**
 * Fills the curated array to reach the target total by adding items from the want array.
 * Each new skill will have at least minPerSkill questions assigned.
 * 
 * @param {Array} curated - The current array of skill items
 * @param {Array} want - Array of fallback skill items to add if needed
 * @param {number} targetTotal - The target total number of questions
 * @param {number} minPerSkill - Minimum number of questions to assign per new skill (default: 4)
 * @returns {Array|Object} The updated curated array or error object
 */
function fillToTarget(curated, want, targetTotal, minPerSkill = 4) {
  const maxPerSkill = 8;
  function totalQuestions(arr) {
    return arr.reduce((sum, item) => sum + (item.questions || 0), 0);
  }

  let total = totalQuestions(curated);

  if (total === targetTotal) return curated;

  let remaining = targetTotal - total;

  for (let w of want) {
    if (remaining <= 0) break;

    // Check duplicate (same domain, skill)
    const exists = curated.some(
      (c) =>
        c.domain === w.domain &&
        c.skill === w.skill
    );

    if (exists) continue; // skip duplicates

    // Use minPerSkill as the minimum questions to add for new skills
    const addCount = Math.min(maxPerSkill, Math.max(minPerSkill, remaining));
    curated.push({ ...w, questions: addCount });
    remaining -= addCount;
  }

  if (remaining > 0) {
    return {
      error: `Unable to reach target total (${targetTotal}). Short by ${remaining}.`
    };
  }

  return curated;
}

function balanceQuestions(arr, targetTotal) {
  const MIN = 4;
  const MAX = 8;

  // Calculate total questions
  function totalQuestions(items) {
    return items.reduce((sum, item) => sum + (item.questions || 0), 0);
  }

  // Sorting: by questions (desc), then domain (asc), then skill (asc)
  function sortByPriority(a, b) {
    if (b.questions !== a.questions) {
      return b.questions - a.questions;
    }
    if (a.domain !== b.domain) {
      return a.domain.localeCompare(b.domain);
    }
    return a.skill.localeCompare(b.skill);
  }

  // Ensure bounds
  arr.forEach(item => {
    if (item.questions < MIN) item.questions = MIN;
    if (item.questions > MAX) item.questions = MAX;
  });

  let total = totalQuestions(arr);

  // Adjust step by step (+1 or -1)
  while (total !== targetTotal) {
    arr.sort(sortByPriority);

    if (total < targetTotal) {
      // Need to increase
      for (let item of arr) {
        if (item.questions < MAX) {
          item.questions += 1;
          total += 1;
          break;
        }
      }
    } else {
      // Need to decrease
      for (let item of arr) {
        if (item.questions > MIN) {
          item.questions -= 1;
          total -= 1;
          break;
        }
      }
    }
  }

  return arr;
}

// -------------------- MAIN --------------------
function adjustAiResponse(jsonText, targetTotal) {
  let aiArray;
  try {
    aiArray = JSON.parse(jsonText);
    if (!Array.isArray(aiArray)) {
      return JSON.stringify({ error: "Input must be a JSON array" });
    }
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON input" });
  }
 console.log("reach here")
 
  // 1–2) Normalize + fuzzy map each item; 3) Exclude invalid combos
  const canonical = [];
  for (const raw of aiArray) {
    const mapped = toCanonicalItem(raw);
    if (mapped) canonical.push(mapped);
  }

  // 4) Deduplicate by Domain+Skill+Difficulty
  let curated = dedupe(canonical);

  // 5) If < 4, add fallbacks (Business Math / Accounting Principles). If still <4 => error
  if (!addFallbacksIfNeeded(curated)) {
    return JSON.stringify({
      error:
        "Valid Skill Set combination count is less than 4 even after adding fallbacks (Business Math / Accounting Principles)."
    });
  }
 console.log("reach here")
  // 6) If > 8, keep top by question count
  curated = capToMaxEight(curated);

  // 7 & 8) Enforce per-item question bounds [4..8]
  ensurePerItemBounds(curated);

  // 9) If total below target, add 1 starting from least (skip those at 8)
  increaseToTarget(curated, targetTotal);

  // 10) If total above target, deduct 1 starting from most (skip those at 4)
  decreaseToTarget(curated, targetTotal);
 console.log("reach here")
 console.log(curated)
  // Final sanity checks
  const total = totalQuestions(curated);
  //targetTotal is second argument which we passed in main call
  if (total !== targetTotal) {
    const fillResult = fillToTarget(curated, want, targetTotal, 4); // minPerSkill = 4
    if (fillResult.error) {
      return JSON.stringify(fillResult);
    }
    curated = balanceQuestions(fillResult, targetTotal);
  }

  // Return curated array
 console.log("final")
  
  
  console.log(curated)
//  bubble_fn_AIresult(JSON.stringify(curated))
  return JSON.stringify(curated, null, 2);
}
const json = [{"domain":"General Accounting","skill":"Account Receivables","difficulty":"Complex","questions":8},{"domain":"General Accounting","skill":"Accounting Principles","difficulty":"Medium","questions":6},{"domain":"Tech Proficiency","skill":"Excel Intermediate","difficulty":"Medium","questions":5},{"domain":"Tech Proficiency","skill":"SAP S/4 HANA","difficulty":"Medium","questions":5},{"domain":"Aptitude","skill":"Business Math","difficulty":"Simple","questions":6}]

adjustAiResponse(JSON.stringify(json),57);






