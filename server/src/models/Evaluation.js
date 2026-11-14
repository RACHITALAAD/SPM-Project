import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
    },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    marks: { type: Number, required: true, min: 0 },
    feedback: { type: String, required: true, trim: true },
    evaluatedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model('Evaluation', evaluationSchema);
