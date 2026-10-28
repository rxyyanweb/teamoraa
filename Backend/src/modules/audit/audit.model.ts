import { Schema, model } from 'mongoose';

// Application routes can append events and read them, never edit or delete them.
// Production MongoDB credentials must also deny update/delete on this collection.
const auditSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true, immutable: true },
    actorId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    action: { type: String, required: true, immutable: true },
    targetId: { type: String, required: true, immutable: true },
    entity: { type: String, default: 'account', immutable: true },
    before: { type: Schema.Types.Mixed, default: null, immutable: true },
    after: { type: Schema.Types.Mixed, default: null, immutable: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false },
);
auditSchema.pre(
  [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
  ],
  function () {
    throw new Error('Audit history is append-only');
  },
);
export const Audit = model('Audit', auditSchema);
