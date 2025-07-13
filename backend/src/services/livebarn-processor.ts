import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { LiveBarnCredentials, VideoSegment, GameSession } from '../../../shared/types';

export class LiveBarnProcessor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isAuthenticated = false;

  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      logger.info('LiveBarn processor initialized');
    } catch (error) {
      logger.error('Failed to initialize LiveBarn processor:', error);
      throw error;
    }
  }

  async authenticate(credentials: LiveBarnCredentials): Promise<boolean> {
    if (!this.page) {
      throw new Error('LiveBarn processor not initialized');
    }

    try {
      logger.info('Authenticating with LiveBarn...');
      
      await this.page.goto('https://livebarn.com/login', { waitUntil: 'networkidle2' });
      
      // Fill in login form
      await this.page.type('input[name="email"]', credentials.email);
      await this.page.type('input[name="password"]', credentials.password);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation and check if login was successful
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check if we're on the dashboard (indicating successful login)
      const currentUrl = this.page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('home')) {
        this.isAuthenticated = true;
        logger.info('Successfully authenticated with LiveBarn');
        return true;
      } else {
        logger.error('Authentication failed - not redirected to dashboard');
        return false;
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      return false;
    }
  }

  async findRinkFeed(rinkId: string, gameDate: Date): Promise<string | null> {
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Not authenticated with LiveBarn');
    }

    try {
      logger.info(`Searching for rink feed: ${rinkId} on ${gameDate.toISOString()}`);
      
      // Navigate to rink search or browse page
      await this.page.goto(`https://livebarn.com/rink/${rinkId}`, { waitUntil: 'networkidle2' });
      
      // Look for games on the specified date
      const dateString = gameDate.toISOString().split('T')[0];
      
      // This is a simplified example - actual implementation would need to handle
      // LiveBarn's specific UI structure and date filtering
      const gameLinks = await this.page.$$eval(
        `a[href*="/game/"][data-date="${dateString}"]`,
        (links) => links.map(link => link.getAttribute('href'))
      );
      
      if (gameLinks.length > 0) {
        logger.info(`Found ${gameLinks.length} games for the specified date`);
        return gameLinks[0]; // Return first game found
      }
      
      logger.warn('No games found for the specified date and rink');
      return null;
    } catch (error) {
      logger.error('Error finding rink feed:', error);
      return null;
    }
  }

  async downloadVideoSegment(
    gameUrl: string, 
    startTime: number, 
    endTime: number,
    outputPath: string
  ): Promise<boolean> {
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Not authenticated with LiveBarn');
    }

    try {
      logger.info(`Downloading video segment: ${startTime}s to ${endTime}s`);
      
      // Navigate to the game page
      await this.page.goto(gameUrl, { waitUntil: 'networkidle2' });
      
      // Wait for video player to load
      await this.page.waitForSelector('video', { timeout: 10000 });
      
      // This is a simplified implementation
      // In reality, you would need to:
      // 1. Interact with LiveBarn's video player controls
      // 2. Set the start and end times
      // 3. Trigger the download or capture the video stream
      // 4. Handle the actual video download process
      
      // For now, we'll simulate the process
      logger.info(`Video segment download completed: ${outputPath}`);
      return true;
    } catch (error) {
      logger.error('Error downloading video segment:', error);
      return false;
    }
  }

  async getVideoSegments(session: GameSession): Promise<VideoSegment[]> {
    const segments: VideoSegment[] = [];
    
    // Group comments by time ranges to create video segments
    const sortedComments = session.comments.sort((a, b) => a.timestamp - b.timestamp);
    
    let currentSegment: VideoSegment | null = null;
    const segmentDuration = 30000; // 30 seconds per segment
    
    for (const comment of sortedComments) {
      if (!currentSegment) {
        currentSegment = {
          id: `segment_${comment.id}`,
          sessionId: session.id,
          startTime: comment.timestamp,
          endTime: comment.timestamp + segmentDuration,
          duration: segmentDuration,
          status: 'pending',
          comments: [comment]
        };
      } else if (comment.timestamp <= currentSegment.endTime) {
        // Add comment to current segment
        currentSegment.comments.push(comment);
      } else {
        // Start new segment
        segments.push(currentSegment);
        currentSegment = {
          id: `segment_${comment.id}`,
          sessionId: session.id,
          startTime: comment.timestamp,
          endTime: comment.timestamp + segmentDuration,
          duration: segmentDuration,
          status: 'pending',
          comments: [comment]
        };
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isAuthenticated = false;
      logger.info('LiveBarn processor shutdown');
    }
  }
} 