const Tour = require('./../models/tourModel');
const APIFeature = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const appError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.AliasTour = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  // const t = await Tour.findById('650aae0b22ef244a24216045');
  // console.log(t.ratingsAverage);
  // console.log(typeof t.ratingsAverage);

  // $match: lọc theo điều kiện
  // $group: nhóm các đối tượng có cùng khóa _id (vd: _id: '$name' là nhóm các đối tượng có name giống nhau và thao tác trên các nhóm đó)

  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },

    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // null là không nhóm
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },

    {
      $sort: {
        avgPrice: 1
      }
    },

    {
      $match: { _id: { $ne: 'EASY' } }
    }
  ]);

  console.log(stats);

  res.status(200).json({
    status: 'success',
    data: {
      data: stats
    }
  });
});

exports.getMontlyPlan = catchAsync(async (req, res, next) => {
  // $unwind : dùng để tách 1 đối tượng có 1 trường là mãng gồm nhiều giá trị khác nhau thành nhiều đối tượng có trường đó chỉ có duy nhất 1 giá trị
  // Vd: $unwind: $startdate => StartDate có 2 giá trị khác nhau là 29/10 và 31/05 thì sẽ tách đối tượng đó thành 2 đối tượng khác mà có StartDate lần lượt là 29/10 và 31/05

  // $project: Như .select dùng để chọn những trường có thể xuất hiện ở kết quả trả về, đồng thời cũng có thể thao tác logic với các trường đấy
  // Vd: _id sẽ không hiện, name và age sẽ hiện và friendCount là sẽ dùng size để xác định kích thước mãnh sau đó hiện lên
  // db.users.aggregate([
  //   {
  //     $project: {
  //       _id: 0,
  //       name: 1,
  //       age: 1,
  //       friendCount: { $size: '$friends' }
  //     }
  //   }
  // ]);

  // $addFields: để thêm 1 field vào kết quả
  // Vd: $addField: {a: '_id'} là thêm một trường a có giá trị là _id

  // $sort: để sắp xếp dựa theo thuộc tính
  // Vd: $sort: {price: 1} là sắp xếp tăng dần, -1 là giảm dần, price phải có trong thuộc tính được lọc ở các bước trước, nếu bước trước lọc bỏ thuộc tính price ra thì ta không thể sort theo price

  // Lấy ra số liệu tour bắt đẩu của một năm theo từng tháng

  const year = req.params.year * 1;

  const stats = await Tour.aggregate([
    // vì startDate của 1 tour có thể có nhiều giá trị nên ta sẽ tách ra thành nhiều đói tượng khác nhau - [{1}, {2}] => {1} {2}
    {
      $unwind: '$startDate'
    },
    // Sau đó ta cần dùng $match để lọc ra các startDate trong 1 năm cụ thể
    {
      $match: {
        startDate: {
          $gte: new Date(`${year}-1-1`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    // Sau đó muốn hiện theo từng tháng ta phải dùng $group để nhóm theo từng tháng
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStart: { $sum: 1 },
        tours: { $push: '$name' },
        month: { $first: { $month: '$startDates' } }
      }
    },
    // Sau đó ta cần thêm tháng vào để biết đang thống kê tháng mấy
    {
      $addFields: {
        month: '$_id'
      }
    },
    // Xóa trường _id
    {
      $project: {
        _id: 0
      }
    },
    // Sắp xếp thứ tự từ tháng 1-12
    {
      $sort: {
        month: 1
      }
    },
    // Dùng limit để giới hạn số lượng document được trả về
    {
      $limit: 12
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: { data: stats }
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: { data: tours }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.621371 : 1;

  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { data: distances }
  });
});
