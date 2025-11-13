const appError = require('./../utils/appError');

const sendErrDevelopment = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrProduction = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.log('Error ', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new appError(message, 400);
};

const handleDuplicateFields = (err) => {
  const value = err.errmsg.match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, '');
  const message = `Duplicate field value: ${value}`;

  return new appError(message, 400);
};

const handleValidationErr = (err) => {
  const value = Object.value(err.errors).map((el) => el.message);
  const message = `Validation error: ${value.join('; ')}`;

  return new appError(message, 400);
};

const handleJWTError = () => {
  return new appError('Invalid token, please log in again!', 401);
};

const handleJWTExpiredError = () => {
  return new appError('Your token has expired! Please log in again.', 401);
};

module.exports = (err, req, res, next) => {
  err.status = err.status || 'error';
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    sendErrDevelopment(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };

    if (error.name === 'CastError') {
      // lỗi invalid id trong mongodb có tên là CastError vì _id có một format riêng
      error = handleCastErrorDB(error);
    }

    if (error.code === 11000) {
      // Lỗi duplicate field là những trường unique bị duplicate và lỗi có code là 11000
      error = handleDuplicateFields(error);
    }

    if (error.name === 'ValidationError') {
      // Lỗi validation data có name la Validation Error, validation đã được định nghĩa trong lúc tạo model
      error = handleValidationErr(error);
    }

    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrProduction(error, res);
  }
};
