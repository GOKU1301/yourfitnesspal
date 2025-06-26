import mongoose from 'mongoose';

const MenuImageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  image: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model('MenuImage', MenuImageSchema);
