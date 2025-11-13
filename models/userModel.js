const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please tell us your name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your emal'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlenght: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function (value) {
        return value === this.password;
      },
      message: 'Passwords are not the same'
    }
  },
  DateChangePass: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function (next) {
  // Kiểm tra xem mật khẩu có thay đổi không nếu không thì không cần mã hóa
  if (!this.isModified('password')) return next();

  // Có thay đổi thì mã hóa bằng bcrypt with cost 12
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  // Nếu không có thay đổi mật khẩu trong đối tượng hoặc đối tượng này là đối tượng mới thì next()
  if (!this.isModified('password') || this.isNew) return next();
  // Nếu không thỏa điều trên có nghĩa là đối tượng vừa thay đổi password nên ta sẽ update thời gian đổi password
  this.DateChangePass = Date.now();
  console.log('Vào');
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.checkPass = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.checkChangePassword = function (JWTTimestamp) {
  if (this.DateChangePass) {
    const changedTimeStamp = parseInt(this.DateChangePass.getTime() / 1000, 10);
    console.log('so sánh', changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPassResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now();

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
