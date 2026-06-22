const path   = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf    = file.mimetype === 'application/pdf'
    const baseName = path.parse(file.originalname).name
    return {
      folder: 'neoteric-site-qc',
      resource_type: isPdf ? 'raw' : 'image',
      // Keep .pdf in the public_id so the CDN URL ends in .pdf
      // This lets browsers detect the type and download with correct extension
      ...(isPdf ? { public_id: `${baseName}.pdf` } : {}),
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp'],
      ...(isPdf ? {} : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
    }
  },
});

module.exports = multer({ storage });
