class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; // copy
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);
    // console.log(this.queryString, queryObj);

    // Advanced filtering
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    ); // gte, gt, lte, lt; the regular expression
    // console.log(JSON.parse(queryString));
    this.query = this.query.find(JSON.parse(queryString));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); // sort('price ratingsAverage')
      this.query = this.query.sort(sortBy); // return a query
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' '); // ('name duration difficulty')
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // minus(-): exclude
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // 1 by default
    const limit = this.queryString.limit * 1 || 100; // 100 by default
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
