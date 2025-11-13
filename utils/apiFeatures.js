class APIFeature {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filtering() {
    const queryObj = { ...this.queryString }; // tạo ra bản sao của req.query
    const excludeFields = ['sort', 'fields', 'page', 'limit'];
    excludeFields.forEach((el) => delete queryObj[el]); // xóa các key có tên là sort, filter, page

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // $gte trong mongodb là lớn hơn hoặc bằng nên ta cần thêm ký tự $ vào trước các query để dùng để truy vấn Mongodb

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sorting() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.replace(/,/g, ' ');
      // const sortBy = req.query.sort.split(',').join(' '); // cắt chuỗi khi gặp dấu , sau đó join chuỗi lại bằng dấu cách
      // console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limiting() {
    if (this.queryString.fields) {
      const fieldBy = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fieldBy);
    } else {
      this.query = this.query.select('-__v'); // -__v là khi migration thì nó tự tạo nên khi hiện thông tin ra thì không cần hiện nó nên ta dùng - để loại bỏ
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    // if (req.query.page) {
    //   const countTours = await Tour.countDocuments();
    //   if (skip >= countTours) {
    //     throw new Error('This page does not exist');
    //   }
    // }
    return this;
  }
}

module.exports = APIFeature;
