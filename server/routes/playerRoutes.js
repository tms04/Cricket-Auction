const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

router.get('/', optionalAuth, playerController.getAllPlayers);
router.post('/markUnsold', authMiddleware, roleMiddleware(['auctioneer', 'master']), playerController.markUnsold);
router.post('/revertUnsoldCategory', authMiddleware, roleMiddleware(['auctioneer', 'master']), playerController.revertUnsoldCategoryToAvailable);
router.post('/revertUnsold1Category', authMiddleware, roleMiddleware(['auctioneer', 'master']), playerController.revertUnsold1CategoryToUnsold);
router.get('/duplicates/check', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.checkDuplicatePlayerName);
router.get('/summaries', optionalAuth, playerController.getPlayerSummaries);
router.get('/:id', optionalAuth, playerController.getPlayer);
router.post('/', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.createPlayer);
router.put('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.updatePlayer);
router.delete('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), playerController.deletePlayer);

module.exports = router; 