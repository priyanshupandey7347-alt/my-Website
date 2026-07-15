const nodemailer = require('nodemailer');
const Contact = require('../models/contact');
const { isMongoConnected } = require('../config/db');

const smtpConfigured = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const isPlaceholder = (value) => !value || /smtp\.example\.com|your-smtp-user|your-smtp-password|@example\.com/i.test(value);

  return [host, port, user, pass, to].every((value) => value && !isPlaceholder(value));
};

let testTransporter = null;
const getTransporter = async () => {
  if (smtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.verify();
      return transporter;
    } catch (verifyError) {
      console.warn('SMTP configuration provided but verification failed. Falling back to Ethereal test SMTP.');
      console.warn(verifyError.message);
    }
  }

  if (testTransporter) {
    return testTransporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  testTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.warn('Using Ethereal test SMTP account.');
  return testTransporter;
};

const sendContactEmail = async ({ name, email, company, message }) => {
  const transporter = await getTransporter();

  const mailOptions = {
    from: `Nullpoint Website <${process.env.SMTP_USER || 'test@example.com'}>`,
    to: process.env.CONTACT_TO_EMAIL || 'test@example.com',
    replyTo: email,
    subject: `New inquiry from ${name}${company ? ` (${company})` : ''}`,
    text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || '-'}\n\nMessage:\n${message}`,
    html: `<h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || '-'}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);

  if (!smtpConfigured()) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.warn('Preview URL:', previewUrl || 'not available');
  }

  return info;
};

const submitContact = async (req, res, next) => {
  try {
    const { name, email, company, message } = req.body;

    // Log DB connection status and attempt to save when connected
    const mongoUp = isMongoConnected();
    console.log('submitContact: mongo connected?', mongoUp);
    if (mongoUp) {
      try {
        const contact = new Contact({ name, email, company, message });
        const saved = await contact.save();
        console.log('submitContact: saved contact id=', saved._id);
      } catch (saveErr) {
        console.error('submitContact: error saving contact:', saveErr && saveErr.message ? saveErr.message : saveErr);
      }
    } else {
      console.warn('submitContact: skipping DB save because Mongo not connected');
    }

    await sendContactEmail({ name, email, company, message });

    res.status(200).json({ ok: true, message: 'Message sent successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitContact };
