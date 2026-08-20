/**
 * Deck Salone Ranking Adapter (Unified v2)
 * ========================================
 * Re-exports the unified, production-active v2 ranking algorithm
 * from `rankingAlgorithm.ts` to ensure consistency and prevent
 * duplicate scoring discrepancies across route handlers.
 */

const rankingAlgorithm = require('./rankingAlgorithm');

module.exports = {
  ...rankingAlgorithm,
  // Explicit aliases for backward compatibility
  computeDjScore: rankingAlgorithm.computeDjScoreV2 || rankingAlgorithm.computeDjScore,
  recalculateAllRankings: rankingAlgorithm.recalculateAllRankingsV2 || rankingAlgorithm.recalculateAllRankings,
  updateAllDjRankings: rankingAlgorithm.updateAllDjRankings || rankingAlgorithm.recalculateAllRankingsV2,
  calculateBattleBaseScore: rankingAlgorithm.calculateBattleBaseScore,
  WEIGHTS: rankingAlgorithm.WEIGHTS_V2,
  WEIGHTS_V2: rankingAlgorithm.WEIGHTS_V2,
};

