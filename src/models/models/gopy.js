'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GopY extends Model {
    static associate(models) {
      GopY.belongsTo(models.ThanhVien, { foreignKey: 'MaTV' });
    }
  }

  GopY.init({
    ID: { type: DataTypes.STRING(15), primaryKey: true },
    MaTV: DataTypes.STRING(15),
    NgayGui: DataTypes.DATE,
    NoiDung: DataTypes.TEXT,
    TrangThai: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'GopY',
    tableName: 'GopY',
    timestamps: false,
    freezeTableName: true,
  });

  return GopY;
};