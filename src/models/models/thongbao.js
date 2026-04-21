'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ThongBao extends Model {
    static associate(models) {
      ThongBao.belongsTo(models.ThanhVien, { foreignKey: 'MaTV' });
      ThongBao.belongsTo(models.QuanTriVien, { foreignKey: 'MaQTV' });
    }
  }

  ThongBao.init({
    MaTB: { type: DataTypes.STRING(15), primaryKey: true },
    NoiDung: DataTypes.TEXT,
    NgayTB: DataTypes.DATE,
    LoaiTB: DataTypes.STRING(50),
    MaTV: DataTypes.STRING(15),
    MaQTV: DataTypes.STRING(15),
    MaDoiTuong: DataTypes.STRING(15),
    LoaiDoiTuong: DataTypes.STRING(50),
    TrangThai: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'ThongBao',
    tableName: 'ThongBao',
    timestamps: false,
    freezeTableName: true,
  });

  return ThongBao;
};