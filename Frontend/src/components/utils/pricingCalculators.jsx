import { calculateItemMetricsForQuantity, identifyPriceTier } from '@/components/costCalculator/PricingService';

// יצוא הפונקציות המשותפות כדי לשמור על תאימות לאחור
export { calculateItemMetricsForQuantity, identifyPriceTier };

// Export the component as default (even though it doesn't render anything)
export default function PricingCalculators() {
  return null; // This component doesn't render anything
}