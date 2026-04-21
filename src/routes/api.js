import express from 'express';
import db from '../models/models/index';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── Bài viết ─────────────────────────────────────────────────────────────────
router.get('/api/bai-viet', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await db.BaiViet.findAndCountAll({
            where: { TrangThai: 'DaDuyet' },
            include: [
                { model: db.ThanhVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.ChuDe, attributes: ['TenCD'] },
            ],
            order: [['NgayDang', 'DESC']],
            limit,
            offset,
        });

        res.json({ success: true, total: count, page, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Chủ đề ───────────────────────────────────────────────────────────────────
router.get('/api/chu-de', async (req, res) => {
    try {
        const data = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Thông báo chưa đọc ───────────────────────────────────────────────────────
router.get('/api/thong-bao/unread', requireAuth, async (req, res) => {
    try {
        const whereClause = req.session.userId
            ? { MaTV: req.session.userId, TrangThai: false }
            : { MaQTV: req.session.adminId, TrangThai: false };

        const count = await db.ThongBao.count({ where: whereClause });
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const initApiRoute = (app) => {
    app.use('/', router);
};

export default initApiRoute;