/**
 * Smart name matching utility for cricket players
 * Handles abbreviated names like "V Kohli" vs "Virat Kohli"
 */

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Extract last name from a player name
function getLastName(name) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

// Extract first name or initials
function getFirstPart(name) {
  const parts = name.trim().split(/\s+/);
  return parts[0].toLowerCase();
}

/**
 * Calculate similarity score between query and player name
 * Returns a score from 0 (no match) to 100 (perfect match)
 */
export function calculateNameSimilarity(query, playerName) {
  const queryLower = query.toLowerCase().trim();
  const playerLower = playerName.toLowerCase().trim();

  // Perfect match
  if (queryLower === playerLower) return 100;

  // Exact substring match
  if (playerLower.includes(queryLower) || queryLower.includes(playerLower)) {
    return 95;
  }

  const queryLastName = getLastName(query);
  const playerLastName = getLastName(playerName);
  const queryFirstPart = getFirstPart(query);
  const playerFirstPart = getFirstPart(playerName);

  let score = 0;

  // Last name exact match is very strong indicator
  if (queryLastName === playerLastName) {
    score += 70;

    // Check first name/initial match
    if (queryFirstPart === playerFirstPart) {
      score += 30; // Perfect match with abbreviated first name
    } else if (playerFirstPart.length <= 2) {
      // Player name has initials (like "V" in "V Kohli")
      // Check if query starts with this initial
      if (queryFirstPart.startsWith(playerFirstPart[0])) {
        score += 25; // "virat" starts with "v"
      }
    } else if (queryFirstPart.length <= 2) {
      // Query has initials
      if (playerFirstPart.startsWith(queryFirstPart[0])) {
        score += 25;
      }
    } else {
      // Both are full names, use fuzzy matching
      const firstNameDistance = levenshteinDistance(queryFirstPart, playerFirstPart);
      const similarity = Math.max(0, 1 - firstNameDistance / Math.max(queryFirstPart.length, playerFirstPart.length));
      score += similarity * 25;
    }
  } else {
    // Last names don't match exactly, use fuzzy matching
    const lastNameDistance = levenshteinDistance(queryLastName, playerLastName);
    const maxLength = Math.max(queryLastName.length, playerLastName.length);
    const lastNameSimilarity = Math.max(0, 1 - lastNameDistance / maxLength);

    if (lastNameSimilarity > 0.7) {
      score += lastNameSimilarity * 60;

      // Check first name
      const firstNameDistance = levenshteinDistance(queryFirstPart, playerFirstPart);
      const firstNameSimilarity = Math.max(0, 1 - firstNameDistance / Math.max(queryFirstPart.length, playerFirstPart.length));
      score += firstNameSimilarity * 30;
    }
  }

  // Bonus for word-level matches
  const queryWords = query.toLowerCase().split(/\s+/);
  const playerWords = playerName.toLowerCase().split(/\s+/);

  for (const qWord of queryWords) {
    if (qWord.length > 2) {
      for (const pWord of playerWords) {
        if (pWord.includes(qWord) || qWord.includes(pWord)) {
          score += 5;
        }
      }
    }
  }

  return Math.min(100, Math.round(score));
}

/**
 * Find best matching player from a list
 * @param {string} query - User's input (e.g., "Virat Kohli")
 * @param {string[]} players - List of player names from database
 * @param {number} threshold - Minimum score to consider (default 60)
 * @returns {Object|null} - {player: string, score: number} or null
 */
export function findBestPlayerMatch(query, players, threshold = 60) {
  if (!query || !players || players.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const player of players) {
    const score = calculateNameSimilarity(query, player);

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = player;
    }
  }

  if (bestMatch) {
    return {
      player: bestMatch,
      score: bestScore
    };
  }

  return null;
}

/**
 * Find top N matching players
 * @param {string} query - User's input
 * @param {string[]} players - List of player names
 * @param {number} limit - Number of suggestions to return
 * @param {number} threshold - Minimum score to consider
 * @returns {Array} - Array of {player: string, score: number}
 */
export function findPlayerSuggestions(query, players, limit = 5, threshold = 40) {
  if (!query || !players || players.length === 0) return [];

  const matches = players
    .map(player => ({
      player,
      score: calculateNameSimilarity(query, player)
    }))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches;
}

/**
 * Common cricket player name mappings
 * Maps full names to common abbreviations
 */
export const commonNameMappings = {
  'virat kohli': ['v kohli', 'vk'],
  'rohit sharma': ['rg sharma', 'r sharma'],
  'ms dhoni': ['ms dhoni', 'm dhoni'],
  'sachin tendulkar': ['sr tendulkar', 's tendulkar'],
  'ab de villiers': ['ab de villiers', 'ab devilliers'],
  'jasprit bumrah': ['jj bumrah', 'j bumrah'],
  'ravindra jadeja': ['ra jadeja', 'r jadeja'],
  'hardik pandya': ['hh pandya', 'h pandya'],
  'kl rahul': ['kl rahul', 'k rahul'],
  'suryakumar yadav': ['sa yadav', 's yadav'],
};

/**
 * Check if query matches any common name mapping
 */
export function checkCommonNameMapping(query, players) {
  const queryLower = query.toLowerCase().trim();

  // Check if query is a known full name
  if (commonNameMappings[queryLower]) {
    const possibleAbbreviations = commonNameMappings[queryLower];

    for (const abbrev of possibleAbbreviations) {
      const match = players.find(p => p.toLowerCase() === abbrev);
      if (match) return match;
    }
  }

  return null;
}
