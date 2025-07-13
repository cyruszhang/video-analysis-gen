import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { LiveBarnProcessor } from './livebarn-processor';
import { VideoProcessor } from './video-processor';
import { GameSession, ProcessingJob, JobStatus, VideoSegment } from '../../../shared/types';

export class JobQueue extends EventEmitter {
  private queue: ProcessingJob[] = [];
  private isProcessing = false;
  private liveBarnProcessor: LiveBarnProcessor;
  private videoProcessor: VideoProcessor;

  constructor(liveBarnProcessor: LiveBarnProcessor, videoProcessor: VideoProcessor) {
    super();
    this.liveBarnProcessor = liveBarnProcessor;
    this.videoProcessor = videoProcessor;
  }

  async addJob(session: GameSession): Promise<string> {
    const job: ProcessingJob = {
      id: `job_${session.id}`,
      sessionId: session.id,
      status: 'queued',
      progress: 0,
      currentStep: 'Queued for processing',
      startedAt: new Date(),
    };

    this.queue.push(job);
    logger.info(`Job added to queue: ${job.id}`);
    
    this.emit('jobAdded', job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextJob();
    }
    
    return job.id;
  }

  private async processNextJob(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift()!;
    
    try {
      await this.processJob(job);
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('jobFailed', job);
    } finally {
      this.isProcessing = false;
      // Process next job if available
      if (this.queue.length > 0) {
        this.processNextJob();
      }
    }
  }

  private async processJob(job: ProcessingJob): Promise<void> {
    logger.info(`Starting to process job: ${job.id}`);
    
    // Update job status
    job.status = 'running';
    this.emit('jobStarted', job);

    // Step 1: Initialize LiveBarn processor
    job.currentStep = 'Initializing LiveBarn connection';
    job.progress = 10;
    this.emit('jobProgress', job);
    
    await this.liveBarnProcessor.initialize();
    
    // Step 2: Authenticate with LiveBarn
    job.currentStep = 'Authenticating with LiveBarn';
    job.progress = 20;
    this.emit('jobProgress', job);
    
    // In a real implementation, you would get credentials from secure storage
    const credentials = {
      email: process.env.LIVEBARN_EMAIL || '',
      password: process.env.LIVEBARN_PASSWORD || '',
    };
    
    const authenticated = await this.liveBarnProcessor.authenticate(credentials);
    if (!authenticated) {
      throw new Error('Failed to authenticate with LiveBarn');
    }

    // Step 3: Get session data (in real app, this would come from database)
    job.currentStep = 'Loading session data';
    job.progress = 30;
    this.emit('jobProgress', job);
    
    // For now, we'll use a mock session - in real app this would be fetched from database
    const session: GameSession = {
      id: job.sessionId,
      rinkLocation: {
        id: '1',
        name: 'Ice Palace Arena',
        address: '123 Hockey Way, Toronto, ON',
        livebarnId: 'ice_palace_toronto',
        timezone: 'America/Toronto',
      },
      gameDate: new Date(),
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      comments: [],
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Step 4: Generate video segments from comments
    job.currentStep = 'Generating video segments';
    job.progress = 40;
    this.emit('jobProgress', job);
    
    const segments = await this.liveBarnProcessor.getVideoSegments(session);

    // Step 5: Find rink feed
    job.currentStep = 'Locating rink feed';
    job.progress = 50;
    this.emit('jobProgress', job);
    
    const gameUrl = await this.liveBarnProcessor.findRinkFeed(
      session.rinkLocation.livebarnId,
      session.gameDate
    );
    
    if (!gameUrl) {
      throw new Error('Could not find rink feed for the specified date');
    }

    // Step 6: Download video segments
    job.currentStep = 'Downloading video segments';
    job.progress = 60;
    this.emit('jobProgress', job);
    
    const downloadPromises = segments.map(async (segment, index) => {
      const outputPath = `./temp/segment_${segment.id}.mp4`;
      const success = await this.liveBarnProcessor.downloadVideoSegment(
        gameUrl,
        segment.startTime / 1000, // Convert to seconds
        segment.endTime / 1000,
        outputPath
      );
      
      if (success) {
        segment.filePath = outputPath;
        segment.status = 'downloaded';
      } else {
        segment.status = 'failed';
        throw new Error(`Failed to download segment ${segment.id}`);
      }
      
      // Update progress
      const segmentProgress = 60 + (index / segments.length) * 20;
      job.progress = Math.floor(segmentProgress);
      this.emit('jobProgress', job);
    });
    
    await Promise.all(downloadPromises);

    // Step 7: Stitch videos together
    job.currentStep = 'Stitching video segments';
    job.progress = 80;
    this.emit('jobProgress', job);
    
    const stitchedVideoPath = `./output/session_${session.id}_stitched.mp4`;
    const stitched = await this.videoProcessor.stitchVideos(segments, stitchedVideoPath);
    
    if (!stitched) {
      throw new Error('Failed to stitch video segments');
    }

    // Step 8: Add comment overlays
    job.currentStep = 'Adding comment overlays';
    job.progress = 90;
    this.emit('jobProgress', job);
    
    const finalVideoPath = `./output/session_${session.id}_final.mp4`;
    const overlaysAdded = await this.videoProcessor.addCommentOverlays(
      stitchedVideoPath,
      segments,
      finalVideoPath
    );
    
    if (!overlaysAdded) {
      throw new Error('Failed to add comment overlays');
    }

    // Step 9: Complete job
    job.currentStep = 'Processing completed';
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    
    logger.info(`Job completed successfully: ${job.id}`);
    this.emit('jobCompleted', job);
  }

  getJobStatus(jobId: string): ProcessingJob | null {
    return this.queue.find(job => job.id === jobId) || null;
  }

  getAllJobs(): ProcessingJob[] {
    return [...this.queue];
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down job queue');
    this.isProcessing = false;
    this.queue = [];
    await this.liveBarnProcessor.shutdown();
  }
} 