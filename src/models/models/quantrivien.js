'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuanTriVien extends Model {
    static associate(models) {
      QuanTriVien.hasMany(models.BaiViet, { foreignKey: 'MaQTV' });
      QuanTriVien.hasMany(models.BinhLuan, { foreignKey: 'MaQTV' });
      QuanTriVien.hasMany(models.ThongBao, { foreignKey: 'MaQTV' });
    }
  }

  QuanTriVien.init({
    MaQTV: { type: DataTypes.STRING(15), primaryKey: true },
    HoTen: DataTypes.STRING(80),
    AnhDaiDien: DataTypes.STRING(50),
    AnhBia: DataTypes.STRING(50),
    Email: { type: DataTypes.STRING(30), unique: true },
    GioiTinh: DataTypes.STRING(3),
    SDT: DataTypes.STRING(11),
    NgaySinh: DataTypes.DATE,
    TenDangNhap: DataTypes.STRING(15),
    MatKhau: DataTypes.STRING(255),
  }, {
    sequelize,
    modelName: 'QuanTriVien',
    tableName: 'QuanTriVien',
    timestamps: false,
    freezeTableName: true,
  });

  return QuanTriVien;
};