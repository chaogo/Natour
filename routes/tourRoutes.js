const express = require('express');
const tourController = require('../controllers/tourController');
// const {getAllTours, ... } = require('./../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// each router is a mini sub-application, one for each resource, in the middleware stack
// param middleware
// router.param('id', tourController.checkID);

// POST /tours/234fad4/reviews
// GET /tours/234fad4/reviews
// GET /tours/234fad4/reviews/2345fdsf

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewRouter.createReview
//   );

// re-route (redirecte)
router.use('/:tourId/reviews', reviewRouter); // be aware that router is a middleware

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin); // latitude and longitude of where you live
// /tours-distance?distance=233&center=-40,45&unit=mi
// /tours-distane/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// mounting router
router
  .route('/')
  // .get(authController.protect, tourController.getAllTours) // remove 'protect' to exposure the API of getAllTours to possible outer travel website
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
