'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChuDe extends Model {
    static associate(models) {
      ChuDe.belongsTo(models.LoaiCD, { foreignKey: 'MaLoai' });
      ChuDe.hasMany(models.BaiViet, { foreignKey: 'MaCD' });
    }
  }

  ChuDe.init({
    MaCD: { type: DataTypes.STRING(15), primaryKey: true },
    TenCD: DataTypes.STRING(150),
    MaLoai: DataTypes.STRING(15),
  }, {
    sequelize,
    modelName: 'ChuDe',
    tableName: 'ChuDe',
    timestamps: false,
    freezeTableName: true,
  });

  return ChuDe;
};