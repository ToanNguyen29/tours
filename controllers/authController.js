const appError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sendEmail = require('./../utils/email');

const createToken = (id) => {
  return (token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  }));
};

const createSendToken = (statusCode, user, res) => {
  const token = createToken(user._id);

  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true // chỉ cho phép truy cập cookie thông qua HTTP và không cho phép truy cập thông qua JavaScript. Điều này giảm nguy cơ bị tấn công XSS (Cross-Site Scripting)
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOption.secure = true; //  cookie chỉ được gửi qua kênh an toàn (https)
  }

  res.cookie('jwt', token, cookieOption);

  const date =
    user.DateChangePass && parseInt(user.DateChangePass.getTime() / 1000, 10);

  res.status(statusCode).json({
    status: 'success',
    token,
    date,
    data: {
      data: user
    }
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createSendToken(201, newUser, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. check if email and password exist
  if (!email || !password) {
    return next(new appError('Please provide email and password', 400));
  }

  // 2. check if user exist and password is correct
  const user = await User.findOne({ email }).select('+password'); // do password có select: false nên ta sẽ dùng .select('+password') tại đây để select password

  if (!user || !(await user.checkPass(password, user.password))) {
    return next(new appError('Invalid email or password', 401));
  }

  // 3. If everything is ok, send token to client
  createSendToken(201, user, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1. Getting token and check of it's there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new appError('You are not logged in! Please log in to get access', 401)
    );
  }

  // 2. Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new appError(
        'The user belonging to this  token does no longer exist',
        401
      )
    );
  }

  // 4. Check if user changed password after the token was issued
  console.log('decoded iat', decoded.iat);
  if (currentUser.checkChangePassword(decoded.iat)) {
    return next(
      new appError('User recently changed password! Please log in again', 401)
    );
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  // ...roles (rest parameter) như là argument trong fucntion thường
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new appError('no permission', 403));
    }
    next();
  };
};

exports.forgotPass = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new appError('There is no user with email address', 404));
  }

  // 2. Generate the random reset token
  const resetToken = user.createPassResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you did not forget password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new appError('There was an error sending the email. Try again later', 500)
    );
  }
});

exports.resetPass = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2. If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new appError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.save();

  // 3. Update changedPasswordAt property for the user
  // 4. Log the user in, send JWT
  createSendToken(201, user, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  // 2. Check if POSTed current password is correct
  if (
    !user ||
    !(await user.checkPass(req.body.passwordCurrent, user.password))
  ) {
    return next(new appError('Your current password is not correct', 401));
  }

  // 3. If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  try {
    await sendEmail({
      email: user.email,
      subject: 'Successfully changed password',
      message: 'Your password has been changed'
    });
  } catch (error) {
    console.log(error);
  }
  // 4. Log user in, send JWT
  createSendToken(200, user, res);
});
