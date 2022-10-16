const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour', // the data model to populate
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    // when we have virtual properties, basically a field that is not stored in the database but calculated using some other value, we want to it also show up whenever there is an output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// compound unique indexes
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   }); // query takes time
  this.populate({
    path: 'user',
    select: 'name photo',
  }); // query takes time
  next();
});

// mongoose static methods
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // ?
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // All has been deleted
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// pre <-> post
reviewSchema.post('save', function () {
  // this points to current review document, this.constructure points to the model (Review)
  this.constructor.calcAverageRatings(this.tour);

  // post do not get access to next()
});

// findByIdAndUpdate (findOneAndUpdateById), findByIdAndDelete (findOneAndDeleteById): query midlleware does not have access to Review document
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // this points to a query, executing the query will give us the document that being processed
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already execute
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
