import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_FILE_SIZE = 300 * 1024; // 300KB threshold
const MAX_DIMENSION = 1200; // Max width/height in pixels
const JPEG_QUALITY = 70;
const IMAGE_DIRS = [
    'public/images',
];
// Files to skip (logos, icons that need transparency or specific format)
const SKIP_FILES = [
    'logo.png',
    'logo.jpg',
    'favicon',
];

function getFileSizeKB(filePath) {
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
}

function findImages(dir, images = []) {
    if (!fs.existsSync(dir)) return images;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            findImages(fullPath, images);
        } else if (/\.(jpg|jpeg|png)$/i.test(item)) {
            images.push(fullPath);
        }
    }
    return images;
}

async function optimizeImage(filePath) {
    const filename = path.basename(filePath);
    
    // Skip files in exclusion list
    if (SKIP_FILES.some(skip => filename.toLowerCase().includes(skip.toLowerCase()))) {
        return null;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const sizeBefore = getFileSizeKB(filePath);
    
    if (sizeBefore <= MAX_FILE_SIZE / 1024) {
        return null; // Already optimized
    }
    
    try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        
        // Determine if resize is needed
        const needsResize = metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;
        
        let pipeline = sharp(filePath);
        
        if (needsResize) {
            pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // For PNGs, convert to JPEG if over threshold (unless has transparency)
        const isPng = ext === '.png';
        const hasAlpha = metadata.hasAlpha;
        const shouldConvertToJpeg = isPng && !hasAlpha;
        
        let outputPath = filePath;
        
        if (shouldConvertToJpeg) {
            outputPath = filePath.replace(/\.png$/i, '.jpg');
            await pipeline
                .jpeg({ quality: JPEG_QUALITY })
                .toFile(outputPath + '.tmp');
            
            // Remove original PNG and rename temp file
            fs.unlinkSync(filePath);
            fs.renameSync(outputPath + '.tmp', outputPath);
        } else if (ext === '.jpg' || ext === '.jpeg') {
            await pipeline
                .jpeg({ quality: JPEG_QUALITY })
                .toFile(filePath + '.tmp');
            
            fs.unlinkSync(filePath);
            fs.renameSync(filePath + '.tmp', filePath);
        } else {
            // PNG with transparency - just resize
            await pipeline
                .png({ compressionLevel: 9 })
                .toFile(filePath + '.tmp');
            
            fs.unlinkSync(filePath);
            fs.renameSync(filePath + '.tmp', filePath);
            outputPath = filePath;
        }
        
        const sizeAfter = getFileSizeKB(outputPath);
        return { 
            path: path.basename(outputPath), 
            before: sizeBefore, 
            after: sizeAfter,
            converted: shouldConvertToJpeg
        };
    } catch (error) {
        console.error(`  Error optimizing ${filePath}:`, error.message);
        return null;
    }
}

async function optimizeAllImages() {
    console.log('Checking images for optimization...');
    
    const rootDir = path.resolve(__dirname, '..');
    let optimized = [];
    
    for (const imageDir of IMAGE_DIRS) {
        const fullDir = path.join(rootDir, imageDir);
        const images = findImages(fullDir);
        
        for (const img of images) {
            const result = await optimizeImage(img);
            if (result) {
                optimized.push(result);
            }
        }
    }
    
    if (optimized.length === 0) {
        console.log('All images are already optimized.');
    } else {
        console.log(`Optimized ${optimized.length} image(s):`);
        for (const img of optimized) {
            const status = img.converted ? ' (converted to JPG)' : '';
            console.log(`  ${img.path}: ${img.before}KB → ${img.after}KB${status}`);
        }
    }
    
    return optimized;
}

// Run if called directly
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
    optimizeAllImages();
}

export { optimizeAllImages };
