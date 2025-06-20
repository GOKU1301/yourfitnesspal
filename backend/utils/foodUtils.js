/**
 * Utility functions for food type detection and processing
 */

/**
 * Check if a food item is likely a liquid
 * @param {string} foodName - Name of the food item
 * @returns {boolean} - Whether the food is likely a liquid
 */
export function isLiquidFood(foodName) {
  if (!foodName || typeof foodName !== 'string') return false;
  
  const lowercaseName = foodName.toLowerCase().trim();
  
  // Common liquid foods
  const liquidFoods = [
    'milk', 'juice', 'water', 'soup', 'tea', 'coffee', 
    'shake', 'smoothie', 'lassi', 'curd', 'yogurt', 'yoghurt',
    'buttermilk', 'chai', 'beer', 'wine', 'alcohol', 'liquor', 'beverage',
    'drink', 'dal', 'sambar', 'rasam', 'curry'
  ];
  
  // Check if the food name contains any liquid food keywords
  return liquidFoods.some(liquid => 
    lowercaseName === liquid || 
    lowercaseName.includes(` ${liquid}`) || 
    lowercaseName.includes(`${liquid} `) ||
    lowercaseName.endsWith(` ${liquid}`)
  );
}

/**
 * Format a food portion object to ensure proper handling of liquids vs solids
 * @param {object} portion - Portion object to format
 * @param {string} foodName - Name of the food
 * @returns {object} - Formatted portion object
 */
export function formatFoodPortion(portion, foodName) {
  if (!portion) return null;
  
  const result = { ...portion };
  
  // For liquids: use volume_ml and appropriate container terms
  if (isLiquidFood(foodName)) {
    const volumeMap = {
      'small': 100,
      'medium': 200,
      'large': 300
    };
    
    const volume = volumeMap[portion.size] || 200;
    
    // Use "Cup" for curry and similar sabzis, "Glass" for drinks
    const lowercaseName = foodName.toLowerCase().trim();
    const usesCup = ['curry', 'sabzi', 'sabji', 'paneer', 'matar', 'dal', 'sambar', 'rasam', 'masala']
      .some(food => lowercaseName.includes(food));
    
    const containerTerm = usesCup ? 'Cup' : 'Glass';
    
    // Replace container terms appropriately
    if (result.portion_label) {
      result.portion_label = result.portion_label
        .replace(/Katori|katori|Bowl|bowl|Glass|glass/g, containerTerm)
        .replace(/\(\d+g\)/g, `(${volume}ml)`);
    } else {
      result.portion_label = `1 ${portion.size === 'medium' ? '' : portion.size + ' '}${containerTerm} (${volume}ml)`;
    }
    
    // Set correct measurements
    result.volume_ml = volume;
    result.weight_g = null;
  }
  
  return result;
}
