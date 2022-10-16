const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    require: [true, 'Booking must belong to a Tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    require: [true, 'Booking must belong to a User!'],
  },
  price: {
    // in case the price changed after
    type: Number,
    require: [true, 'Booking must have a price.'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    // in case the customer paid outside stripe
    type: Boolean,
    default: true,
  },
});

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
