const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    // use as user identifier
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // transform the email to lower case
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email',
    },
    // validator: [validator.isEmail, 'Please provide a valid email'], // not working
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on Create() and save()
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  loginConsecutiveAttempts: {
    type: Number,
    select: false,
    default: 0,
  },
});

// putting these pre/post hooks here because of the principle of MVC. model: everyting related to the data
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified to save the password in a secure way
  if (!this.isModified('password')) return next();

  // hashing algorithm (bcrypt) will first salt then *hash the password* to protect it against bruteforce attacks
  this.password = await bcrypt.hash(this.password, 12); // 12: the higher the cost here the more CPU intensive the process will be the better the password will be encrypted
  // delete the passwordConfirm
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // subtract 1s to ensure the passwordChangedAt is before the token send to the client
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } }); // {$ne: false} to include the user without the field "active"
  next();
});

// instance method: the method that is going to be available on all documents (instances of a model)
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); // the former is not hashed while the latter is.
};

userSchema.methods.changedPasswordAfter = async function (JWTTimestamp) {
  // 'this' always points to the current documents
  if (this.passwordChangedAt) {
    // passwordChangedAt: the time the user changed the password; JWTTimestamp: the time the token was created
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // the "password" for user to reset password
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // for future verify

  // console.log(resetToken, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
