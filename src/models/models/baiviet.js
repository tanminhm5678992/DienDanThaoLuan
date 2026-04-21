'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BaiViet extends Model {
    static associate(models) {
      BaiViet.belongsTo(models.ThanhVien, { foreignKey: 'MaTV' });
      BaiViet.belongsTo(models.QuanTriVien, { foreignKey: 'MaQTV' });
      BaiViet.belongsTo(models.ChuDe, { foreignKey: 'MaCD' });
      BaiViet.hasMany(models.BinhLuan, { foreignKey: 'MaBV' });
    }
  }

  BaiViet.init({
    MaBV: { type: DataTypes.STRING(15), primaryKey: true },
    TieuDeBV: DataTypes.STRING(60),
    NoiDung: DataTypes.TEXT,
    NgayDang: DataTypes.DATE,
    TrangThai: DataTypes.STRING(20),
    MaCD: DataTypes.STRING(15),
    MaTV: DataTypes.STRING(15),
    MaQTV: DataTypes.STRING(15),
  }, {
    sequelize,
    modelName: 'BaiViet',
    tableName: 'BaiViet',
    timestamps: false,
    freezeTableName: true,
  });

  return BaiViet;
};