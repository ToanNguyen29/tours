const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({ path: './../../config.env' });

// const DB = process.env.DATABASE.replace(
//   '<password>',
//   process.env.DATABASE_PASSWORD
// );

// console.log(DB);

mongoose
  .connect(
    'mongodb+srv://ttoannguyen2910:toan29102002@clusternatours.acydt8y.mongodb.net/natours?retryWrites=true&w=majority&appName=ClusterNatours',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )
  .then((con) => {
    // console.log(con.connections);
    console.log('DB connections successful');
    if (process.argv[2] == '--import') {
      importData();
    } else if (process.argv[2] == '--delete') {
      deleteData();
    } else {
      console.log("Don't execute");
    }
  })
  .catch((err) => {
    console.log('ERR: ', err);
  });

const tours = JSON.parse(fs.readFileSync('./tours.json', 'utf-8'));
const users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));
const reviews = JSON.parse(fs.readFileSync('./reviews.json', 'utf-8'));

const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Import successfully!');
  } catch (error) {
    console.log(error);
  }
};
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Delete successfully!');
  } catch (error) {
    console.log(error);
  }
};
