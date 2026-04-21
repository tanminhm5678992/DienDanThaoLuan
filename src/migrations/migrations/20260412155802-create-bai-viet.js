'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BaiViet', {
      MaBV: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      TieuDeBV: { type: Sequelize.STRING(255) },
      NoiDung: { type: Sequelize.TEXT },
      NgayDang: { type: Sequelize.DATE },
      TrangThai: { type: Sequelize.STRING(50) },
      MaCD: {
        type: Sequelize.INTEGER,
        references: { model: 'ChuDe', key: 'MaCD' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      MaTV: {
        type: Sequelize.INTEGER,
        references: { model: 'ThanhVien', key: 'MaTV' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      MaQTV: {
        type: Sequelize.INTEGER,
        references: { model: 'QuanTriVien', key: 'MaQTV' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('BaiViet');
  },
};