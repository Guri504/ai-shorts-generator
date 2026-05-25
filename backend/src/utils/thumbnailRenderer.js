import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * AI Thumbnail Renderer using Sharp
 */
export const thumbnailRenderer = {
  /**
   * Applies custom effects and composites text overlays onto a base image.
   * 
   * @param {string} inputPath - Path to the original base image (720x1280)
   * @param {string} outputPath - Path where the composite image should be written
   * @param {Object} options - Customizations: textOverlays, glow, blur, overlay
   */
  async render(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input image file not found at ${inputPath}`);
    }

    // Start processing image with Sharp
    let img = sharp(inputPath);

    // Read actual dimensions of the image dynamically (to support both 9:16 and 16:9 aspect ratios)
    const metadata = await img.metadata();
    const width = metadata.width || 720;
    const height = metadata.height || 1280;

    // Apply adjustments: Brightness, Saturation, Contrast, Sharpness
    if (options.adjustments) {
      const brightnessVal = options.adjustments.brightness !== undefined ? parseFloat(options.adjustments.brightness) : 1.0;
      const saturationVal = options.adjustments.saturation !== undefined ? parseFloat(options.adjustments.saturation) : 1.0;
      const contrastVal = options.adjustments.contrast !== undefined ? parseFloat(options.adjustments.contrast) : 1.0;
      const sharpnessVal = options.adjustments.sharpness !== undefined ? parseFloat(options.adjustments.sharpness) : 0;

      if (brightnessVal !== 1.0 || saturationVal !== 1.0) {
        img = img.modulate({
          brightness: brightnessVal,
          saturation: saturationVal
        });
      }

      if (contrastVal !== 1.0) {
        // Adjust contrast centered around mid-gray
        const intercept = 128 * (1 - contrastVal);
        img = img.linear(contrastVal, intercept);
      }

      if (sharpnessVal > 0) {
        img = img.sharpen({ sigma: parseFloat(sharpnessVal) });
      }
    }

    // 1. Apply blur to the background image if enabled
    if (options.blur && options.blur.enabled) {
      const radius = Math.min(Math.max(1, options.blur.radius || 5), 100);
      img = img.blur(radius);
    }

    // Prepare array of composite overlays
    const compositeLayers = [];

    // 2. Add glow effect overlay
    if (options.glow && options.glow.enabled) {
      const glowColor = options.glow.color || '#8b5cf6';
      const glowRadius = Math.min(Math.max(1, options.glow.radius || 15), 50);

      // SVG to generate a glowing inner border
      const glowSvg = `
        <svg width="${width}" height="${height}">
          <defs>
            <filter id="glowBlur">
              <feGaussianBlur stdDeviation="${glowRadius}" />
            </filter>
          </defs>
          <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${glowColor}" stroke-width="${glowRadius * 2.5}" filter="url(#glowBlur)" opacity="0.8" />
          <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${glowColor}" stroke-width="8" opacity="0.9" />
        </svg>
      `;

      compositeLayers.push({
        input: Buffer.from(glowSvg),
        top: 0,
        left: 0
      });
    }

    // 3. Add vignette or color filter overlay
    if (options.overlay && options.overlay.type && options.overlay.type !== 'none') {
      const type = options.overlay.type;
      const opacity = options.overlay.opacity !== undefined ? options.overlay.opacity : 0.5;

      let filterSvg = '';
      if (type === 'vignette') {
        filterSvg = `
          <svg width="${width}" height="${height}">
            <defs>
              <radialGradient id="vignetteGrad" cx="50%" cy="50%" r="70%">
                <stop offset="30%" stop-color="#000000" stop-opacity="0" />
                <stop offset="100%" stop-color="#000000" stop-opacity="${opacity}" />
              </radialGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#vignetteGrad)" />
          </svg>
        `;
      } else {
        let color = 'rgba(0,0,0,0)';
        if (type === 'warm') color = `rgba(245, 158, 11, ${opacity * 0.4})`; // Amber
        else if (type === 'cool') color = `rgba(59, 130, 246, ${opacity * 0.4})`; // Blue
        else if (type === 'neon-pink') color = `rgba(236, 72, 153, ${opacity * 0.4})`; // Pink
        else if (type === 'neon-cyan') color = `rgba(6, 182, 212, ${opacity * 0.4})`; // Cyan

        filterSvg = `
          <svg width="${width}" height="${height}">
            <rect width="${width}" height="${height}" fill="${color}" />
          </svg>
        `;
      }

      if (filterSvg) {
        compositeLayers.push({
          input: Buffer.from(filterSvg),
          top: 0,
          left: 0
        });
      }
    }

    // 4. Add Text Overlays
    if (options.textOverlays && options.textOverlays.length > 0) {
      const textLayersSvg = options.textOverlays.map((layer) => {
        const xPos = (layer.positionX / 100) * width;
        const yPos = (layer.positionY / 100) * height;
        const text = layer.text.toUpperCase(); // YouTuber style is usually uppercase
        const fontSize = layer.fontSize || 50;
        const fontColor = layer.fontColor || '#ffffff';
        const glowColor = layer.glowColor || '#000000';
        const glowRadius = layer.glowRadius || 8;

        // Escape SVG characters to prevent breakage
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        // Return SVG element tags for text. We create a background shadow stroke and a foreground fill
        return `
          <text 
            x="${xPos}" 
            y="${yPos}" 
            text-anchor="middle" 
            dominant-baseline="middle"
            font-family="Impact, 'Outfit', 'Inter', sans-serif" 
            font-weight="900" 
            font-size="${fontSize}px" 
            fill="${glowColor}" 
            stroke="${glowColor}" 
            stroke-width="${glowRadius * 2}"
            stroke-linejoin="round"
            opacity="0.9"
          >${escapedText}</text>
          <text 
            x="${xPos}" 
            y="${yPos}" 
            text-anchor="middle" 
            dominant-baseline="middle"
            font-family="Impact, 'Outfit', 'Inter', sans-serif" 
            font-weight="900" 
            font-size="${fontSize}px" 
            fill="${fontColor}"
            stroke="${glowColor}" 
            stroke-width="1.5"
            stroke-linejoin="round"
          >${escapedText}</text>
        `;
      }).join('\n');

      const textSvg = `
        <svg width="${width}" height="${height}">
          ${textLayersSvg}
        </svg>
      `;

      compositeLayers.push({
        input: Buffer.from(textSvg),
        top: 0,
        left: 0
      });
    }

    // Apply composite layers
    if (compositeLayers.length > 0) {
      img = img.composite(compositeLayers);
    }

    // Resize to guarantee 720x1280 output and write file
    await img
      .resize(width, height)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return outputPath;
  }
};

export default thumbnailRenderer;
