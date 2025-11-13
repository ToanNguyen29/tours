const express = require('express');
const authController = require('./../controllers/authController.js');
const reviewController = require('./../controllers/reviewController.js');

const router = express.Router({ mergeParams: true });
// Đây là router con
// Nếu có { mergeParams: true } trong router thì nó sẽ sử dụng được các req.params trong router cha

// POST /tour/adasf/reviews - thêm 1 review trong phiên đăng nhập vs adasf là id tour
// GET /tour/adasf/reviews - thêm 1 review trong phiên đăng nhập vs adasf là id tour

router
  // authController.protect,
  .route('/')
  .get(reviewController.getAllReview)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.setUserAndTour,
    reviewController.createReview
  );
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
