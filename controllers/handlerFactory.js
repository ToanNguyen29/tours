const catchAsync = require('./../utils/catchAsync');
const appError = require('./../utils/appError');
const APIFeature = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new appError('No document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updateDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updateDoc) {
      return next(new appError('No documuent found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { data: updateDoc }
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(200).json({
      status: 'success',
      data: { data: newDoc }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;
    // const tour = Tour.findOne({_id: req.params.id})
    if (!doc) {
      return next(new appError('No tour found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { data: doc }
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    const feature = new APIFeature(Model.find(filter), req.query)
      .filtering()
      .sorting()
      .limiting()
      .pagination();

    const doc = await feature.query;

    res.status(200).json({
      status: 'success',
      quantity: doc.length,
      data: { data: doc }
    });
  });
