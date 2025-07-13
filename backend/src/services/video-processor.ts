import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { VideoSegment, Comment, ProcessedVideo } from '../../../shared/types';

export class VideoProcessor {
  private outputDir: string;

  constructor() {
    this.outputDir = process.env.VIDEO_OUTPUT_DIR || './output';
  }

  async stitchVideos(segments: VideoSegment[], outputPath: string): Promise<boolean> {
    try {
      logger.info(`Stitching ${segments.length} video segments into final video`);
      
      const command = ffmpeg();
      
      // Add input files
      segments.forEach(segment => {
        if (segment.filePath) {
          command.input(segment.filePath);
        }
      });
      
      // Configure output
      command
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        .output(outputPath);
      
      return new Promise((resolve, reject) => {
        command
          .on('end', () => {
            logger.info('Video stitching completed successfully');
            resolve(true);
          })
          .on('error', (err) => {
            logger.error('Video stitching error:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in video stitching:', error);
      return false;
    }
  }

  async addCommentOverlays(
    videoPath: string, 
    segments: VideoSegment[], 
    outputPath: string
  ): Promise<boolean> {
    try {
      logger.info('Adding comment overlays to video');
      
      // Create subtitle file with comments
      const subtitlePath = await this.createSubtitleFile(segments);
      
      const command = ffmpeg(videoPath)
        .outputOptions([
          '-vf', `subtitles=${subtitlePath}:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,BackColour=&H80000000,Bold=1'`,
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-c:a copy'
        ])
        .output(outputPath);
      
      return new Promise((resolve, reject) => {
        command
          .on('end', () => {
            logger.info('Comment overlays added successfully');
            resolve(true);
          })
          .on('error', (err) => {
            logger.error('Error adding comment overlays:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in comment overlay processing:', error);
      return false;
    }
  }

  private async createSubtitleFile(segments: VideoSegment[]): Promise<string> {
    const subtitlePath = join(this.outputDir, 'comments.srt');
    let subtitleContent = '';
    let subtitleIndex = 1;
    
    for (const segment of segments) {
      for (const comment of segment.comments) {
        const startTime = this.formatSubtitleTime(comment.timestamp);
        const endTime = this.formatSubtitleTime(comment.timestamp + 5000); // Show for 5 seconds
        
        subtitleContent += `${subtitleIndex}\n`;
        subtitleContent += `${startTime} --> ${endTime}\n`;
        subtitleContent += `${comment.text}\n\n`;
        
        subtitleIndex++;
      }
    }
    
    writeFileSync(subtitlePath, subtitleContent);
    return subtitlePath;
  }

  private formatSubtitleTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  async createCommentGraphics(comments: Comment[]): Promise<string[]> {
    const graphicPaths: string[] = [];
    
    for (const comment of comments) {
      const canvas = createCanvas(800, 200);
      const ctx = canvas.getContext('2d');
      
      // Set background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, 800, 200);
      
      // Set text style
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      
      // Draw comment text
      const lines = this.wrapText(ctx, comment.text, 780);
      let y = 40;
      for (const line of lines) {
        ctx.fillText(line, 20, y);
        y += 30;
      }
      
      // Draw timestamp
      ctx.font = '16px Arial';
      ctx.fillStyle = '#cccccc';
      const timestamp = this.formatTimestamp(comment.timestamp);
      ctx.fillText(timestamp, 20, 180);
      
      // Save graphic
      const graphicPath = join(this.outputDir, `comment_${comment.id}.png`);
      const buffer = canvas.toBuffer('image/png');
      writeFileSync(graphicPath, buffer);
      graphicPaths.push(graphicPath);
    }
    
    return graphicPaths;
  }

  private wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    lines.push(currentLine);
    return lines;
  }

  private formatTimestamp(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    resolution: string;
    fileSize: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown';
        const fileSize = metadata.format.size || 0;
        
        resolve({
          duration,
          resolution,
          fileSize
        });
      });
    });
  }
} 