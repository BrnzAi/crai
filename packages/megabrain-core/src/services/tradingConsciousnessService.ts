/**
 * Trading Consciousness Service
 * Trading-specific analysis, pattern discovery, and strategy optimization
 */

import { ProviderManager } from '../providers';
import { generateId } from '../utils';
import type {
  Trade,
  TradeAnalysis,
  TradingPattern,
  TradingPatternType,
  TradingInsight,
  RiskAssessment,
  WipeoutRiskResult,
  WipeoutScenario,
  Portfolio,
  Strategy,
  StrategyOptimization,
} from '../types';

export interface TradingConsciousnessConfig {
  riskThreshold?: number;
  patternMinOccurrences?: number;
  monteCarloSimulations?: number;
}

export class TradingConsciousnessService {
  private providerManager: ProviderManager;
  private config: TradingConsciousnessConfig;
  private discoveredPatterns: TradingPattern[] = [];
  private insights: TradingInsight[] = [];

  constructor(providerManager: ProviderManager, config?: TradingConsciousnessConfig) {
    this.providerManager = providerManager;
    this.config = {
      riskThreshold: config?.riskThreshold || 0.7,
      patternMinOccurrences: config?.patternMinOccurrences || 3,
      monteCarloSimulations: config?.monteCarloSimulations || 1000,
    };
  }

  /**
   * Analyze trading data
   */
  async analyzeTrades(trades: Trade[]): Promise<TradeAnalysis> {
    if (trades.length === 0) {
      return this.emptyAnalysis();
    }

    // Calculate basic metrics
    const winners = trades.filter(t => (t.pnl || 0) > 0);
    const losers = trades.filter(t => (t.pnl || 0) < 0);

    const totalWins = winners.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0));

    const winRate = trades.length > 0 ? winners.length / trades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const averageWin = winners.length > 0 ? totalWins / winners.length : 0;
    const averageLoss = losers.length > 0 ? totalLosses / losers.length : 0;
    const largestWin = Math.max(0, ...winners.map(t => t.pnl || 0));
    const largestLoss = Math.abs(Math.min(0, ...losers.map(t => t.pnl || 0)));

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of trades) {
      cumulative += trade.pnl || 0;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / (peak || 1);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Discover patterns
    const patterns = await this.discoverTradingPatterns(trades);

    // Generate insights
    const insights = await this.generateTradingInsights(trades, {
      winRate,
      profitFactor,
      maxDrawdown,
    });

    return {
      totalTrades: trades.length,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      maxDrawdown,
      patterns,
      insights,
    };
  }

  /**
   * Discover trading patterns
   */
  async discoverTradingPatterns(trades: Trade[]): Promise<TradingPattern[]> {
    if (trades.length < 10) {
      return [];
    }

    const prompt = `Analyze these trading records for patterns:

${JSON.stringify(trades.slice(-50), null, 2)}

Identify:
1. Time-based patterns (day of week, time of day)
2. Symbol patterns (which assets perform best)
3. Size patterns (optimal position sizing)
4. Momentum vs mean reversion tendencies
5. Win/loss streaks

Return JSON:
{
  "patterns": [
    {
      "name": "pattern name",
      "type": "momentum|mean_reversion|volatility|correlation|seasonality|behavioral",
      "description": "detailed description",
      "frequency": 0.3,
      "profitability": 0.15,
      "confidence": 0.8,
      "examples": ["specific example"]
    }
  ]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 }
    );

    let patterns: TradingPattern[] = [];

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        patterns = result.patterns.map((p: Omit<TradingPattern, 'id'>) => ({
          ...p,
          id: generateId(),
        }));
      }
    } catch {
      // No patterns found
    }

    this.discoveredPatterns.push(...patterns);
    return patterns;
  }

  /**
   * Generate trading insights
   */
  async generateTradingInsights(
    trades: Trade[],
    metrics: { winRate: number; profitFactor: number; maxDrawdown: number }
  ): Promise<TradingInsight[]> {
    const prompt = `Generate actionable trading insights based on:

Win Rate: ${(metrics.winRate * 100).toFixed(1)}%
Profit Factor: ${metrics.profitFactor.toFixed(2)}
Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%

Recent trades: ${trades.length}

Provide insights for improvement. Return JSON:
{
  "insights": [
    {
      "category": "category name",
      "insight": "the insight",
      "importance": 0.8,
      "actionable": true,
      "suggestedAction": "what to do"
    }
  ]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    let insights: TradingInsight[] = [];

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        insights = result.insights.map((i: Omit<TradingInsight, 'id'>) => ({
          ...i,
          id: generateId(),
        }));
      }
    } catch {
      // No insights generated
    }

    this.insights.push(...insights);
    return insights;
  }

  /**
   * Assess trading risk
   */
  async assessTradingRisk(portfolio: Portfolio): Promise<RiskAssessment> {
    // Calculate position concentration
    const totalExposure = portfolio.positions.reduce((sum, p) => sum + Math.abs(p.weight), 0);
    const maxWeight = Math.max(0, ...portfolio.positions.map(p => Math.abs(p.weight)));
    const positionConcentration = maxWeight;

    // Calculate leverage
    const leverageExposure = portfolio.leverage;

    // Calculate correlation risk (simplified)
    const correlationRisk = portfolio.positions.length < 3 ? 0.8 :
                           portfolio.positions.length < 6 ? 0.5 : 0.3;

    // Estimate wipeout probability
    const wipeoutResult = await this.simulateWipeoutRisk(portfolio);

    // Calculate overall risk
    const overallRisk = Math.min(1, (
      positionConcentration * 0.3 +
      leverageExposure * 0.3 +
      correlationRisk * 0.2 +
      wipeoutResult.probability * 0.2
    ));

    // Generate recommendations
    const recommendations: string[] = [];

    if (positionConcentration > 0.3) {
      recommendations.push('Reduce position concentration - no single position should exceed 30%');
    }
    if (leverageExposure > 2) {
      recommendations.push('Consider reducing leverage to limit downside risk');
    }
    if (portfolio.positions.length < 5) {
      recommendations.push('Increase diversification with more uncorrelated positions');
    }
    if (wipeoutResult.probability > 0.1) {
      recommendations.push('High wipeout risk detected - implement stop losses');
    }

    return {
      overallRisk,
      maxDrawdownExpected: Math.min(0.5, overallRisk * 0.8),
      positionConcentration,
      leverageExposure,
      correlationRisk,
      wipeoutProbability: wipeoutResult.probability,
      recommendations,
    };
  }

  /**
   * Simulate wipeout risk using Monte Carlo
   */
  async simulateWipeoutRisk(portfolio: Portfolio): Promise<WipeoutRiskResult> {
    const simulations = this.config.monteCarloSimulations || 1000;
    const wipeoutThreshold = 0.95; // 95% loss = wipeout
    let wipeoutCount = 0;

    // Simple Monte Carlo simulation
    for (let i = 0; i < simulations; i++) {
      let portfolioValue = portfolio.totalValue;
      const days = 252; // Trading days in a year

      for (let day = 0; day < days; day++) {
        // Simulate daily return (assuming normal distribution)
        const dailyReturn = this.normalRandom() * 0.02 * portfolio.leverage;
        portfolioValue *= (1 + dailyReturn);

        if (portfolioValue < portfolio.totalValue * (1 - wipeoutThreshold)) {
          wipeoutCount++;
          break;
        }
      }
    }

    const probability = wipeoutCount / simulations;

    const scenarios: WipeoutScenario[] = [
      {
        description: 'Black swan event (3+ sigma move)',
        probability: probability * 0.3,
        severity: 0.9,
        mitigations: ['Implement hard stop losses', 'Use options for tail hedging'],
      },
      {
        description: 'Prolonged drawdown',
        probability: probability * 0.5,
        severity: 0.7,
        mitigations: ['Set maximum drawdown limits', 'Reduce position size during drawdowns'],
      },
      {
        description: 'Leverage cascade',
        probability: probability * 0.2,
        severity: 0.85,
        mitigations: ['Limit maximum leverage', 'Use margin buffers'],
      },
    ];

    const recommendations: string[] = [];
    if (probability > 0.1) {
      recommendations.push('Reduce overall risk exposure');
      recommendations.push('Implement strict position sizing rules');
      recommendations.push('Consider portfolio insurance strategies');
    }

    return {
      probability,
      scenarios,
      recommendations,
      confidenceInterval: {
        low: Math.max(0, probability - 0.05),
        high: Math.min(1, probability + 0.05),
      },
    };
  }

  /**
   * Optimize trading strategy
   */
  async optimizeTradingStrategy(strategy: Strategy): Promise<StrategyOptimization> {
    const prompt = `Analyze and suggest optimizations for this trading strategy:

Strategy: ${strategy.name}
Type: ${strategy.type}
Current Parameters: ${JSON.stringify(strategy.parameters, null, 2)}

Performance:
- Total Return: ${(strategy.performance.totalReturn * 100).toFixed(1)}%
- Sharpe Ratio: ${strategy.performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(strategy.performance.maxDrawdown * 100).toFixed(1)}%
- Win Rate: ${(strategy.performance.winRate * 100).toFixed(1)}%
- Profit Factor: ${strategy.performance.profitFactor.toFixed(2)}

Suggest parameter adjustments. Return JSON:
{
  "suggestedParameters": {
    "parameter1": "new value"
  },
  "expectedImprovement": 0.15,
  "risks": ["risk 1", "risk 2"]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 }
    );

    let result = {
      suggestedParameters: {} as Record<string, unknown>,
      expectedImprovement: 0,
      risks: [] as string[],
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use default
    }

    return {
      currentParameters: strategy.parameters,
      suggestedParameters: result.suggestedParameters,
      expectedImprovement: result.expectedImprovement,
      risks: result.risks,
    };
  }

  /**
   * Get discovered patterns
   */
  getPatterns(): TradingPattern[] {
    return [...this.discoveredPatterns];
  }

  /**
   * Get insights
   */
  getInsights(): TradingInsight[] {
    return [...this.insights];
  }

  /**
   * Clear patterns and insights
   */
  reset(): void {
    this.discoveredPatterns = [];
    this.insights = [];
  }

  /**
   * Helper: Generate normal random number (Box-Muller transform)
   */
  private normalRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Helper: Empty analysis for when there are no trades
   */
  private emptyAnalysis(): TradeAnalysis {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      maxDrawdown: 0,
      patterns: [],
      insights: [],
    };
  }
}

export default TradingConsciousnessService;
