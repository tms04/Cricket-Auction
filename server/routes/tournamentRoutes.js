const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournament);
router.post('/', authMiddleware, roleMiddleware('master'), tournamentController.createTournament);
router.put('/:id', authMiddleware, roleMiddleware('master'), tournamentController.updateTournament);
router.delete('/:id', authMiddleware, roleMiddleware('master'), tournamentController.deleteTournament);

module.exports = router; 