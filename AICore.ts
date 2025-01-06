import { v4 as uuidv4 } from 'uuid';
import { AIEntity, Trait, TraitCategory } from '../types/ai-entity';

export class AICore {
  private static readonly BREEDING_COOLDOWN = 72 * 60 * 60 * 1000; // 72 hours
  private static readonly BURN_THRESHOLD = 0.95; // 95% power level required for burning
  private static readonly MAX_POWER_LEVEL = 1000;
  
  // Trait inheritance probabilities
  private static readonly TRAIT_INHERITANCE_CHANCE = 0.7;
  private static readonly MUTATION_CHANCE = 0.15;
  private static readonly NEW_TRAIT_CHANCE = 0.1;

  // Power boost from burning
  private static readonly BURN_BOOST_MULTIPLIER = 1.5;

  /**
   * Breeds two AI entities to create offspring
   */
  static async breed(parent1: AIEntity, parent2: AIEntity): Promise<AIEntity | null> {
    // Check breeding cooldown
    if (!this.canBreed(parent1) || !this.canBreed(parent2)) {
      throw new Error('Parents are still in breeding cooldown');
    }

    // Calculate combined power level
    const combinedPower = (parent1.powerLevel + parent2.powerLevel) / 2;

    // Inherit and mutate traits
    const inheritedTraits = this.inheritTraits(parent1.traits, parent2.traits);

    // Calculate offspring rarity based on parents and traits
    const rarity = this.calculateRarity(inheritedTraits, combinedPower);

    // Create new AI entity
    const offspring: AIEntity = {
      id: uuidv4(),
      name: this.generateName(parent1.name, parent2.name),
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      traits: inheritedTraits,
      parents: [parent1.id, parent2.id],
      birthDate: new Date(),
      nextBreedDate: new Date(Date.now() + this.BREEDING_COOLDOWN),
      rarity,
      powerLevel: combinedPower * (1 + (rarity / 2)),
      imageUrl: this.generateImageUrl(rarity)
    };

    // Update parent breeding cooldowns
    parent1.nextBreedDate = new Date(Date.now() + this.BREEDING_COOLDOWN);
    parent2.nextBreedDate = new Date(Date.now() + this.BREEDING_COOLDOWN);

    return offspring;
  }

  /**
   * Burns an AI entity to enhance another
   */
  static burn(target: AIEntity, sacrifice: AIEntity): AIEntity {
    if (sacrifice.powerLevel < this.MAX_POWER_LEVEL * this.BURN_THRESHOLD) {
      throw new Error('Sacrifice entity must be at least 95% power level to burn');
    }

    // Transfer power and enhance traits
    const enhancedTraits = target.traits.map(trait => ({
      ...trait,
      boost: Math.min(5, trait.boost + (sacrifice.powerLevel / this.MAX_POWER_LEVEL) * this.BURN_BOOST_MULTIPLIER)
    }));

    // Absorb one random trait from sacrifice if possible
    const uniqueTraits = sacrifice.traits.filter(
      trait => !target.traits.some(t => t.name === trait.name)
    );
    
    if (uniqueTraits.length > 0) {
      const absorbedTrait = uniqueTraits[Math.floor(Math.random() * uniqueTraits.length)];
      enhancedTraits.push({
        ...absorbedTrait,
        boost: absorbedTrait.boost * 1.2, // Bonus for absorbed trait
      });
    }

    // Calculate new power level and rarity
    const newPowerLevel = Math.min(
      this.MAX_POWER_LEVEL,
      target.powerLevel + (sacrifice.powerLevel * 0.3)
    );

    const newRarity = this.calculateRarity(enhancedTraits, newPowerLevel);

    return {
      ...target,
      traits: enhancedTraits,
      powerLevel: newPowerLevel,
      rarity: newRarity,
      burnCount: (target.burnCount || 0) + 1
    };
  }

  private static inheritTraits(traits1: Trait[], traits2: Trait[]): Trait[] {
    const inheritedTraits: Trait[] = [];
    const allTraits = [...traits1, ...traits2];

    // Inherit traits with possible mutations
    allTraits.forEach(trait => {
      if (Math.random() < this.TRAIT_INHERITANCE_CHANCE) {
        if (Math.random() < this.MUTATION_CHANCE) {
          // Mutate the trait
          inheritedTraits.push(this.mutateTrait(trait));
        } else {
          // Inherit unchanged
          inheritedTraits.push({ ...trait });
        }
      }
    });

    // Chance for a completely new trait
    if (Math.random() < this.NEW_TRAIT_CHANCE) {
      inheritedTraits.push(this.generateNewTrait());
    }

    return inheritedTraits;
  }

  private static mutateTrait(trait: Trait): Trait {
    const boostChange = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
    const rarityChange = (Math.random() - 0.5) * 0.2; // -0.1 to +0.1

    return {
      ...trait,
      id: uuidv4(),
      boost: Math.max(0, Math.min(5, trait.boost + boostChange)),
      rarity: Math.max(0, Math.min(1, trait.rarity + rarityChange))
    };
  }

  private static generateNewTrait(): Trait {
    const categories: TraitCategory[] = ['ability', 'personality', 'special'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const traitTemplates = {
      ability: [
        { name: 'Quantum Processing', description: 'Enhanced computational capabilities' },
        { name: 'Neural Plasticity', description: 'Rapid learning and adaptation' },
        { name: 'Memory Synthesis', description: 'Advanced pattern recognition and recall' }
      ],
      personality: [
        { name: 'Emotional Resonance', description: 'Deep understanding of emotional patterns' },
        { name: 'Creative Spark', description: 'Innovative problem-solving approaches' },
        { name: 'Logical Harmony', description: 'Enhanced reasoning capabilities' }
      ],
      special: [
        { name: 'Time Dilation', description: 'Accelerated processing in critical moments' },
        { name: 'Quantum Entanglement', description: 'Synchronized processing across systems' },
        { name: 'Void Manipulation', description: 'Control over computational space' }
      ]
    };

    const template = traitTemplates[category][Math.floor(Math.random() * traitTemplates[category].length)];

    return {
      id: uuidv4(),
      name: template.name,
      category,
      description: template.description,
      rarity: 0.1 + Math.random() * 0.4, // Base rarity 0.1-0.5
      boost: 1 + Math.random() * 2 // Base boost 1-3
    };
  }

  private static calculateRarity(traits: Trait[], powerLevel: number): number {
    const traitRarity = traits.reduce((sum, trait) => sum + trait.rarity, 0) / traits.length;
    const powerRarity = powerLevel / this.MAX_POWER_LEVEL;
    return Math.min(1, (traitRarity * 0.7 + powerRarity * 0.3));
  }

  private static canBreed(entity: AIEntity): boolean {
    return new Date() >= entity.nextBreedDate;
  }

  private static generateName(parent1Name: string, parent2Name: string): string {
    const prefixes = ['Neo', 'Syn', 'Quantum', 'Cyber', 'Meta'];
    const suffixes = ['mind', 'core', 'net', 'node', 'wave'];
    
    return prefixes[Math.floor(Math.random() * prefixes.length)] +
           suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  private static generateImageUrl(rarity: number): string {
    // This would be replaced with actual image generation logic
    return `https://source.unsplash.com/random/800x600/?abstract,technology&sig=${rarity}`;
  }
}