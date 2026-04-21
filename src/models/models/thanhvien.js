'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ThanhVien extends Model {
    static associate(models) {
      ThanhVien.hasMany(models.BaiViet, { foreignKey: 'MaTV' });
      ThanhVien.hasMany(models.BinhLuan, { foreignKey: 'MaTV' });
      ThanhVien.hasMany(models.GopY, { foreignKey: 'MaTV' });
      ThanhVien.hasMany(models.ThongBao, { foreignKey: 'MaTV' });
    }
  }

  ThanhVien.init({
    MaTV: { type: DataTypes.STRING(15), primaryKey: true },
    HoTen: DataTypes.STRING(80),
    AnhDaiDien: DataTypes.STRING(50),
    AnhBia: DataTypes.STRING(50),
    Email: DataTypes.STRING(30),
    GioiTinh: DataTypes.STRING(3),
    SDT: DataTypes.STRING(11),
    NgaySinh: DataTypes.DATE,
    NgayThamGia: DataTypes.DATE,
    TenDangNhap: DataTypes.STRING(15),
    MatKhau: DataTypes.STRING(255),
  }, {
    sequelize,
    modelName: 'ThanhVien',
    tableName: 'ThanhVien',
    timestamps: false,
    freezeTableName: true,
  });
  return ThanhVien;
};