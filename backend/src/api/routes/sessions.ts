import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { GameSession, Comment, ApiResponse } from '../../../shared/types';

const router = Router();

// GET /api/sessions - List all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const sessions = await db.all(`
      SELECT * FROM sessions 
      ORDER BY created_at DESC
    `);

    const response: ApiResponse<GameSession[]> = {
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        rinkLocation: {
          id: session.rink_location_id,
          name: session.rink_name,
          address: session.rink_address,
          livebarnId: session.rink_livebarn_id,
          timezone: session.rink_timezone,
        },
        gameDate: new Date(session.game_date),
        homeTeam: session.home_team,
        awayTeam: session.away_team,
        comments: [], // Will be loaded separately if needed
        status: session.status,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { rinkLocation, gameDate, homeTeam, awayTeam } = req.body;
    
    if (!rinkLocation || !gameDate || !homeTeam || !awayTeam) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    const db = await getDatabase();
    await db.run(`
      INSERT INTO sessions (
        id, rink_location_id, rink_name, rink_address, rink_livebarn_id, rink_timezone,
        game_date, home_team, away_team, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId,
      rinkLocation.id,
      rinkLocation.name,
      rinkLocation.address,
      rinkLocation.livebarnId,
      rinkLocation.timezone,
      gameDate,
      homeTeam,
      awayTeam,
      'active',
      now,
      now
    ]);

    const response: ApiResponse<GameSession> = {
      success: true,
      data: {
        id: sessionId,
        rinkLocation,
        gameDate: new Date(gameDate),
        homeTeam,
        awayTeam,
        comments: [],
        status: 'active',
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get comments for this session
    const comments = await db.all(`
      SELECT * FROM comments 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `, id);

    const response: ApiResponse<GameSession> = {
      success: true,
      data: {
        id: session.id,
        rinkLocation: {
          id: session.rink_location_id,
          name: session.rink_name,
          address: session.rink_address,
          livebarnId: session.rink_livebarn_id,
          timezone: session.rink_timezone,
        },
        gameDate: new Date(session.game_date),
        homeTeam: session.home_team,
        awayTeam: session.away_team,
        comments: comments.map(comment => ({
          id: comment.id,
          timestamp: comment.timestamp,
          text: comment.text,
          author: comment.author,
          gameTime: comment.game_time,
          position: comment.position_x && comment.position_y ? {
            x: comment.position_x,
            y: comment.position_y
          } : undefined,
          color: comment.color,
          createdAt: new Date(comment.created_at),
          updatedAt: new Date(comment.updated_at),
        })),
        status: session.status,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (updates.status) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id);
    
    await db.run(`
      UPDATE sessions 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    res.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session'
    });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    await db.run('DELETE FROM sessions WHERE id = ?', id);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
});

export { router as sessionRoutes }; 