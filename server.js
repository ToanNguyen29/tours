const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message, err);
  console.log('Unhandled Rejection! Shutting down...');
  process.exit(1);
});

const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);

console.log(DB);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then((con) => {
    // console.log(con.connections);
    console.log('DB connections successful');
  })
  .catch((err) => {
    console.log('ERR: ', err);
  });

// const testTour = new Tour({
//   name: 'The forest hiker',
//   rating: 4.7,
//   price: 497
// });

// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log('ERR: ', err);
//   });

// mongoose
//   .connect(DB, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: true
//   })
//   .then((con) => {
//     console.log(con.connections);
//     console.log('DB connections successful');
//   });

// console.log(process.env);

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`App running on port: ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection! Shutting down...');

  // Close server trước khi shut down application
  server.close(() => {
    process.exit(1);
  });
});
