import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { ProcessingJob, ApiResponse } from '../../../shared/types';

const router = Router();

// POST /api/processing/jobs - Start processing job
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const jobId = uuidv4();
    const now = new Date().toISOString();
    
    const db = await getDatabase();
    await db.run(`
      INSERT INTO processing_jobs (
        id, session_id, status, progress, current_step, started_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      jobId,
      sessionId,
      'queued',
      0,
      'Queued for processing',
      now
    ]);

    const response: ApiResponse<ProcessingJob> = {
      success: true,
      data: {
        id: jobId,
        sessionId,
        status: 'queued',
        progress: 0,
        currentStep: 'Queued for processing',
        startedAt: new Date(now),
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating processing job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create processing job'
    });
  }
});

// GET /api/processing/jobs/:id - Get job status
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    const job = await db.get('SELECT * FROM processing_jobs WHERE id = ?', id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const response: ApiResponse<ProcessingJob> = {
      success: true,
      data: {
        id: job.id,
        sessionId: job.session_id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        error: job.error,
        startedAt: new Date(job.started_at),
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

// GET /api/processing/jobs - List all jobs
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const jobs = await db.all(`
      SELECT * FROM processing_jobs 
      ORDER BY started_at DESC
    `);

    const response: ApiResponse<ProcessingJob[]> = {
      success: true,
      data: jobs.map(job => ({
        id: job.id,
        sessionId: job.session_id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        error: job.error,
        startedAt: new Date(job.started_at),
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// DELETE /api/processing/jobs/:id - Cancel job
router.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    await db.run(`
      UPDATE processing_jobs 
      SET status = 'cancelled', completed_at = ? 
      WHERE id = ?
    `, [new Date().toISOString(), id]);
    
    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job'
    });
  }
});

export { router as processingRoutes }; 