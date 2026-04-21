'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BinhLuan', {
      MaBL: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      IDCha: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BinhLuan', key: 'MaBL' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      NoiDung: { type: Sequelize.TEXT },
      NgayGui: { type: Sequelize.DATE },
      TrangThai: { type: Sequelize.STRING(50) },
      MaBV: {
        type: Sequelize.INTEGER,
        references: { model: 'BaiViet', key: 'MaBV' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
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
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('BinhLuan');
  },
};