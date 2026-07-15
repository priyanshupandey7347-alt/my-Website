const validator = require('validator');

const validateContactRequest = (req, res, next) => {
  const { name, email, message, honeypot } = req.body;

  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email || !message) {
    const error = new Error('Name, email, and message are required.');
    error.statusCode = 400;
    return next(error);
  }

  if (!validator.isEmail(email)) {
    const error = new Error('Invalid email address.');
    error.statusCode = 400;
    return next(error);
  }

  if (message.length > 5000) {
    const error = new Error('Message is too long.');
    error.statusCode = 400;
    return next(error);
  }

  next();
};

module.exports = { validateContactRequest };
