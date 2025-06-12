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

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // e.g. 'de3ip4mlt'
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ────────────────────────────────────────────────
// UPLOAD FUNCTION
// ────────────────────────────────────────────────
export async function uploadToCloudinary(filePath, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      filePath,
      {
        resource_type: 'video',
        public_id: publicId,
        overwrite: true,
        folder: 'captions-app',
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
  });
}
