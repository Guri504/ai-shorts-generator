import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env.js';

const generateVideo = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Asset Initializer] FFmpeg generation failed:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export async function initializeAssets() {
  console.log('[Asset Initializer] Checking prebuilt assets...');

  const ctaDir = env.paths.cta;
  const bgDir = env.paths.backgrounds;

  const ctaTemplates = [
    {
      name: 'cyberpunk.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='64+32*sin(X/120+T)':g='16*sin(Y/100-T)':b='128+64*cos((X+Y)/150+T)',drawbox=x=160:y=600:w=400:h=80:color=0x8B5CF6@0.9:t=fill,drawbox=x=160:y=600:w=400:h=80:color=white@1:t=3,drawtext=text='SUBSCRIBE':x=(w-text_w)/2:y=625:fontcolor=white:fontsize=32:font='sans',drawtext=text='CYBERPUNK SHORT':x=(w-text_w)/2:y=480:fontcolor=0x22D3EE:fontsize=40:font='sans',drawtext=text='Like & Share':x=(w-text_w)/2:y=740:fontcolor=0xA78BFA:fontsize=28:font='sans'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'dark_neon.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='128+64*sin(X/100+T)':g='8+8*cos(Y/150)':b='96+32*cos((X+Y)/200-T)',drawbox=x=160:y=600:w=400:h=80:color=0xEC4899@0.9:t=fill,drawbox=x=160:y=600:w=400:h=80:color=white@1:t=3,drawtext=text='SUBSCRIBE':x=(w-text_w)/2:y=625:fontcolor=white:fontsize=32:font='sans',drawtext=text='DARK NEON FACT':x=(w-text_w)/2:y=480:fontcolor=0xF472B6:fontsize=40:font='sans',drawtext=text='Stay Tuned for More!':x=(w-text_w)/2:y=740:fontcolor=0x2DD4BF:fontsize=28:font='sans'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'ai_futuristic.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='8+8*cos(X/100-T)':g='96+32*sin(Y/150+T)':b='128+64*sin((X+Y)/180+T)',drawbox=x=160:y=600:w=400:h=80:color=0x06B6D4@0.9:t=fill,drawbox=x=160:y=600:w=400:h=80:color=white@1:t=3,drawtext=text='SUBSCRIBE':x=(w-text_w)/2:y=625:fontcolor=white:fontsize=32:font='sans',drawtext=text='AI FUTURISTIC':x=(w-text_w)/2:y=480:fontcolor=0x22D3EE:fontsize=40:font='sans',drawtext=text='Follow For Daily Facts':x=(w-text_w)/2:y=740:fontcolor=0x34D399:fontsize=28:font='sans'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'horror_suspense.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='128+64*sin(X/80+T)':g='16*sin(Y/150)':b='8+8*cos((X-Y)/120-T)',drawbox=x=160:y=600:w=400:h=80:color=0x991B1B@0.9:t=fill,drawbox=x=160:y=600:w=400:h=80:color=white@1:t=3,drawtext=text='SUBSCRIBE':x=(w-text_w)/2:y=625:fontcolor=white:fontsize=32:font='sans',drawtext=text='HORROR SUSPENSE':x=(w-text_w)/2:y=480:fontcolor=0xEF4444:fontsize=40:font='sans',drawtext=text='Share If You Dare':x=(w-text_w)/2:y=740:fontcolor=0x9CA3AF:fontsize=28:font='sans'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'minimal_tech.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='32+16*cos(X/200-T/4)':g='32+16*cos(Y/200-T/4)':b='32+16*cos((X+Y)/200-T/4)',drawbox=x=160:y=600:w=400:h=80:color=0x1E293B@0.9:t=fill,drawbox=x=160:y=600:w=400:h=80:color=white@1:t=3,drawtext=text='SUBSCRIBE':x=(w-text_w)/2:y=625:fontcolor=white:fontsize=32:font='sans',drawtext=text='MINIMAL TECH':x=(w-text_w)/2:y=480:fontcolor=0xF1F5F9:fontsize=40:font='sans',drawtext=text='Hit The Bell Icon!':x=(w-text_w)/2:y=740:fontcolor=0x94A3B8:fontsize=28:font='sans'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    }
  ];

  const bgTemplates = [
    {
      name: 'bg_space.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='16+16*sin(X/100+T/2)':g='8+8*sin(Y/150-T/3)':b='64+32*cos((X+Y)/300+T/2)'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'bg_cyber.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='64+32*sin(X/120+T)':g='16*sin(Y/100-T)':b='128+64*cos((X+Y)/150+T)'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'bg_ambient.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='8+8*cos(X/200-T)':g='32+16*sin(Y/180+T/2)':b='64+16*sin((X-Y)/250-T)'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'bg_lava.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='128+64*sin(X/80+T)':g='32+16*sin(Y/100-T)':b='8+8*sin(X/120+Y/120)'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    },
    {
      name: 'bg_matrix.mp4',
      cmd: (outPath) => `ffmpeg -y -f lavfi -i "color=c=black:s=720x1280:d=5:r=25" -vf "geq=r='8*cos(X/100)':g='96+32*sin(Y/120+T/1.5)':b='16+16*sin((X+Y)/100-T)'" -c:v libx264 -pix_fmt yuv420p "${outPath}"`
    }
  ];

  // 1. Generate CTA Outros if missing
  for (const cta of ctaTemplates) {
    const filePath = path.join(ctaDir, cta.name);
    if (!fs.existsSync(filePath)) {
      console.log(`[Asset Initializer] Generating CTA Outro: ${cta.name}...`);
      try {
        await generateVideo(cta.cmd(filePath));
        console.log(`✅ Generated CTA Outro: ${cta.name}`);
      } catch (err) {
        console.error(`❌ Failed to generate CTA Outro: ${cta.name}. Fallback will be used.`);
      }
    }
  }

  // 2. Generate Cinematic Backgrounds if missing
  for (const bg of bgTemplates) {
    const filePath = path.join(bgDir, bg.name);
    if (!fs.existsSync(filePath)) {
      console.log(`[Asset Initializer] Generating Fallback Background: ${bg.name}...`);
      try {
        await generateVideo(bg.cmd(filePath));
        console.log(`✅ Generated Fallback Background: ${bg.name}`);
      } catch (err) {
        console.error(`❌ Failed to generate Fallback Background: ${bg.name}.`);
      }
    }
  }

  console.log('[Asset Initializer] Prebuilt assets initialization complete.');
}

export default initializeAssets;
