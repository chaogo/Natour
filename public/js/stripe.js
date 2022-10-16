/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    const stripe = Stripe(
      'pk_test_51Lt8jwJftMOuYWMuPQhuRBufKqrlRwPxS5Jpyj4E67uXs26nUmkPVeRBbCdI3BxGg5xFp8BBlUSxzeyZPq2Pvadi00UVCNW2sC'
    );

    // 1) Get checkout session form API (endpoint)
    const session = await axios(
      `http://127.0.0.1:8000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
