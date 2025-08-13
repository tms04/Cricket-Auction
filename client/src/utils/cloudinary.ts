// Remove the cloudinary-core import since we're not using it
// import { Cloudinary } from 'cloudinary-core';

// Cloudinary configuration
export const cloudinaryConfig = {
    cloud_name: 'dviulhflk',
    api_key: '899555547873116',
    upload_preset: 'auction-system' // Create this preset in your Cloudinary dashboard
};

// Remove the cloudinary initialization since we're not using cloudinary-core
// export const cloudinary = new Cloudinary({
//     cloud_name: cloudinaryConfig.cloud_name,
//     secure: true
// });

// Upload image to Cloudinary
export const uploadImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.upload_preset);
        formData.append('cloud_name', cloudinaryConfig.cloud_name);

        fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/upload`, {
            method: 'POST',
            body: formData,
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error?.message || 'Upload failed');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.secure_url) {
                    resolve(data.secure_url);
                } else {
                    reject(new Error('Upload failed - no secure_url returned'));
                }
            })
            .catch(error => {
                console.error('Cloudinary upload error:', error);
                reject(error);
            });
    });
};

// Get optimized image URL
export const getOptimizedImageUrl = (url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
} = {}) => {
    if (!url || !url.includes('cloudinary.com')) {
        return url; // Return original URL if not from Cloudinary
    }

    const { width, height, quality = 'auto', format = 'auto' } = options;
    let optimizedUrl = url;

    // Add transformation parameters
    const transformations = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality !== 'auto') transformations.push(`q_${quality}`);
    if (format !== 'auto') transformations.push(`f_${format}`);

    if (transformations.length > 0) {
        // Insert transformations into the URL
        const urlParts = url.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1) {
            urlParts.splice(uploadIndex + 1, 0, transformations.join(','));
            optimizedUrl = urlParts.join('/');
        }
    }

    return optimizedUrl;
};
