import { Router } from 'express';
import { LiveBarnProcessor } from '../../services/livebarn-processor';
import { logger } from '../../utils/logger';
import { ApiResponse, RinkLocation } from '../../../../shared/types';

const router = Router();
const livebarnProcessor = new LiveBarnProcessor();

// Initialize LiveBarn processor on startup
let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    try {
      await livebarnProcessor.initialize();
      isInitialized = true;
      logger.info('LiveBarn processor initialized for rinks API');
    } catch (error) {
      logger.error('Failed to initialize LiveBarn processor:', error);
      throw error;
    }
  }
}

// GET /api/rinks - Get all available rinks
router.get('/', async (req, res) => {
  try {
    await ensureInitialized();
    
    // For now, return mock rinks since we need LiveBarn credentials to authenticate
    // In a real implementation, you would:
    // 1. Get LiveBarn credentials from environment or database
    // 2. Authenticate with LiveBarn
    // 3. Fetch actual rinks from LiveBarn
    
    const mockRinks: RinkLocation[] = [
      {
        id: '1',
        name: 'Ice Palace Arena',
        address: '123 Hockey Way, Toronto, ON',
        livebarnId: 'ice_palace_toronto',
        timezone: 'America/Toronto',
      },
      {
        id: '2',
        name: 'Frozen Pond Center',
        address: '456 Skate Street, Toronto, ON',
        livebarnId: 'frozen_pond_toronto',
        timezone: 'America/Toronto',
      },
      {
        id: '3',
        name: 'Maple Leaf Gardens',
        address: '789 Stanley Street, Toronto, ON',
        livebarnId: 'maple_leaf_gardens',
        timezone: 'America/Toronto',
      },
      {
        id: '4',
        name: 'Scotiabank Arena',
        address: '40 Bay Street, Toronto, ON',
        livebarnId: 'scotiabank_arena',
        timezone: 'America/Toronto',
      },
      {
        id: '5',
        name: 'Ricoh Coliseum',
        address: '100 Princes\' Boulevard, Toronto, ON',
        livebarnId: 'ricoh_coliseum',
        timezone: 'America/Toronto',
      },
      {
        id: '6',
        name: 'Coca-Cola Coliseum',
        address: '100 Princes\' Boulevard, Toronto, ON',
        livebarnId: 'coca_cola_coliseum',
        timezone: 'America/Toronto',
      },
      {
        id: '7',
        name: 'Varsity Arena',
        address: '299 Bloor Street West, Toronto, ON',
        livebarnId: 'varsity_arena',
        timezone: 'America/Toronto',
      },
      {
        id: '8',
        name: 'Mattamy Athletic Centre',
        address: '50 Carlton Street, Toronto, ON',
        livebarnId: 'mattamy_athletic_centre',
        timezone: 'America/Toronto',
      },
    ];

    const response: ApiResponse<RinkLocation[]> = {
      success: true,
      data: mockRinks,
      message: `Found ${mockRinks.length} available rinks`
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching rinks:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch rinks',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(response);
  }
});

// POST /api/rinks/refresh - Refresh rinks from LiveBarn (requires authentication)
router.post('/refresh', async (req, res) => {
  try {
    await ensureInitialized();
    
    // This endpoint would require LiveBarn credentials
    // For now, return an error indicating credentials are needed
    const response: ApiResponse<null> = {
      success: false,
      error: 'LiveBarn credentials required',
      message: 'To fetch real rinks from LiveBarn, please configure credentials in the environment'
    };
    
    res.status(400).json(response);
  } catch (error) {
    logger.error('Error refreshing rinks:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to refresh rinks',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(response);
  }
});

export default router; 