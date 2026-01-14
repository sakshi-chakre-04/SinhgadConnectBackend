const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { uploadToCloudinary, getFileType } = require('../services/cloudinaryService');

const router = express.Router();

// Multer configuration - store in memory for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 5 // Max 5 files per upload
    }
});

// ------------------------------
// @route   POST /api/upload
// @desc    Upload single file
// @access  Private
// ------------------------------
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const resourceType = req.file.mimetype.startsWith('image/') ? 'image' : 'raw';

        // For raw files, manually ensure uniqueness to preserve extension
        // unique_filename: true can sometimes mess up extensions for raw files
        const originalName = req.file.originalname;
        const uniqueName = resourceType === 'raw'
            ? `${Date.now()}_${originalName}`
            : originalName;

        const result = await uploadToCloudinary(req.file.buffer, {
            resource_type: resourceType,
            use_filename: true,
            unique_filename: resourceType === 'image', // Only let Cloudinary handle uniqueness for images
            filename_override: uniqueName
        });

        console.log('Upload success:', result.url); // Debug log

        res.json({
            success: true,
            attachment: {
                url: result.url,
                publicId: result.publicId,
                type: getFileType(req.file.mimetype),
                filename: req.file.originalname,
                size: result.bytes
            }
        });
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// ------------------------------
// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
// ------------------------------
router.post('/multiple', auth, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadPromises = req.files.map(async (file) => {
            const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';

            const result = await uploadToCloudinary(file.buffer, {
                resource_type: resourceType,
                use_filename: true,
                unique_filename: true,
                filename_override: file.originalname
            });
            return {
                url: result.url,
                publicId: result.publicId,
                type: getFileType(file.mimetype),
                filename: file.originalname,
                size: result.bytes
            };
        });

        const attachments = await Promise.all(uploadPromises);

        res.json({
            success: true,
            attachments
        });
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// Error handling for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Max 10MB allowed.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Max 5 files allowed.' });
        }
    }
    res.status(400).json({ message: error.message });
});

module.exports = router;
