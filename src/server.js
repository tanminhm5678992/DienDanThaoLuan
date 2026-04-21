import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import configViewEngine from './config/viewEngine';
import initWebRoute from './routes/web';
import initApiRoute from './routes/api';
import bodyParser from 'body-parser';
import session from 'express-session';
import connection from './config/connectDB';
import db from './models/models/index';

const app = express();
const PORT = process.env.PORT || 8080;

connection();
configViewEngine(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'my_secret_key_forum',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ─── Middleware toàn cục: inject locals cho layout/partials ───────────────────
app.use(async (req, res, next) => {
    // TempData
    res.locals.successMessage = req.session.tempData?.successMessage || null;
    res.locals.errorMessage = req.session.tempData?.errorMessage || null;
    delete req.session.tempData;

    // Auth
    res.locals.userId = req.session.userId || null;
    res.locals.adminId = req.session.adminId || null;

    try {
        // Username hiển thị trên header
        if (req.session.userId) {
            const tv = await db.ThanhVien.findOne({
                where: { MaTV: req.session.userId },
                attributes: ['TenDangNhap'],
            });
            res.locals.username = tv ? tv.TenDangNhap : null;
        } else if (req.session.adminId) {
            const qtv = await db.QuanTriVien.findOne({
                where: { MaQTV: req.session.adminId },
                attributes: ['TenDangNhap'],
            });
            res.locals.username = qtv ? qtv.TenDangNhap : null;
        } else {
            res.locals.username = null;
        }

        // Loại chủ đề cho dropdown menu
        const loaiCDs = await db.LoaiCD.findAll({ attributes: ['MaLoai', 'TenLoai'] });
        res.locals.loaiCDs = loaiCDs;

        // Số thông báo chưa đọc
        if (req.session.userId || req.session.adminId) {
            const whereClause = req.session.userId
                ? { MaTV: req.session.userId, TrangThai: false }
                : { MaQTV: req.session.adminId, TrangThai: false };
            res.locals.unreadCount = await db.ThongBao.count({ where: whereClause });
        } else {
            res.locals.unreadCount = 0;
        }

        // Số góp ý chưa xử lý (chỉ admin cần)
        if (req.session.adminId) {
            res.locals.soLuongGopY = await db.GopY.count({ where: { TrangThai: false } });
            res.locals.soLuongBaiViet = await db.BaiViet.count({ where: { TrangThai: 'ChoXetDuyet' } });
        } else {
            res.locals.soLuongGopY = 0;
            res.locals.soLuongBaiViet = 0;
        }

        // currentUser cho partial bình luận
        if (req.session.userId) {
            res.locals.currentUser = await db.ThanhVien.findOne({
                where: { MaTV: req.session.userId },
                attributes: ['MaTV', 'TenDangNhap', 'AnhDaiDien'],
            });
        } else if (req.session.adminId) {
            res.locals.currentUser = await db.QuanTriVien.findOne({
                where: { MaQTV: req.session.adminId },
                attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'],
            });
        } else {
            res.locals.currentUser = null;
        }

    } catch (err) {
        console.error('Global middleware error:', err);
        // Không crash app nếu DB lỗi
        res.locals.username = null;
        res.locals.loaiCDs = [];
        res.locals.unreadCount = 0;
        res.locals.soLuongGopY = 0;
        res.locals.soLuongBaiViet = 0;
        res.locals.currentUser = null;
    }

    next();
});

initWebRoute(app);
initApiRoute(app);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Đã xảy ra lỗi máy chủ!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});