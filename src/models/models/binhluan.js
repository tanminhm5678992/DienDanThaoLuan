'use strict';
const { Model } = require('sequelize');

// ─── BinhLuan ─────────────────────────────────────────────────────────────────
const BinhLuanFactory = (sequelize, DataTypes) => {
  class BinhLuan extends Model {
    static associate(models) {
      BinhLuan.belongsTo(models.BaiViet, { foreignKey: 'MaBV' });
      BinhLuan.belongsTo(models.ThanhVien, { foreignKey: 'MaTV' });
      BinhLuan.belongsTo(models.QuanTriVien, { foreignKey: 'MaQTV' });
      // Self-referencing cho reply
      BinhLuan.hasMany(BinhLuan, { foreignKey: 'IDCha', as: 'Replies' });
      BinhLuan.belongsTo(BinhLuan, { foreignKey: 'IDCha', as: 'Parent' });
    }
  }
  BinhLuan.init({
    MaBL: { type: DataTypes.STRING(15), primaryKey: true },
    IDCha: DataTypes.STRING(15),
    NoiDung: DataTypes.TEXT,
    NgayGui: DataTypes.DATE,
    TrangThai: DataTypes.STRING(20),
    MaBV: DataTypes.STRING(15),
    MaTV: DataTypes.STRING(15),
    MaQTV: DataTypes.STRING(15),
  }, {
    sequelize,
    modelName: 'BinhLuan',
    tableName: 'BinhLuan',
    timestamps: false,
    freezeTableName: true,
  });
  return BinhLuan;
};

module.exports = BinhLuanFactory;