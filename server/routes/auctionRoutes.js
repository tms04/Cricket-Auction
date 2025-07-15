const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', auctionController.getAllAuctions);
router.get('/current', auctionController.getCurrentAuction);
router.get('/:id', auctionController.getAuction);
router.post('/', authMiddleware, roleMiddleware('auctioneer'), auctionController.createAuction);
router.post('/bid', (req, res, next) => {
    console.log('Bid route hit');
    next();
}, authMiddleware, roleMiddleware(['auctioneer', 'master']), auctionController.placeBid);
router.post('/complete', authMiddleware, roleMiddleware('auctioneer'), auctionController.completeAuction);
router.put('/:id', authMiddleware, roleMiddleware('auctioneer'), auctionController.updateAuction);
router.delete('/:id', authMiddleware, roleMiddleware('auctioneer'), auctionController.deleteAuction);
router.post('/reset/:tournamentId', authMiddleware, roleMiddleware(['auctioneer', 'master']), auctionController.resetAuctions);


module.exports = router;