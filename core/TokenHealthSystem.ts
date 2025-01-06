import { TokenHealth, TokenLifeExpectancy } from '../types/token-health';

export class TokenHealthSystem {
  private static readonly HEALTH_CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  private static readonly DEFAULT_MAX_HEALTH = 100;
  private static readonly CRITICAL_HEALTH_THRESHOLD = 20;
  private static readonly BURN_THRESHOLD = 5;

  static calculateHealth(
    marketCap: number,
    threshold: number,
    lastCheckpoint: number,
    currentHealth: number,
    decayRate: number
  ): TokenHealth {
    const now = Date.now();
    const hoursSinceLastCheck = (now - lastCheckpoint) / (60 * 60 * 1000);
    
    let newHealth = currentHealth;

    // If market cap is below threshold, decay health
    if (marketCap < threshold) {
      newHealth -= decayRate * hoursSinceLastCheck;
    } else {
      // Slow recovery when above threshold
      newHealth += (decayRate * 0.5) * hoursSinceLastCheck;
    }

    // Clamp health between 0 and max
    newHealth = Math.max(0, Math.min(this.DEFAULT_MAX_HEALTH, newHealth));

    return {
      currentHealth: newHealth,
      maxHealth: this.DEFAULT_MAX_HEALTH,
      lastCheckpoint: now,
      marketCapThreshold: threshold,
      decayRate
    };
  }

  static getLifeExpectancy(health: TokenHealth, marketCap: number): TokenLifeExpectancy {
    const hoursRemaining = marketCap < health.marketCapThreshold
      ? health.currentHealth / health.decayRate
      : Number.POSITIVE_INFINITY;

    return {
      hoursRemaining,
      isHealthy: health.currentHealth > this.CRITICAL_HEALTH_THRESHOLD,
      burnImminent: health.currentHealth <= this.BURN_THRESHOLD
    };
  }

  static shouldBurn(health: TokenHealth): boolean {
    return health.currentHealth <= this.BURN_THRESHOLD;
  }
}