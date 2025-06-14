import dotenv from 'dotenv';
import { findStandardFoodName, initializeFoodMappings } from './utils/foodMapping.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Test cases - these will test both exact matches and semantic similarity
const testCases = [
  // Exact matches (should be in local mappings)
  { input: 'paneer', type: 'exact' },
  { input: 'roti', type: 'exact' },
  { input: 'dal', type: 'exact' },
  { input: 'idli', type: 'exact' },
  
  // Common variations (should match semantically)
  { input: 'paneer tikka', type: 'variation' },
  { input: 'butter roti', type: 'variation' },
  { input: 'yellow dal', type: 'variation' },
  { input: 'steamed idli', type: 'variation' },
  { input: 'pav bhaji', type: 'variation' },
  { input: 'anda bhurji', type: 'variation' },
  // Common misspellings
  { input: 'panir', type: 'misspelling' },
  { input: 'roty', type: 'misspelling' },
  { input: 'daal', type: 'misspelling' },
  { input: 'idly', type: 'misspelling' },
  
  // English names
  { input: 'indian cheese', type: 'english' },
  { input: 'flatbread', type: 'english' },
  { input: 'lentils', type: 'english' },
  { input: 'rice cake', type: 'english' }
];

// Helper function to get emoji for test type
function getTypeEmoji(type) {
  const emojis = {
    'exact': '🎯',
    'variation': '🔄',
    'misspelling': '✏️',
    'english': '🌐'
  };
  return emojis[type] || '❓';
}

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Starting semantic search tests...\n');
  
  try {
    // Skip initialization for now since we know the index exists
    console.log('🔍 Skipping initialization (using existing index)...');
    
    // Test each case with delay between requests
    const results = [];
    
    for (const [index, testCase] of testCases.entries()) {
      const testNum = index + 1;
      const testType = getTypeEmoji(testCase.type);
      console.log(`\n--- [${testNum}/${testCases.length}] ${testType} Testing: "${testCase.input}" ---`);
      
      let retryCount = 0;
      const maxRetries = 3;
      let testResult = { 
        input: testCase.input,
        type: testCase.type,
        status: 'pending',
        result: null,
        duration: 0,
        attempts: 0,
        error: null
      };
      
      while (retryCount < maxRetries) {
        testResult.attempts++;
        
        try {
          const startTime = Date.now();
          const result = await findStandardFoodName(testCase.input);
          const duration = Date.now() - startTime;
          
          testResult.status = 'success';
          testResult.result = result;
          testResult.duration = duration;
          
          console.log(`✅ Success: "${testCase.input}" → "${result}" (${duration}ms)`);
          
          // Add a delay between requests to avoid rate limiting (2000ms = 2 seconds)
          await delay(2000);
          break; // Success, exit retry loop
          
        } catch (error) {
          retryCount++;
          
          // If rate limited, wait longer before retrying
          if (error.message.includes('429') || error.message.includes('rate limit')) {
            const waitTime = error.retryAfter ? error.retryAfter * 1000 : 10000; // Default to 10 seconds
            console.log(`⚠️  Rate limited (attempt ${retryCount + 1}/${maxRetries}). Waiting ${waitTime/1000} seconds...`);
            await delay(waitTime);
            
            if (retryCount >= maxRetries - 1) {
              testResult.status = 'rate_limited';
              testResult.error = error.message;
              console.error(`❌ Max retries (${maxRetries}) reached for: "${testCase.input}"`);
            }
          } else {
            testResult.status = 'error';
            testResult.error = error.message;
            console.error(`❌ Error: ${error.message}`);
            break; // For non-rate-limit errors, don't retry
          }
        }
      }
      
      // Add the test result to our results array
      results.push(testResult);
    }
    
    // Print summary
    console.log('\n✨ Test Summary:');
    console.log('='.repeat(80));
    console.log('Input'.padEnd(30) + 'Status'.padEnd(15) + 'Result'.padEnd(30) + 'Time(ms)');
    console.log('-'.repeat(80));
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    // Ensure we have results to process
    if (!results || results.length === 0) {
      console.log('No test results to display.');
      return;
    }
    
    results.forEach(test => {
      let statusEmoji = '❓';
      let statusText = '';
      
      switch(test.status) {
        case 'success':
          statusEmoji = '✅';
          statusText = 'Success';
          successCount++;
          break;
        case 'rate_limited':
          statusEmoji = '⚠️';
          statusText = 'Rate Limited';
          rateLimitedCount++;
          break;
        case 'error':
          statusEmoji = '❌';
          statusText = 'Error';
          errorCount++;
          break;
      }
      
      const resultPreview = test.result ? 
        (test.result.length > 25 ? test.result.substring(0, 22) + '...' : test.result) : 
        (test.error ? 'Error' : 'N/A');
      
      console.log(
        `${statusEmoji} ${test.input.padEnd(28)}` +
        `${statusText.padEnd(15)}` +
        `${resultPreview.padEnd(30)}` +
        `${test.duration}ms`
      );
    });
    
    console.log('='.repeat(80));
    console.log(`\n✨ Test Results: ${successCount} ✅ | ${rateLimitedCount} ⚠️ | ${errorCount} ❌`);
    
    if (rateLimitedCount > 0) {
      console.log('\n⚠️  Some tests were rate limited. Consider running the tests again later.');
    }
    
    console.log('\n✨ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
runTests().catch(console.error);
