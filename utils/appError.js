class AppError extends Error {
  constructor(message, statusCode) {
    // super() is added in each class constructor automatically by compiler if there is no super() or this().
    // super is used to invoke parent class constructor. here we passed an argument to the constructor
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
