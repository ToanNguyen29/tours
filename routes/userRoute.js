const express = require('express');
const userController = require('../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.route('/signup').post(authController.signUp);
router.route('/login').post(authController.login);
router.get('/logout', authController.logout);

router.route('/forgotPass').post(authController.forgotPass);
router.route('/resetPassword/:token').patch(authController.resetPass);

router.use(authController.protect);

router.route('/me').patch(userController.getMe, userController.getUser);
router.route('/updateMe').patch(userController.updateMe);
router.route('/deleteMe').delete(userController.deleteMe);
router
  .route('/updatePassword')
  .patch(userController.upload.single('photo'), authController.updatePassword);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(
    userController.upload.single('photo'),
    (req, res, next) => {
      if (req.file) req.body.photo = req.file.filename;
      next();
    },
    userController.updateUser
  )
  .delete(userController.deleteUser);

module.exports = router;
