const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeam);
router.post('/', authMiddleware, roleMiddleware(['master', 'auctioneer']), teamController.createTeam);
router.put('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), teamController.updateTeam);
router.patch('/:id/budget', authMiddleware, roleMiddleware(['master', 'auctioneer']), teamController.updateTeamBudget);
router.delete('/:id', authMiddleware, roleMiddleware(['master', 'auctioneer']), teamController.deleteTeam);

module.exports = router;