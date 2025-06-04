import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadToCloudinary(filePath) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'captions-app'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
}
