'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
    async up(queryInterface) {
        // Seed LoaiCD
        await queryInterface.bulkInsert('LoaiCD', [
            { TenLoai: 'Lập trình' },
            { TenLoai: 'Thiết kế' },
            { TenLoai: 'Cơ sở dữ liệu' },
            { TenLoai: 'Mạng máy tính' },
            { TenLoai: 'Trí tuệ nhân tạo' },
        ]);

        // Seed ChuDe
        await queryInterface.bulkInsert('ChuDe', [
            { TenCD: 'JavaScript', MaLoai: 1 },
            { TenCD: 'Python', MaLoai: 1 },
            { TenCD: 'C#', MaLoai: 1 },
            { TenCD: 'SQL', MaLoai: 3 },
            { TenCD: 'Machine Learning', MaLoai: 5 },
        ]);

        // Seed QuanTriVien mặc định
        const salt = bcrypt.genSaltSync(10);
        const hashed = bcrypt.hashSync('Admin@123', salt);

        await queryInterface.bulkInsert('QuanTriVien', [{
            HoTen: 'Quản trị viên',
            Email: 'admin@diendanthaoluan.com',
            TenDangNhap: 'admin',
            MatKhau: hashed,
            GioiTinh: 'Nam',
        }]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('ChuDe', null, {});
        await queryInterface.bulkDelete('LoaiCD', null, {});
        await queryInterface.bulkDelete('QuanTriVien', null, {});
    },
};