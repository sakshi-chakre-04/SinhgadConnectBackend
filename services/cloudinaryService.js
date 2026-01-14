const { v2: cloudinary } = require('cloudinary');

// Cloudinary auto-configures from CLOUDINARY_URL env variable
// Or you can configure manually:
// cloudinary.config({ 
//     cloud_name: 'your_cloud_name', 
//     api_key: 'your_api_key', 
//     api_secret: 'your_api_secret'
// });

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with url, publicId, etc.
 */
async function uploadToCloudinary(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            resource_type: 'auto',
            folder: 'sinhgadconnect',
            ...options
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        resourceType: result.resource_type,
                        bytes: result.bytes,
                        width: result.width,
                        height: result.height
                    });
                }
            }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const Readable = require('stream').Readable;
        const stream = new Readable();
        stream.push(fileBuffer);
        stream.push(null);
        stream.pipe(uploadStream);
    });
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image', 'video', or 'raw'
 */
async function deleteFromCloudinary(publicId, resourceType = 'image') {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return true;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error.message);
        return false;
    }
}

/**
 * Get file type category from mimetype
 * @param {string} mimetype 
 * @returns {string} - 'image', 'pdf', or 'document'
 */
function getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype === 'application/pdf') return 'pdf';
    return 'document';
}

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getFileType,
    cloudinary
};
