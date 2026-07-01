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
    const safeName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
    return {
      folder: 'neoteric-site-qc',
      resource_type: isPdf ? 'raw' : 'image',
      ...(isPdf ? { public_id: `${safeName}.pdf` } : {}),
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp'],
      ...(isPdf ? {} : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
    }
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only images (JPG, PNG, WebP) and PDFs are allowed.'));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
