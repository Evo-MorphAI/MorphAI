import { NestVitality, VitalityForecast } from '../types/nest-vitality';

export class NestVitalitySystem {
  private static readonly VITALITY_CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
  private static readonly DEFAULT_MAX_VITALITY = 100;
  private static readonly CRITICAL_VITALITY_THRESHOLD = 20;
  private static readonly MIGRATION_THRESHOLD = 5;

  static calculateVitality(
    marketCap: number,
    threshold: number,
    lastCheckpoint: number,
    currentVitality: number,
    decayRate: number
  ): NestVitality {
    const now = Date.now();
    const hoursSinceLastCheck = (now - lastCheckpoint) / (60 * 60 * 1000);
    
    let newVitality = currentVitality;

    // If market cap is below threshold, decay vitality
    if (marketCap < threshold) {
      newVitality -= decayRate * hoursSinceLastCheck;
    } else {
      // Slow recovery when above threshold
      newVitality += (decayRate * 0.5) * hoursSinceLastCheck;
    }

    // Clamp vitality between 0 and max
    newVitality = Math.max(0, Math.min(this.DEFAULT_MAX_VITALITY, newVitality));

    return {
      currentVitality: newVitality,
      maxVitality: this.DEFAULT_MAX_VITALITY,
      lastCheckpoint: now,
      marketCapThreshold: threshold,
      decayRate
    };
  }

  static getForecast(vitality: NestVitality, marketCap: number): VitalityForecast {
    const hoursRemaining = marketCap < vitality.marketCapThreshold
      ? vitality.currentVitality / vitality.decayRate
      : Number.POSITIVE_INFINITY;

    return {
      hoursRemaining,
      isFlourishing: vitality.currentVitality > this.CRITICAL_VITALITY_THRESHOLD,
      migrationImminent: vitality.currentVitality <= this.MIGRATION_THRESHOLD
    };
  }

  static shouldMigrate(vitality: NestVitality): boolean {
    return vitality.currentVitality <= this.MIGRATION_THRESHOLD;
  }
}