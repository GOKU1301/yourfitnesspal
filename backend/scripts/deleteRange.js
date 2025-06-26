import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nutrition from '../models/Nutrition.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Get all documents sorted by _id (oldest to newest)
  const allDocs = await Nutrition.find().sort({ _id: 1 });

  // Get the docs from 66th to 101st (index 65 to 100)
  const docsToDelete = allDocs.slice(65, 91); // 101 is exclusive

  // Get their IDs
  const ids = docsToDelete.map(doc => doc._id);

  if (ids.length === 0) {
    console.log('No documents found in the specified range.');
  } else {
    // Delete them
    const result = await Nutrition.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${result.deletedCount} documents (IDs:`, ids, ')');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
