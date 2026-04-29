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

// ─── AI Code Suggest — Ollama local, miễn phí, không giới hạn ────────────────
// Khi chạy Docker: OLLAMA_HOST=http://ollama:11434 (tên service trong compose)
// Khi chạy local:  OLLAMA_HOST=http://localhost:11434
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';

const LANG_NAMES = {
    cpp: 'C++', c: 'C', python: 'Python',
    java: 'Java', javascript: 'JavaScript', php: 'PHP',
};

router.post('/api/ai-suggest', async (req, res) => {
    const { code, language } = req.body;

    if (!code || !code.trim() || code.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Thiếu code' });
    }

    const langName = LANG_NAMES[language] || language;
    const prompt =
        `You are a code completion AI. The user is writing ${langName}.\n` +
        `Current code:\n\`\`\`${language}\n${code}\n\`\`\`\n` +
        `Return ONLY the next code to append (do not repeat existing code, no explanation, no markdown, no backticks). Max 8 lines.`;

    try {
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    top_p: 0.9,
                    num_predict: 150,
                    stop: ['\n\n\n'],
                },
            }),
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Ollama error:', response.status, text);
            return res.status(502).json({
                success: false,
                message: 'Ollama chưa sẵn sàng, thử lại sau vài giây.',
            });
        }

        const data = await response.json();
        const suggestion = (data.response || '')
            .replace(/^```[\w]*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();

        return res.json({ success: true, suggestion });

    } catch (err) {
        if (err.name === 'TimeoutError') {
            return res.status(504).json({
                success: false,
                message: 'AI timeout — model đang khởi động, thử lại sau.',
            });
        }
        console.error('ai-suggest error:', err);
        return res.status(500).json({
            success: false,
            message: 'Không kết nối được Ollama.',
        });
    }
});

// ─── Kiểm tra trạng thái Ollama ───────────────────────────────────────────────
router.get('/api/ai-status', async (req, res) => {
    try {
        const r = await fetch(`${OLLAMA_HOST}/api/tags`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!r.ok) return res.json({ online: false });
        const data = await r.json();
        const models = (data.models || []).map(m => m.name);
        const ready = models.some(m => m.startsWith(OLLAMA_MODEL.split(':')[0]));
        res.json({ online: true, models, ready, using: OLLAMA_MODEL });
    } catch {
        res.json({ online: false, message: 'Ollama chưa chạy' });
    }
});

const initApiRoute = (app) => {
    app.use('/', router);
};

export default initApiRoute;