/**
 * Handles Cloudinary upload of processed video files
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND CONFIG
 * 2. UPLOAD FUNCTION: uploadToCloudinary(filePath, publicId)
 */

// ────────────────────────────────────────────────
// IMPORTS AND CONFIG
// ────────────────────────────────────────────────
import cloudinary from 'cloudinary';
import fs from 'fs';
import { logInfo, logProgress, logError } from './logger.js';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ────────────────────────────────────────────────
// UPLOAD FUNCTION
// ────────────────────────────────────────────────
export async function uploadToCloudinary(filePath, publicId) {
  logProgress('📤 Uploading video to Cloudinary...', { filePath, publicId });

  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      filePath,
      {
        resource_type: 'video',
        public_id: publicId,
        overwrite: true,
        folder: 'Caption-Factory-App-Videos',
      },
      (error, result) => {
        if (error) {
          logError('❌ Cloudinary upload failed', error);
          reject(error);
        } else {
          logInfo('✅ Uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
  });
}
