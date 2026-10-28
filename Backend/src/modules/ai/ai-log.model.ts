import { Schema, model } from 'mongoose';

const aiLogSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    requestCategory: {
      type: String,
      enum: ['chat', 'summary', 'smart-leave', 'policy'],
      required: true,
    },
    promptSnippet: { type: String, required: true },
    toolsUsed: { type: [String], default: [] },
    latencyMs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['success', 'error', 'rate_limited', 'refused'],
      default: 'success',
    },
    errorMessage: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const AiLog = model('AiLog', aiLogSchema);
export type AiLogDocument = InstanceType<typeof AiLog>;
