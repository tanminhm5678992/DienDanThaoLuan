'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GopY', {
      ID: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      NoiDung: { type: Sequelize.TEXT },
      NgayGui: { type: Sequelize.DATE },
      TrangThai: { type: Sequelize.BOOLEAN, defaultValue: false },
      MaTV: {
        type: Sequelize.INTEGER,
        references: { model: 'ThanhVien', key: 'MaTV' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('GopY');
  },
};