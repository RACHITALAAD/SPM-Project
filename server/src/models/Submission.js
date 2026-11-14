import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, required: true },
    submittedAt: { type: Date, required: true },
    cloudinaryPublicId: { type: String, default: '' },
    cloudinaryFormat: { type: String, default: '' },
  },
  { timestamps: true },
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Submission', submissionSchema);
