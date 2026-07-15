const express = require('express');
const Product = require('../models/product');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find({});
    res.json({ ok: true, products });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ ok: true, product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
    res.json({ ok: true, product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
    res.json({ ok: true, product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
