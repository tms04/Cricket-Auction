const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', playerController.getAllPlayers);
router.post('/markUnsold', authMiddleware, roleMiddleware(['auctioneer', 'master']), playerController.markUnsold);
router.get('/summaries', playerController.getPlayerSummaries);
router.get('/:id', playerController.getPlayer);
router.post('/', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.createPlayer);
router.put('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.updatePlayer);
router.delete('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.deletePlayer);
router.post('/markUnsold', authMiddleware, roleMiddleware(['auctioneer', 'master']), playerController.markUnsold);
router.get('/summaries', playerController.getPlayerSummaries);

module.exports = router; 