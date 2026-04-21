'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoaiCD extends Model {
    static associate(models) {
      LoaiCD.hasMany(models.ChuDe, { foreignKey: 'MaLoai' });
    }
  }

  LoaiCD.init({
    MaLoai: { type: DataTypes.STRING(15), primaryKey: true },
    TenLoai: DataTypes.STRING(100),
  }, {
    sequelize,
    modelName: 'LoaiCD',
    tableName: 'LoaiCD',
    timestamps: false,
    freezeTableName: true,
  });

  return LoaiCD;
};