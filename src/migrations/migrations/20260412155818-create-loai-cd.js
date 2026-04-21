'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LoaiCD', {
      MaLoai: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      TenLoai: { type: Sequelize.STRING(100) },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('LoaiCD');
  },
};