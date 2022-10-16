const mongoose = require('mongoose');
const dotenv = require('dotenv');

// uncaught exception: all errors/bugs that ocurr in our synchronous code but are not handled by anywhere
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down ...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successful!'));

// console.log(process.env); // environment variables
// console.log(app.get('env')); // express has two environments: development environment and production evironment; NOde.js itself also sets a lot of environment variables

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App runing on port ${port}...`);
});

// starting file
// put everyting that is related to express in app.js and put everything that is related to server in server.js

// unhandled rejections: // handle all promise rejections like a last safety net
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLER REJECTION! 💥 Shutting down ...');
  console.log(err.name, err.message);
  server.close(() => {
    // by using server.close, we give time to the server to finish all the request that are still pending or being handled at the time
    process.exit(1);
  });
});

// console.log(x); // uncaught exception
