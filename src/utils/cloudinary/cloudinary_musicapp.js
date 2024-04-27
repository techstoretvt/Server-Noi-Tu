const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    // allowedFormats: ['mp3'],
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
    params: {
        resource_type: 'auto',
        // format: async (req, file) => {
        //     console.log('file', file, file.mimetype);
        //     if (file.mimetype.includes('image')) {
        //         return 'webp';
        //     }
        // }, // định dạng file ảnh sau khi upload lên Cloudinary
        folder: 'music',
        // transformation: [
        //     {
        //         // filter ảnh
        //         width: 1000,
        //         height: 1000,
        //         crop: 'limit',
        //     },
        //     { effect: 'sharpen' },
        //     { quality: 'auto' },
        // ],
    },
});

const uploadCloud = multer({ storage });

module.exports = uploadCloud;
