const express = require('express');
const morgan = require('morgan');
const ratelimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRoute = require(`./routes/tourRoute`);
const userRoute = require(`./routes/userRoute`);
const reviewRoute = require('./routes/reviewRoute');
const appError = require('./utils/appError');
const errGlobalHandler = require('./controllers/errorController');

const app = express();

// 1) Middleware
// Security http header
app.use(helmet());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // Nó sẽ xóa các ký tự như $

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    Whilelist: []
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from same API
const limiter = ratelimit({
  max: 100,
  widowMS: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again after 1 hour'
});
app.use('/api', limiter);

// Body parser, reading data from the body request (req.body)
app.use(express.json({ limit: '10kb' })); // chuyển đổi req.body thành dạng đối tượng javascript

// Serving static files
app.use(express.static(`${__dirname}/public`));

app.use(cookieParser());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTE
app.use('/api/v1/tours', tourRoute);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/reviews', reviewRoute);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `can't find ${req.originalUrl} in the server`
  // });

  // const err = new Error(`Can't find ${req.originalUrl} in the server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new appError(`Can't find ${req.originalUrl} in the server`, 404));
});

app.use(errGlobalHandler);

module.exports = app;
