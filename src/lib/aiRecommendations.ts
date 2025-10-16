/**
 * AI-Powered Smart Recommendations Engine
 * Analyzes site data and provides actionable design suggestions
 */

import { SiteContext } from './dataFusion';

export interface Recommendation {
  category: 'solar' | 'orientation' | 'sustainability' | 'site-planning' | 'zoning' | 'cost';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action?: string;
}

/**
 * Generate smart recommendations based on site analysis
 */
export function generateRecommendations(
  siteContext: SiteContext,
  solarData?: any,
  elevationData?: any
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Solar optimization recommendations
  if (solarData) {
    if (solarData.avgAzimuth) {
      const optimalAzimuth = siteContext.location.lat > 0 ? 180 : 0; // South in NH, North in SH
      const deviation = Math.abs(solarData.avgAzimuth - optimalAzimuth);
      
      if (deviation > 15) {
        recommendations.push({
          category: 'solar',
          priority: 'high',
          title: 'Building Orientation Adjustment',
          description: `Current orientation deviates ${deviation.toFixed(0)}° from optimal solar angle`,
          impact: `Rotating to ${optimalAzimuth}° could increase solar gain by up to ${(deviation / 2).toFixed(0)}%`,
          action: `Rotate building ${deviation > 180 ? 'counter-clockwise' : 'clockwise'} by ${Math.min(deviation, 360 - deviation).toFixed(0)}°`
        });
      }
    }

    if (solarData.shadingPercentage > 30) {
      recommendations.push({
        category: 'solar',
        priority: 'critical',
        title: 'Excessive Site Shading Detected',
        description: `${solarData.shadingPercentage.toFixed(0)}% of site experiences significant shading`,
        impact: 'High shading reduces solar potential and passive heating opportunities',
        action: 'Consider selective tree removal or relocating building footprint to sunnier area'
      });
    }
  }

  // Climate-based recommendations
  if (siteContext.weather.coolingDegreeDays > 1000) {
    recommendations.push({
      category: 'sustainability',
      priority: 'high',
      title: 'Passive Cooling Strategies Recommended',
      description: `High cooling demand (${siteContext.weather.coolingDegreeDays} CDD)`,
      impact: 'Passive strategies can reduce cooling energy by 30-50%',
      action: 'Incorporate natural ventilation, thermal mass, and shading devices'
    });
  }

  if (siteContext.weather.heatingDegreeDays > 2000) {
    recommendations.push({
      category: 'sustainability',
      priority: 'high',
      title: 'Maximize Solar Heat Gain',
      description: `High heating demand (${siteContext.weather.heatingDegreeDays} HDD)`,
      impact: 'Optimized glazing can reduce heating costs by 20-40%',
      action: 'Maximize south-facing glazing, minimize north-facing windows, add thermal mass'
    });
  }

  // Site planning recommendations
  if (siteContext.osm.transit.length > 0) {
    const nearestTransit = siteContext.osm.transit[0];
    recommendations.push({
      category: 'site-planning',
      priority: 'medium',
      title: 'Transit-Oriented Development Opportunity',
      description: `${nearestTransit.name} is ${nearestTransit.distance.toFixed(0)}m away`,
      impact: 'Proximity to transit increases property value and reduces parking needs',
      action: 'Consider reduced parking ratios and pedestrian-friendly design'
    });
  }

  // Amenity access
  const walkableAmenities = siteContext.osm.amenities.filter(a => a.distance < 800);
  if (walkableAmenities.length > 5) {
    recommendations.push({
      category: 'site-planning',
      priority: 'medium',
      title: 'High Walkability Score',
      description: `${walkableAmenities.length} amenities within 800m walking distance`,
      impact: 'Excellent walkability increases livability and reduces car dependency',
      action: 'Emphasize pedestrian connections and street-facing design'
    });
  }

  // Terrain recommendations
  if (elevationData?.slope > 15) {
    recommendations.push({
      category: 'site-planning',
      priority: 'high',
      title: 'Steep Slope Considerations',
      description: `Site slope exceeds 15% (${elevationData.slope.toFixed(1)}%)`,
      impact: 'Steep slopes increase construction costs by 30-50%',
      action: 'Consider split-level design, reduced excavation, or stepped terraces'
    });
  }

  // Density and context
  if (siteContext.osm.buildings > 20) {
    recommendations.push({
      category: 'site-planning',
      priority: 'medium',
      title: 'Urban Infill Context',
      description: `${siteContext.osm.buildings} buildings in surrounding area`,
      impact: 'Dense context requires contextual design and privacy considerations',
      action: 'Match street wall height, provide adequate setbacks, consider noise mitigation'
    });
  } else if (siteContext.osm.buildings < 5) {
    recommendations.push({
      category: 'site-planning',
      priority: 'low',
      title: 'Low-Density Rural Setting',
      description: 'Sparse surrounding development',
      impact: 'Greater design freedom but potential infrastructure challenges',
      action: 'Verify utility availability, consider off-grid systems, emphasize site integration'
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Format recommendations for AI chat context
 */
export function formatRecommendationsForAI(recommendations: Recommendation[]): string {
  if (recommendations.length === 0) return 'No specific recommendations at this time.';

  return recommendations
    .map((rec, i) => {
      return `${i + 1}. **${rec.title}** (${rec.priority} priority)
   - ${rec.description}
   - Impact: ${rec.impact}
   ${rec.action ? `- Action: ${rec.action}` : ''}`;
    })
    .join('\n\n');
}
