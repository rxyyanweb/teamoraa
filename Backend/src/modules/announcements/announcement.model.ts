import { Schema, model } from 'mongoose';

const announcementSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ['admin', 'hr'], required: true },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

announcementSchema.index({ companyId: 1, pinned: -1, createdAt: -1 });

export const Announcement = model('Announcement', announcementSchema);
export type AnnouncementDocument = InstanceType<typeof Announcement>;
