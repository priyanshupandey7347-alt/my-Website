const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const admins = await Admin.find({});
    res.json({ ok: true, admins });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const admin = new Admin(req.body);
    await admin.save();
    res.status(201).json({ ok: true, admin });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!admin) return res.status(404).json({ ok: false, error: 'Admin not found' });
    res.json({ ok: true, admin });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ ok: false, error: 'Admin not found' });
    res.json({ ok: true, admin });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
