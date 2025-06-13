import { addFoodMapping, loadLocalMappings } from './foodMapping.js';
import pkg from 'pinecone-client';
const { Pinecone } = pkg;
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Display the current food mappings
 */
function displayCurrentMappings() {
  const mappings = loadLocalMappings();
  console.log('\nCurrent Food Mappings:');
  console.log('=====================');
  
  if (Object.keys(mappings).length === 0) {
    console.log('No mappings found.');
  } else {
    Object.entries(mappings)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([local, standard]) => {
        console.log(`${local} → ${standard}`);
      });
  }
  console.log('=====================\n');
}

/**
 * Add a new food mapping
 */
async function addNewMapping() {
  return new Promise((resolve) => {
    rl.question('Enter local food name (e.g., "achar"): ', (localName) => {
      if (!localName.trim()) {
        console.log('Local name cannot be empty. Please try again.');
        return resolve(false);
      }
      
      rl.question('Enter standard food name (e.g., "pickle"): ', async (standardName) => {
        if (!standardName.trim()) {
          console.log('Standard name cannot be empty. Please try again.');
          return resolve(false);
        }
        
        try {
          await addFoodMapping(localName.trim(), standardName.trim());
          console.log(`\nSuccessfully added mapping: ${localName} → ${standardName}`);
          return resolve(true);
        } catch (error) {
          console.error('Error adding mapping:', error);
          return resolve(false);
        }
      });
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('=== YourFitnessPal Food Mapping Tool ===');
  console.log('This tool helps you add custom food mappings for better nutrition analysis.');
  console.log('For example, you can map "achar" to "pickle" so the nutrition API understands it.\n');
  
  displayCurrentMappings();
  
  let continueAdding = true;
  
  while (continueAdding) {
    await addNewMapping();
    
    await new Promise((resolve) => {
      rl.question('\nDo you want to add another mapping? (y/n): ', (answer) => {
        continueAdding = answer.toLowerCase() === 'y';
        resolve();
      });
    });
  }
  
  console.log('\nFinal mappings:');
  displayCurrentMappings();
  
  console.log('Thank you for using the Food Mapping Tool!');
  rl.close();
}

// Run the main function
main().catch(console.error);
