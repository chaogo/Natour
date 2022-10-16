const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

// mongoose is all about models, and a model is like a blueprint that we use to create documents, so it's a bit like classes in JavaScript
// we create a model out of mongoose schema which we use to describe our data, to set default values, to validate the data, ...
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: [true, 'A tour must have a name'], // validator is simply a function that return true (input can be accepted) or false (input not accepted)
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain charaters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either : easy, medium, difficulty',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // round function will be fun each time that there is a new value for the ratings average field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // caveats(限制性条款，警告): this only points to current doc on NEW document creation, (Update is not gonna work)
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) shoule be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true, // skip all the whitespace in the begining and in the end
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // put the images somewhere in the file system, and only specify image name in the database
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // This is an embedded object rather than a schema type properties.  GeoJSON
      type: {
        // this is a schema type property but a level deeper
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // this is a schema type property but a level deeper. we expect a array of numbers: (longitude, latitue)
      address: String,
      description: String,
    },
    locations: [
      // by specifying an array of objects, this will then create brand new documents inside of the parent document
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ], // Referencing: All we save on a tour document is the IDs of the tour guides for this tour. when we query the tour, we want to automatically get acess to the tour guides without them being actually saved on the tour document itself
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// sort the tours by price, so that some query like price[lt]=1000 becomes much more efficient
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1: ascending -1: descending
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// virtual properties: they are technically not part of the database
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate: with it, we can actually populate the tour (parent) with reviews / get access to the reviews for a certain tour but without keeping this array of review IDs on the tour (to prevent the array growing infinite) in the database. It's a bit like virtual fields but with 'populate'
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// mongoose also has middlewares: document, query, aggregate, model.: pre/post hooks
// DOCUMENT MIDDLEWARE:
// caveat: runs before only .save() and .create()
tourSchema.pre('save', function (next) {
  // regular function v.s. arrow function: the former can get access to 'this'
  // console.log(this); // this points to the document
  this.slug = slugify(this.name, { lower: true });
  next();
}); // pre save hook/middleware

// embedding
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id)); // an array full of promises
//   this.guides = await Promise.all(guidesPromises); // awaiting promises
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save doc...');
//   next(); // if omit next(), we will get stuck in this middleware
// });

// tourSchema.post('save', function (doc, next) {
//   // post middleware happens after all pre middleware has been done
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } }); // 'this' points to the current query object

  this.start = Date.now();
  next();
});
// regular expression /^find/ specifies all the strings startingwith 'find'
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  }); // populate: to filled the field called guides in our model. Before, "guides" contains only user id. after: the user can be displayed like embedded but still not in the database. populate will create a query and thus affect the performance
  next();
});

// post <the other side of > pre
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({
//     // unshift: add an element to the beginning of an array
//     $match: { secretTour: { $ne: true } },
//   });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); // model name for capital letters

module.exports = Tour;
