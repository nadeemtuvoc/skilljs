

/**
 * =============================================================================
 * SKILL ASSESSMENT SYSTEM - MASTER DATA & CONFIGURATION
 * =============================================================================
 * This module contains the master list of skills organized by domains and
 * provides utilities for skill validation, fuzzy matching, and question allocation.
 */

// -------------------- MASTER LIST (domains & exact skill names) --------------------
/**
 * Master list of all available skills organized by domain
 * Each domain contains an array of specific skills that can be assessed
 */
const MASTER_LIST = {
  "Accounting Standards (Ind AS)": [
    "101 - First-time Adoption of Ind AS", "109 - Financial Instruments", 
    "102 - Share-based Payment", "108 - Operating Segments", 
    "114 - Regulatory Deferral Accounts", "113 - Fair Value Measurement", 
    "106 - Exploration for and Evaluation of Mineral Resources", 
    "110 - Consolidated Financial Statements", 
    "115 - Revenue from Contracts with Customers", "103 - Business Combinations", 
    "19 - Employee Benefits", "10 - Events after the Reporting Period", 
    "111 - Joint Arrangements", "12 - Income Taxes", "2 - Inventories", 
    "8 - Policies, Changes in Estimates and Errors", 
    "16 - Property, Plant and Equipment", 
    "1 - Presentation of Financial Statements", "116 - Leases", 
    "112 - Disclosure of Interests in Other Entities", "23 - Borrowing Costs", 
    "34 - Interim Financial Reporting", "38 - Intangible Assets", 
    "28 - Investments in Associates and Joint Ventures", 
    "24 - Related Party Disclosures", "36 - Impairment of Assets", 
    "40 - Investment Property", "32 - Financial Instruments: Presentation", 
    "33 - Earnings per Share", "21 - Effects of Changes in Forex Rates", 
    "37 - Provisions, Contingent Liabilities and Assets", 
    "107 - Financial Instruments: Disclosures", 
    "105 - NC Assets Held for Sale and Discontinued Ops", 
    "7 - Statement of Cash Flows"
  ],
  "Tech Proficiency": [
    "SQL", "Tally Prime", "AI Literacy", "SAP S/4 HANA", "Power BI", 
    "Excel Advanced", "Digital Literacy", "Excel Intermediate", "Excel Beginner"
  ],
  "Goods & Service Tax (GST)": [
    "Input Tax Credit", "Accounting", "Registratioin", "Payment & Filings", 
    "E-invoicing & E-way Bill", "Audit & Assessment"
  ],
  "General Accounting": [
    "Journal Entry & Accounting Equation", "Rectification of Errors", 
    "Accounting Principles", "Inventory Accounting", "Fixed Asset Accounting", 
    "Account Receivables", "Accounts Payable", "Accounting Period Closure", 
    "Bank Reconciliation Statement"
  ],
  "Treasury": [
    "Capital Structure Management", "Cash Management", "Surplus Deployment", 
    "Working Capital & Trade Finance", "Governance", 
    "Risk Management - Forex & Int Rate", "Option Instruments & Valuation"
  ],
  "Strategic Finance": [
    "Fund Raise", "Operating & Financial Leverage", "Debt Valuation", "Equity Valuation"
  ],
  "Business Finance": [
    "Capital Budgeting", "Ratio Analysis", "Budgeting & Variance"
  ],
  "Corporate Tax": [
    "TDS & TCS Compliance", "TP & International Taxation", "Advance Tax & Interest", 
    "Computation & ITR", "Tax Benefits & Restructuring", "Assessment Procedures"
  ],
  "Aptitude": ["Business Math"]
};

/**
 * Set of allowed difficulty levels for skill assessments
 */
const ALLOWED_DIFFICULTY = new Set(["Simple", "Medium", "Complex"]);

/**
 * Reverse lookup map: skill name -> array of domains that contain this skill
 * Built automatically from MASTER_LIST for efficient skill-to-domain mapping
 */
const SKILL_TO_DOMAIN = (() => {
  console.log("🔧 Building skill-to-domain reverse lookup map...");
  const map = new Map();
  
  Object.entries(MASTER_LIST).forEach(([domain, skills]) => {
    skills.forEach((skill) => {
      const arr = map.get(skill) || [];
      arr.push(domain);
      map.set(skill, arr);
    });
  });
  
  console.log(`✅ Built reverse lookup for ${map.size} unique skills across ${Object.keys(MASTER_LIST).length} domains`);
  return map;
})();

// -------------------- UTILITY FUNCTIONS --------------------

/**
 * Normalizes a string for consistent comparison by:
 * - Converting to lowercase
 * - Replacing multiple spaces with single space
 * - Standardizing apostrophe characters
 * - Trimming whitespace
 * 
 * @param {string} str - The string to normalize
 * @returns {string} The normalized string
 */
function normalize(str) {
  const normalized = String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[''`]/g, "'")
    .trim();
  
  console.log(`📝 Normalized "${str}" → "${normalized}"`);
  return normalized;
}

/**
 * Calculates the Levenshtein distance between two strings
 * This measures the minimum number of single-character edits required to change one string into another
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The Levenshtein distance (0 = identical, higher = more different)
 */
function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const m = a.length, n = b.length;
  
  // Handle edge cases
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Initialize dynamic programming table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  // Base cases: empty string transformations
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the DP table
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
  
  const distance = dp[m][n];
  console.log(`🔍 Levenshtein distance between "${a}" and "${b}": ${distance}`);
  return distance;
}

/**
 * Performs fuzzy string matching to find the best candidate from a list
 * First tries exact normalized match, then uses Levenshtein distance for fuzzy matching
 * 
 * @param {string} input - The input string to match
 * @param {string[]} candidates - Array of candidate strings to match against
 * @param {Object} opts - Optional parameters (currently unused)
 * @returns {string|null} The best matching candidate or null if no good match found
 */
function bestFuzzyMatch(input, candidates, opts = {}) {
  console.log(`🔍 Fuzzy matching "${input}" against ${candidates.length} candidates`);
  
  const normInput = normalize(input);
  const byNorm = new Map(candidates.map(c => [normalize(c), c]));
  
  // Check for exact normalized match first
  if (byNorm.has(normInput)) {
    const exactMatch = byNorm.get(normInput);
    console.log(`✅ Found exact normalized match: "${exactMatch}"`);
    return exactMatch;
  }

  // If exact normalized not found, pick closest by Levenshtein distance
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
  
  if (bestDist <= maxDist || ratio <= 0.3) {
    console.log(`✅ Found fuzzy match: "${best}" (distance: ${bestDist}, ratio: ${ratio.toFixed(2)})`);
    return best;
  }

  console.log(`❌ No suitable fuzzy match found (best distance: ${bestDist}, ratio: ${ratio.toFixed(2)})`);
  return null;
}

/**
 * Canonicalizes difficulty level by fixing case and validating against allowed values
 * 
 * @param {string} diff - The difficulty string to canonicalize
 * @returns {string|null} The canonicalized difficulty or null if invalid
 */
function canonicalizeDifficulty(diff) {
  console.log(`🔄 Canonicalizing difficulty: "${diff}"`);
  const d = String(diff || "").trim();
  const title = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
  
  const isValid = ALLOWED_DIFFICULTY.has(title);
  console.log(`📊 Difficulty "${diff}" → "${title}" (valid: ${isValid})`);
  
  return isValid ? title : null;
}

/**
 * Creates a deep clone of an object using JSON serialization
 * Note: This method has limitations (no functions, dates, etc.) but works for simple objects
 * 
 * @param {Object} obj - The object to clone
 * @returns {Object} A deep copy of the input object
 */
function clone(obj) {
  console.log(`📋 Cloning object with ${Object.keys(obj).length} properties`);
  return JSON.parse(JSON.stringify(obj));
}

// -------------------- CORE MAPPER & VALIDATOR --------------------

/**
 * Maps a raw skill item to canonical values by validating and normalizing all fields
 * This function performs fuzzy matching for skills and domains, validates difficulty levels,
 * and ensures the final item exists in the master list
 * 
 * @param {Object} item - Raw item with {domain, skill, difficulty, questions} properties
 * @returns {Object|null} Canonical item or null if validation fails
 */
function toCanonicalItem(item) {
  console.log(`🔄 Processing item:`, item);
  const raw = clone(item);

  // 1) Validate and canonicalize difficulty
  const difficulty = canonicalizeDifficulty(raw.difficulty);
  if (!difficulty) {
    console.log(`❌ Invalid difficulty: "${raw.difficulty}"`);
    return null;
  }

  // 2) Find skill using fuzzy matching across all available skills
  const allSkills = Array.from(SKILL_TO_DOMAIN.keys());
  const skill = bestFuzzyMatch(raw.skill, allSkills);
  if (!skill) {
    console.log(`❌ No valid skill found for: "${raw.skill}"`);
    return null;
  }

  // 3) Determine domain: prefer domain that owns the skill
  const owningDomains = SKILL_TO_DOMAIN.get(skill) || [];
  let domain = null;

  if (owningDomains.length === 1) {
    domain = owningDomains[0];
    console.log(`✅ Single domain found for skill: ${domain}`);
  } else if (owningDomains.length > 1) {
    // If skill exists in multiple domains, try to fuzzy-match the provided domain
    const guess = bestFuzzyMatch(raw.domain, owningDomains);
    domain = guess || owningDomains[0];
    console.log(`🔀 Multiple domains for skill, using: ${domain} (from ${owningDomains.join(', ')})`);
  } else {
    // This shouldn't happen since skill came from the map, but guard anyway
    console.log(`❌ No domains found for skill: ${skill}`);
    return null;
  }

  // 4) Final validation: ensure (domain, skill) pair exists in master list
  if (!MASTER_LIST[domain] || !MASTER_LIST[domain].includes(skill)) {
    console.log(`❌ Domain-skill pair not found in master list: ${domain} - ${skill}`);
    return null;
  }

  // 5) Process questions count
  let questions = Number(raw.questions);
  if (!Number.isFinite(questions)) {
    questions = 0;
    console.log(`⚠️ Invalid questions count, defaulting to 0`);
  }

  const canonicalItem = { domain, skill, difficulty, questions };
  console.log(`✅ Successfully canonicalized item:`, canonicalItem);
  return canonicalItem;
}

/**
 * Removes duplicate items based on domain+skill combination, keeping the first occurrence
 * 
 * @param {Array} items - Array of skill items to deduplicate
 * @returns {Array} Array with duplicates removed
 */
function dedupe(items) {
  console.log(`🔄 Deduplicating ${items.length} items...`);
  const seen = new Set();
  const out = [];
  
  for (const it of items) {
    const key = `${it.domain}||${it.skill}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    } else {
      console.log(`🗑️ Removing duplicate: ${it.domain} - ${it.skill}`);
    }
  }
  
  console.log(`✅ Deduplication complete: ${items.length} → ${out.length} items`);
  return out;
}

// -------------------- QUESTION COUNT ADJUSTMENT FUNCTIONS --------------------

/**
 * Ensures each item has questions count within the valid range [4, 8]
 * 
 * @param {Array} items - Array of skill items to adjust
 */
function ensurePerItemBounds(items) {
  console.log(`🔧 Ensuring per-item question bounds [4-8] for ${items.length} items...`);
  
  for (const it of items) {
    const original = it.questions;
    
    // Raise to minimum of 4
    while (it.questions < 4) {
      it.questions += 1;
    }
    
    // Cap to maximum of 8
    while (it.questions > 8) {
      it.questions -= 1;
    }
    
    if (original !== it.questions) {
      console.log(`📊 Adjusted questions for ${it.skill}: ${original} → ${it.questions}`);
    }
  }
  
  console.log(`✅ Per-item bounds adjustment complete`);
}

/**
 * Calculates the total number of questions across all items
 * 
 * @param {Array} items - Array of skill items
 * @returns {number} Total question count
 */
function totalQuestions(items) {
  const total = items.reduce((sum, item) => sum + item.questions, 0);
  console.log(`📊 Total questions: ${total}`);
  return total;
}

/**
 * Increases question counts to reach target total by adding questions to items with fewer questions
 * 
 * @param {Array} items - Array of skill items to adjust
 * @param {number} target - Target total number of questions
 */
function increaseToTarget(items, target) {
  console.log(`📈 Increasing questions to reach target: ${target}`);
  
  let total = totalQuestions(items);
  if (total >= target) {
    console.log(`✅ Already at or above target (${total} >= ${target})`);
    return;
  }

  while (total < target) {
    // Sort by question count (ascending) to prioritize items with fewer questions
    items.sort((a, b) => a.questions - b.questions);
    let progressed = false;
    
    for (const it of items) {
      if (it.questions < 8) {
        it.questions += 1;
        total += 1;
        progressed = true;
        console.log(`➕ Added question to ${it.skill}: ${it.questions - 1} → ${it.questions}`);
        if (total >= target) break;
      }
    }
    
    if (!progressed) {
      console.log(`⚠️ All items at maximum (8 questions), cannot increase further`);
      break;
    }
  }
  
  console.log(`✅ Increase complete. Final total: ${total}`);
}

/**
 * Decreases question counts to reach target total by removing questions from items with more questions
 * 
 * @param {Array} items - Array of skill items to adjust
 * @param {number} target - Target total number of questions
 */
function decreaseToTarget(items, target) {
  console.log(`📉 Decreasing questions to reach target: ${target}`);
  
  let total = totalQuestions(items);
  if (total <= target) {
    console.log(`✅ Already at or below target (${total} <= ${target})`);
    return;
  }

  while (total > target) {
    // Sort by question count (descending) to prioritize items with more questions
    items.sort((a, b) => b.questions - a.questions);
    let progressed = false;
    
    for (const it of items) {
      if (it.questions > 4) {
        it.questions -= 1;
        total -= 1;
        progressed = true;
        console.log(`➖ Removed question from ${it.skill}: ${it.questions + 1} → ${it.questions}`);
        if (total <= target) break;
      }
    }
    
    if (!progressed) {
      console.log(`⚠️ All items at minimum (4 questions), cannot decrease further`);
      break;
    }
  }
  
  console.log(`✅ Decrease complete. Final total: ${total}`);
}
/**
 * Fallback skill combinations to add when insufficient valid skills are found
 * These are commonly used skills that can be added to meet minimum requirements
 */
const FALLBACK_SKILLS = [
  {
    domain: 'Aptitude',
    skill: 'Business Math',
    difficulty: 'Medium',
  },
  {
    domain: 'General Accounting',
    skill: 'Accounting Principles',
    difficulty: 'Medium',
  },
  {
    domain: 'Tech Proficiency',
    skill: 'Excel Intermediate',
    difficulty: 'Medium',
  },
  {
    domain: 'Tech Proficiency',
    skill: 'SQL',
    difficulty: 'Medium',
  },
  { 
    domain: "General Accounting", 
    skill: "Journal Entry & Accounting Equation",
    difficulty: 'Medium' 
  }
];

// -------------------- FALLBACKS & SIZE LIMITS --------------------

/**
 * Adds fallback skills if the current skill set has fewer than 4 items
 * Uses predefined fallback skills to ensure minimum requirements are met
 * 
 * @param {Array} items - Current array of skill items
 * @returns {boolean} True if minimum of 4 items achieved, false otherwise
 */
function addFallbacksIfNeeded(items) {
  console.log(`🔄 Checking if fallbacks needed (current: ${items.length} items)...`);
  
  // Helper function to check if a domain-skill combination already exists
  function has(domain, skill) {
    return items.some(it => it.domain === domain && it.skill === skill);
  }

  // Add fallback skills until we have at least 4 items
  for (const combo of FALLBACK_SKILLS) {
    if (items.length >= 4) break;
    
    if (!has(combo.domain, combo.skill)) {
      const fallbackItem = {
        domain: combo.domain,
        skill: combo.skill,
        difficulty: combo.difficulty,
        questions: 4
      };
      
      items.push(fallbackItem);
      console.log(`➕ Added fallback skill: ${combo.domain} - ${combo.skill}`);
    } else {
      console.log(`⏭️ Fallback skill already exists: ${combo.domain} - ${combo.skill}`);
    }
  }

  const success = items.length >= 4;
  console.log(`${success ? '✅' : '❌'} Fallback check complete: ${items.length} items (target: 4+)`);
  return success;
}

/**
 * Limits the number of items to maximum of 8 by keeping those with highest question counts
 * 
 * @param {Array} items - Array of skill items to cap
 * @returns {Array} Array capped to maximum 8 items
 */
function capToMaxEight(items) {
  console.log(`🔄 Checking item count limit (current: ${items.length} items)...`);
  
  if (items.length <= 8) {
    console.log(`✅ Item count within limit (${items.length} <= 8)`);
    return items;
  }
  
  // Sort by question count (descending) and keep top 8
  const sorted = [...items].sort((a, b) => b.questions - a.questions);
  const capped = sorted.slice(0, 8);
  
  console.log(`✂️ Capped items from ${items.length} to 8 (removed ${items.length - 8} items)`);
  console.log(`📊 Removed items:`, sorted.slice(8).map(item => `${item.domain} - ${item.skill} (${item.questions} questions)`));
  
  return capped;
}
/**
 * Fills the curated array to reach the target total by adding items from the fallback array
 * Each new skill will have at least minPerSkill questions assigned
 * 
 * @param {Array} curated - The current array of skill items
 * @param {Array} fallbackSkills - Array of fallback skill items to add if needed
 * @param {number} targetTotal - The target total number of questions
 * @param {number} minPerSkill - Minimum number of questions to assign per new skill (default: 4)
 * @returns {Array|Object} The updated curated array or error object
 */
function fillToTarget(curated, fallbackSkills, targetTotal, minPerSkill = 4) {
  console.log(`🎯 Filling to target total: ${targetTotal} (min per skill: ${minPerSkill})`);
  
  const maxPerSkill = 8;
  
  function totalQuestions(arr) {
    return arr.reduce((sum, item) => sum + (item.questions || 0), 0);
  }

  let total = totalQuestions(curated);
  console.log(`📊 Current total: ${total}`);

  if (total === targetTotal) {
    console.log(`✅ Already at target total`);
    return curated;
  }

  let remaining = targetTotal - total;
  console.log(`📈 Need to add: ${remaining} questions`);

  for (let fallbackSkill of fallbackSkills) {
    if (remaining <= 0) break;

    // Check for duplicates (same domain, skill)
    const exists = curated.some(
      (c) => c.domain === fallbackSkill.domain && c.skill === fallbackSkill.skill
    );

    if (exists) {
      console.log(`⏭️ Skipping duplicate: ${fallbackSkill.domain} - ${fallbackSkill.skill}`);
      continue;
    }

    // Calculate questions to add for this skill
    const addCount = Math.min(maxPerSkill, Math.max(minPerSkill, remaining));
    const newItem = { ...fallbackSkill, questions: addCount };
    
    curated.push(newItem);
    remaining -= addCount;
    
    console.log(`➕ Added skill: ${fallbackSkill.domain} - ${fallbackSkill.skill} (${addCount} questions)`);
  }

  if (remaining > 0) {
    const error = {
      error: `Unable to reach target total (${targetTotal}). Short by ${remaining}.`
    };
    console.log(`❌ ${error.error}`);
    return error;
  }

  console.log(`✅ Fill to target complete. Final total: ${totalQuestions(curated)}`);
  return curated;
}

/**
 * Balances question counts across items to reach the target total
 * Uses a priority-based approach to adjust questions while maintaining bounds
 * 
 * @param {Array} arr - Array of skill items to balance
 * @param {number} targetTotal - Target total number of questions
 * @returns {Array} Array with balanced question counts
 */
function balanceQuestions(arr, targetTotal) {
  console.log(`⚖️ Balancing questions to reach target: ${targetTotal}`);
  
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

  // Ensure all items are within bounds
  arr.forEach(item => {
    const original = item.questions;
    if (item.questions < MIN) item.questions = MIN;
    if (item.questions > MAX) item.questions = MAX;
    
    if (original !== item.questions) {
      console.log(`🔧 Bounded ${item.skill}: ${original} → ${item.questions}`);
    }
  });

  let total = totalQuestions(arr);
  console.log(`📊 Initial total after bounding: ${total}`);

  // Adjust step by step (+1 or -1) until target is reached
  let iterations = 0;
  const maxIterations = 100; // Safety limit to prevent infinite loops
  
  while (total !== targetTotal && iterations < maxIterations) {
    arr.sort(sortByPriority);

    if (total < targetTotal) {
      // Need to increase: find first item that can be increased
      for (let item of arr) {
        if (item.questions < MAX) {
          item.questions += 1;
          total += 1;
          console.log(`➕ Increased ${item.skill}: ${item.questions - 1} → ${item.questions}`);
          break;
        }
      }
    } else {
      // Need to decrease: find first item that can be decreased
      for (let item of arr) {
        if (item.questions > MIN) {
          item.questions -= 1;
          total -= 1;
          console.log(`➖ Decreased ${item.skill}: ${item.questions + 1} → ${item.questions}`);
          break;
        }
      }
    }
    
    iterations++;
  }

  if (iterations >= maxIterations) {
    console.log(`⚠️ Reached maximum iterations (${maxIterations}) while balancing`);
  }

  console.log(`✅ Balance complete. Final total: ${total} (iterations: ${iterations})`);
  return arr;
}

// -------------------- MAIN PROCESSING FUNCTION --------------------

/**
 * Main function that processes AI response and adjusts skill assessments to meet target requirements
 * This function performs a comprehensive pipeline of validation, normalization, and optimization
 * 
 * @param {string} jsonText - JSON string containing array of skill assessment items
 * @param {number} targetTotal - Target total number of questions to achieve
 * @returns {string} JSON string of the processed and optimized skill assessment array
 */
function adjustAiResponse(jsonText, targetTotal) {
  console.log(`🚀 Starting AI response adjustment process...`);
  console.log(`🎯 Target total questions: ${targetTotal}`);
  
  // Step 1: Parse and validate JSON input
  let aiArray;
  try {
    aiArray = JSON.parse(jsonText);
    if (!Array.isArray(aiArray)) {
      const error = { error: "Input must be a JSON array" };
      console.log(`❌ ${error.error}`);
      return JSON.stringify(error);
    }
    console.log(`✅ Successfully parsed JSON array with ${aiArray.length} items`);
  } catch (e) {
    const error = { error: "Invalid JSON input" };
    console.log(`❌ ${error.error}: ${e.message}`);
    return JSON.stringify(error);
  }

  // Step 2: Normalize and validate each item using fuzzy matching
  console.log(`🔄 Processing and validating items...`);
  const canonical = [];
  for (const raw of aiArray) {
    const mapped = toCanonicalItem(raw);
    if (mapped) {
      canonical.push(mapped);
    }
  }
  console.log(`✅ Validated ${canonical.length} out of ${aiArray.length} items`);

  // Step 3: Remove duplicates based on domain+skill combination
  let curated = dedupe(canonical);

  // Step 4: Ensure minimum of 4 items by adding fallbacks if needed
  if (!addFallbacksIfNeeded(curated)) {
    const error = {
      error: "Valid Skill Set combination count is less than 4 even after adding fallbacks (Business Math / Accounting Principles)."
    };
    console.log(`❌ ${error.error}`);
    return JSON.stringify(error);
  }

  // Step 5: Limit to maximum of 8 items (keep highest question counts)
  curated = capToMaxEight(curated);

  // Step 6: Ensure each item has questions within bounds [4-8]
  ensurePerItemBounds(curated);

  // Step 7: Adjust total to target by increasing/decreasing question counts
  increaseToTarget(curated, targetTotal);
  decreaseToTarget(curated, targetTotal);

  // Step 8: Final validation and balancing
  const total = totalQuestions(curated);
  console.log(`📊 Current total: ${total}, Target: ${targetTotal}`);
  
  if (total !== targetTotal) {
    console.log(`🔄 Final balancing required...`);
    const fillResult = fillToTarget(curated, FALLBACK_SKILLS, targetTotal, 4);
    
    if (fillResult.error) {
      console.log(`❌ ${fillResult.error}`);
      return JSON.stringify(fillResult);
    }
    
    curated = balanceQuestions(fillResult, targetTotal);
  }

  // Step 9: Final validation and output
  const finalTotal = totalQuestions(curated);
  console.log(`🎉 Processing complete!`);
  console.log(`📊 Final result: ${curated.length} skills, ${finalTotal} total questions`);
  console.log(`📋 Final skill set:`, curated.map(item => `${item.domain} - ${item.skill} (${item.questions} questions)`));

  return JSON.stringify(curated, null, 2);
}
// -------------------- TEST SECTION --------------------

/**
 * Test data and execution
 * This section demonstrates the skill assessment system with sample data
 */
const testData = [
  {
    domain: "General Accounting",
    skill: "Account Receivables", 
    difficulty: "Complex",
    questions: 8
  },
  {
    domain: "General Accounting",
    skill: "Accounting Principles",
    difficulty: "Medium", 
    questions: 6
  },
  {
    domain: "Tech Proficiency",
    skill: "Excel Intermediate",
    difficulty: "Medium",
    questions: 5
  },
  {
    domain: "Tech Proficiency", 
    skill: "SAP S/4 HANA",
    difficulty: "Medium",
    questions: 5
  },
  {
    domain: "Aptitude",
    skill: "Business Math",
    difficulty: "Simple",
    questions: 6
  }
];

// Execute the test
console.log("🧪 Running test with sample data...");
const result = adjustAiResponse(JSON.stringify(testData), 57);
console.log("📄 Final JSON result:");
console.log(result);






