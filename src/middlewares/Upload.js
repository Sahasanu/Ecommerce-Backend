import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinery.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'ecommerce_uploads', // Cloudinary folder name
      resource_type: 'image', // Or 'auto' for all types
      format: 'jpg', // Force jpg format
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  },
});

const upload = multer({ storage });

export default upload;
