import { generateEmbedding } from './foodMapping.js';

async function testEmbedding(text) {
  try {
    console.log('Testing embedding for:', text);
    const embedding = await generateEmbedding(text);
    console.log('Embedding:', embedding);
    if (!Array.isArray(embedding)) {
      console.error('FAIL: Embedding is not an array!');
    } else if (embedding.length === 0) {
      console.error('FAIL: Embedding is an empty array!');
    } else {
      console.log('PASS: Embedding is a non-empty array of length', embedding.length);
    }
  } catch (err) {
    console.error('ERROR during embedding generation:', err);
  }
}

(async () => {
  await testEmbedding('Papad');
  await testEmbedding('');
  await testEmbedding('Tinda Masala');
  await testEmbedding('Green Chutney');
  await testEmbedding('Random Nonexistent Food');
})();
