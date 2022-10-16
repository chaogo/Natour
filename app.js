const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes'); // sub-app for tours
const userRouter = require('./routes/userRoutes'); // sub-app for users
const reviewRouter = require('./routes/reviewRoutes'); //  sub-app for reviews
const bookingRouter = require('./routes/bookingRoutes'); //  sub-app for reviews
const viewRouter = require('./routes/viewRoutes'); //  sub-app for views

const app = express();

// use pug as template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // no need to think about slashes with path

// 1) GLOBAL MIDDLEWARE: apply for every route -> take such global middleware before any "route handler"(local middleware)
// Serving static file
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers: Helmet helps you secure your Express apps by setting various HTTP headers.
// app.use(helmet({ contentSecurityPolicy: false }));

// Development logging
if (process.env.NODE_ENV === 'development') {
  // always in one single process, so we can access NODE_ENV here
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  // only allow 'max' requests from one IP within 'windowMs' ms
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // middleware between reveiving req and sending res // everything is middleware in express
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization basically means to clean all the data that comes into the application from malicious code
// Data sanitization against NoSQL query injection. (if we login with { "email": { "$gt": "" }, "password": "pass1234"}: enter the query {"email": { "$gt" : ""}} in the mongo db and the first user that shows up will be selected. If the password that you send along with the request matches with the first user from the search then you'll be logged in.)
// mongoSanitize() looks at the request body, the request query string and also request.params to filter out all the dollar signs and ..., call the function "mongoSanitize()" which will return a middleware and then be used by app.use()
app.use(mongoSanitize());

// Data sanitization against XSS(cross-site scripting attacks): to clean any user input from malicious HTML code by converting it to ... . the mongo schema validation is already a good protection from this
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // whitelist some parameter

app.use(compression()); // only working for text responses

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  // console.log(x); // when there is an error inside any express middleware, express will automatically pass this error to the error handlling middleware. "globalErrorHandler"
  // console.log(req.headers);
  next();
});

// // create our own middleware
// app.use((req, res, next) => {
//   console.log('Hello from the middleware 🐶');
//   next();
// });

// 3) ROUTES -> also middleware (sub-app)
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter); // root/parent root -> mount
app.use('/api/v1/users', userRouter); // root/parent root
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // all verb for all url that not handled yet
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // whenever we pass an argument in the next(), express will assume that it is an error, and it will skip all other middleware in the middleware stack and send the error that we passed in to our global error handling middleware, which will then be executed
});

app.use(globalErrorHandler);
// the middleware applies only to this route
//res.send('Done'); res.status()... // always need to send something ONCE to END the req-res cycle

module.exports = app;
