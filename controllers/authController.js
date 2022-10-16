const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    // store the jwt with cookie
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // the cookie cannot be accessed or modified in any way by the browser. what the browser do is basically receiving the cookied and then send it automatically along with every request
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // use https in the production mode

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;
  user.loginConsecutiveAttempts = undefined; // remove loginConsecutiveAttempts from output

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  }); // req.body // create the _id field at the same time for newUser

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // ES6 destructuring. rather than `const email = req.body.email;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && login attempts limit reached && password is correct
  const user = await User.findOne({ email }).select(
    '+password +loginConsecutiveAttempts'
  ); // explicitely select the fields that by default not selectable
  if (!user) {
    return next(new AppError('Incorrect email or password', 401)); // if we check for email and password separately, we then give the potential attacker the information whether the email or the password is incorrect
  }

  const currentLoginAttempts = user.loginConsecutiveAttempts;

  if (currentLoginAttempts >= process.env.MAX_CONSECUTIVE_LOGIN_ATTEMPTS) {
    await user.updateOne(
      { email },
      { loginConsecutiveAttempts: currentLoginAttempts + 1 }
    );
    return next(
      new AppError(
        'Maximum login attempts reached. Your account has been frozen!',
        401
      )
    );
  }

  if (!(await user.correctPassword(password, user.password))) {
    await User.updateOne(
      { email },
      { loginConsecutiveAttempts: currentLoginAttempts + 1 }
    );
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything is ok, send token to client
  await User.updateOne({ email }, { loginConsecutiveAttempts: 0 });
  createSendToken(user, 200, res);
  // const token = signToken(user._id); //  the difference between the token here and the token of signup is only the iat(create at). multiple tokens work at the same time??
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there // a common practice is to send a token using an http header with the request
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }

  if (!token) {
    res.redirect('/'); // if the user is not logged in, go back to the homepage.
    return next(
      new AppError('You are not logged in. Please login to get access.', 401)
    );
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token // check if someone manipulate the token or the token has already expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // verify and return the payload (id, iat, exp)

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id); // return a long query if 'await' is missing
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  const flag = await currentUser.changedPasswordAfter(decoded.iat); // await!!!!!
  if (flag) {
    return next(
      new AppError('User recently changed password! Please log in again!', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE: get to the route that this middleware protects.
  req.user = currentUser; // because user information is not included in the url in this case but we can decode it from the token (from req.header)
  res.locals.user = currentUser; // is available in pug files when rendering on the client side
  next();
});

//  Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //  1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      ); // verify and return the payload (id, iat, exp)

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id); // return a long query if 'await' is missing
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (await currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser; // res.locals is available to template pugs
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      // req.user.role comes from authController.protect
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with the email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to the user as an email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`; // the url for user to reset password
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // we do not want this err to be handled at the global error handler
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex'); // the 'password' the user got in the step of 'forgotPassword'

  const user = await User.findOne({
    passwordResetToken: hashedToken, // verify the 'password' equal to the one stored at the database
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // run all the validators when saving

  // 3) UpdatechangePasswordAt property for the user: pre hook in userModel

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password'); // we cannot use req.user directly because the password would not be selected

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work as intended! the instance method (pre hooks) and validators will not run.

  // 4) Log user in send JWT
  createSendToken(user, 200, res);
});
