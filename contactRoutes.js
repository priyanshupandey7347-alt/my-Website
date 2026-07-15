const express = require('express');
const { submitContact } = require('../controllers/contactController');
const { validateContactRequest } = require('../middleware/validateRequest');

const router = express.Router();

router.post('/contact', validateContactRequest, submitContact);

module.exports = router;
