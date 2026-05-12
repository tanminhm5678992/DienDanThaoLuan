'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ThanhVien', {
      MaTV: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      HoTen: { type: Sequelize.STRING(100) },
      AnhDaiDien: { type: Sequelize.STRING(255) },
      AnhBia: { type: Sequelize.STRING(255) },
      Email: { type: Sequelize.STRING(150), unique: true },
      GioiTinh: { type: Sequelize.STRING(10) },
      SDT: { type: Sequelize.STRING(15) },
      NgaySinh: { type: Sequelize.DATE },
      NgayThamGia: { type: Sequelize.DATE },
      TenDangNhap: { type: Sequelize.STRING(100), unique: true },
      MatKhau: { type: Sequelize.STRING(255) },
      TrangThai: { type: Sequelize.BOOLEAN, defaultValue: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ThanhVien');
  },
};