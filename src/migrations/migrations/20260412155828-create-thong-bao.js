'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ThongBao', {
      MaTB: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      NoiDung: { type: Sequelize.TEXT },
      NgayTB: { type: Sequelize.DATE },
      LoaiTB: { type: Sequelize.STRING(50) },
      MaTV: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ThanhVien', key: 'MaTV' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      MaQTV: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'QuanTriVien', key: 'MaQTV' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      MaDoiTuong: { type: Sequelize.INTEGER },
      LoaiDoiTuong: { type: Sequelize.STRING(50) },
      TrangThai: { type: Sequelize.BOOLEAN, defaultValue: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ThongBao');
  },
};