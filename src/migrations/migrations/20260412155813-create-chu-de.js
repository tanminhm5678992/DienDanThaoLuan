'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ChuDe', {
      MaCD: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      TenCD: { type: Sequelize.STRING(150) },
      MaLoai: {
        type: Sequelize.INTEGER,
        references: { model: 'LoaiCD', key: 'MaLoai' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ChuDe');
  },
};