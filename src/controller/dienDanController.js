import db from '../models/models/index';
import { buildXmlContent, parseXmlContent } from '../service/helperService.js';
import multer from 'multer';
import path from 'path';

// ─── Upload ảnh TinyMCE ───────────────────────────────────────────────────────
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './src/public/Images'),
    filename: (req, file, cb) => cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadMiddleware = multer({ storage: uploadStorage });

export const uploadAnh = [
    uploadMiddleware.single('file'),
    (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        res.json({ location: `/Images/${req.file.filename}` });
    },
];

// ─── Index ────────────────────────────────────────────────────────────────────
const index = async (req, res) => {
    try {
        const chuDeList = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        const danhSachQTV = await db.QuanTriVien.findAll({
            attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'],
        });
        const motSoChuDe = await db.ChuDe.findAll({
            include: [{ model: db.LoaiCD, attributes: ['TenLoai'] }],
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM BaiViet 
                            WHERE BaiViet.MaCD = ChuDe.MaCD 
                            AND BaiViet.TrangThai = 'Đã duyệt'
                        )`),
                        'SoBai'
                    ]
                ]
            },
            limit: 10,
        });
        res.render('DienDanThaoLuan/Index', {
            chuDeList,
            danhSachQTV,
            motSoChuDe: motSoChuDe.map(cd => ({
                MaCD: cd.MaCD,
                TenCD: cd.TenCD,
                TenLoai: cd.LoaiCD?.TenLoai || '',
                MaLoai: cd.LoaiCD?.MaLoai || '',
                SoBai: cd.dataValues.SoBai || 0,
            })),
        });
    } catch (error) {
        console.error('index error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Bài viết mới ─────────────────────────────────────────────────────────────
const baiVietMoi = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: { TrangThai: 'Đã duyệt' },          // ← khớp DB
            include: [
                { model: db.ThanhVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.QuanTriVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.ChuDe, attributes: ['TenCD'] },
            ],
            order: [['NgayDang', 'DESC']],
            limit,
            offset,
        });

        const danhSachQTV = await db.QuanTriVien.findAll({
            attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'],
        });

        const baiVietsMapped = baiViets.map(bv => ({
            MaBV: bv.MaBV,
            TieuDe: bv.TieuDeBV,
            NgayDang: bv.NgayDang,
            TenNguoiViet: bv.ThanhVien?.HoTen || bv.QuanTriVien?.HoTen || 'Ẩn danh',
            AnhDaiDien: bv.ThanhVien?.AnhDaiDien || bv.QuanTriVien?.AnhDaiDien || null,
            IsAdmin: !!bv.MaQTV,
            SoBL: 0,
        }));

        res.render('DienDanThaoLuan/BaiVietMoi', {
            baiViets: baiVietsMapped,
            danhSachQTV,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('baiVietMoi error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const locBaiViet = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;
    const sortOrder = req.query.sortOrder || 'newest';

    try {
        let orderCondition = [['NgayDang', 'DESC']];
        switch (sortOrder) {
            case 'oldest': orderCondition = [['NgayDang', 'ASC']]; break;
            case 'az': orderCondition = [['TieuDeBV', 'ASC']]; break;
            case 'za': orderCondition = [['TieuDeBV', 'DESC']]; break;
            default: orderCondition = [['NgayDang', 'DESC']];
        }

        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: { TrangThai: 'Đã duyệt' },          // ← khớp DB
            include: [
                { model: db.ThanhVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.QuanTriVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.ChuDe, attributes: ['TenCD'] },
            ],
            order: orderCondition,
            limit,
            offset,
        });

        const baiVietsWithCount = await Promise.all(baiViets.map(async (bv) => {
            const soBL = await db.BinhLuan.count({
                where: { MaBV: bv.MaBV, TrangThai: 'Đã duyệt' }, // ← khớp DB
            });
            return {
                MaBV: bv.MaBV,
                TieuDe: bv.TieuDeBV,
                NgayDang: bv.NgayDang,
                TenNguoiViet: bv.ThanhVien?.HoTen || bv.QuanTriVien?.HoTen || 'Ẩn danh',
                AnhDaiDien: bv.ThanhVien?.AnhDaiDien || bv.QuanTriVien?.AnhDaiDien || null,
                IsAdmin: !!bv.MaQTV,
                SoBL: soBL,
            };
        }));

        const danhSachQTV = await db.QuanTriVien.findAll({
            attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'],
        });

        res.render('DienDanThaoLuan/BaiVietMoi', {
            baiViets: baiVietsWithCount,
            danhSachQTV,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            currentSort: sortOrder,
        });
    } catch (error) {
        console.error('locBaiViet error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Chủ đề theo loại ─────────────────────────────────────────────────────────
const chuDeTheoLoai = async (req, res) => {
    const maLoai = req.params.maLoai;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const loai = await db.LoaiCD.findOne({ where: { MaLoai: maLoai } });
        if (!loai) return res.status(404).send('Loại chủ đề không tồn tại!');

        const { count, rows: chuDes } = await db.ChuDe.findAndCountAll({
            where: { MaLoai: maLoai },
            limit,
            offset,
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM BaiViet 
                            WHERE BaiViet.MaCD = ChuDe.MaCD 
                            AND BaiViet.TrangThai = 'Đã duyệt'
                        )`),
                        'SoBai'
                    ]
                ]
            },
        });

        res.render('DienDanThaoLuan/ChuDe', {
            chuDes: chuDes.map(cd => ({
                MaCD: cd.MaCD,
                TenCD: cd.TenCD,
                TenLoai: loai.TenLoai,
                SoBai: cd.dataValues.SoBai || 0,
            })),
            TenLoai: loai.TenLoai,
            MaLoai: loai.MaLoai,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('chuDeTheoLoai error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Bài viết theo chủ đề ─────────────────────────────────────────────────────
const baiVietTheoCD = async (req, res) => {
    const maCD = req.params.MaCD;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    try {
        const chuDe = await db.ChuDe.findOne({
            where: { MaCD: maCD },
            include: [{ model: db.LoaiCD }],
        });
        if (!chuDe) return res.status(404).send('Chủ đề không tồn tại!');

        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: { TrangThai: 'Đã duyệt', MaCD: maCD }, // ← khớp DB
            include: [
                { model: db.ThanhVien, attributes: ['HoTen', 'AnhDaiDien'] },
                { model: db.QuanTriVien, attributes: ['HoTen', 'AnhDaiDien'] },
            ],
            order: [['NgayDang', 'DESC']],
            limit,
            offset,
        });

        const danhSachQTV = await db.QuanTriVien.findAll({
            attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'],
        });

        res.render('DienDanThaoLuan/BaiVietTheoCD', {
            baiViets: baiViets.map(bv => ({
                MaBV: bv.MaBV,
                TieuDe: bv.TieuDeBV,
                NgayDang: bv.NgayDang,
                TenNguoiViet: bv.ThanhVien?.HoTen || bv.QuanTriVien?.HoTen || 'Ẩn danh',
                AnhDaiDien: bv.ThanhVien?.AnhDaiDien || bv.QuanTriVien?.AnhDaiDien || null,
                IsAdmin: !!bv.MaQTV,
                SoBL: 0,
            })),
            chuDe,
            danhSachQTV,
            TenCD: chuDe.TenCD,
            MaCD: chuDe.MaCD,
            TenLoai: chuDe.LoaiCD?.TenLoai || '',
            MaLoai: chuDe.LoaiCD?.MaLoai || '',
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('baiVietTheoCD error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Nội dung bài viết ────────────────────────────────────────────────────────
const noiDungBaiViet = async (req, res) => {
    const maBV = req.params.MaBV;
    try {
        const baiViet = await db.BaiViet.findOne({
            where: { MaBV: maBV },
            include: [
                { model: db.ThanhVien, attributes: ['MaTV', 'TenDangNhap', 'HoTen', 'AnhDaiDien'] },
                { model: db.QuanTriVien, attributes: ['MaQTV', 'TenDangNhap', 'HoTen', 'AnhDaiDien'] },
                { model: db.ChuDe, include: [{ model: db.LoaiCD }] },
            ],
        });
        if (!baiViet) return res.status(404).send('Bài viết không tồn tại!');

        const { noiDungVanBan, codeContent } = parseXmlContent(baiViet.NoiDung);

        const nguoiVietBai = baiViet.ThanhVien || baiViet.QuanTriVien;
        const idNguoiViet = baiViet.ThanhVien ? baiViet.MaTV : baiViet.MaQTV;

        // ← SỬA LỖI CHÍNH: 'DaDuyet' → 'Hiển thị' để bình luận vừa gửi hiện ra
        const binhLuansRaw = await db.BinhLuan.findAll({
            where: { MaBV: maBV, TrangThai: 'Đã duyệt' },
            include: [
                { model: db.ThanhVien, attributes: ['MaTV', 'TenDangNhap', 'AnhDaiDien'] },
                { model: db.QuanTriVien, attributes: ['MaQTV', 'TenDangNhap', 'AnhDaiDien'] },
            ],
            order: [['NgayGui', 'ASC']],
        });

        const binhLuans = binhLuansRaw.map(bl => {
            const nguoiBL = bl.ThanhVien || bl.QuanTriVien;
            const { noiDungVanBan: ndbl, codeContent: blCode } = parseXmlContent(bl.NoiDung);
            return {
                MaBL: bl.MaBL,
                IDCha: bl.IDCha,
                NDBL: ndbl || bl.NoiDung,
                CodeContent: blCode,
                NgayGui: bl.NgayGui,
                TenNguoiViet: nguoiBL?.TenDangNhap || 'Ẩn danh',
                avatarNguoiBL: nguoiBL?.AnhDaiDien || null,
                MaNguoiGui: bl.ThanhVien ? bl.MaTV : bl.MaQTV,
                IsAdmin: !!bl.MaQTV,
                ReplyToContent: null,
            };
        });

        res.render('DienDanThaoLuan/NDBaiViet', {
            baiViet,
            noiDungVanBan,
            codeContent,
            binhLuans,
            nguoiVietBai,
            idNguoiViet,
            tenloai: baiViet.ChuDe?.LoaiCD?.TenLoai || '',
            maloai: baiViet.ChuDe?.LoaiCD?.MaLoai || '',
            tencd: baiViet.ChuDe?.TenCD || '',
            macd: baiViet.MaCD || '',
            ngonNgu: '',
        });
    } catch (error) {
        console.error('noiDungBaiViet error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Thêm bài viết ────────────────────────────────────────────────────────────
const getThemBV = async (req, res) => {
    try {
        const chuDeList = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        res.render('DienDanThaoLuan/ThemBV', { chuDeList, Loi: null });
    } catch (error) {
        console.error('getThemBV error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const postThemBV = async (req, res) => {
    const { TieuDeBV, NoiDung, CodeContent, MaCD } = req.body;
    const userId = req.session.userId;

    if (!TieuDeBV || !NoiDung || !MaCD) {
        const chuDeList = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        return res.render('DienDanThaoLuan/ThemBV', {
            chuDeList,
            Loi: 'Vui lòng điền đầy đủ thông tin!',
        });
    }

    try {
        const noiDungXML = buildXmlContent(NoiDung, CodeContent);
        await db.BaiViet.create({
            MaBV: 'BV' + Date.now(),
            TieuDeBV,
            NoiDung: noiDungXML,
            MaCD,
            MaTV: userId,
            TrangThai: 'Chờ duyệt',     // ← khớp DB (không phải 'ChoXetDuyet')
            NgayDang: new Date(),
        });
        req.session.tempData = { successMessage: 'Bài viết đã được gửi, chờ xét duyệt!' };
        return res.redirect('/bai-viet-cua-toi');
    } catch (error) {
        console.error('postThemBV error:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Bài viết của tôi ─────────────────────────────────────────────────────────
const baiVietCuaToi = async (req, res) => {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: { MaTV: userId },
            include: [
                { model: db.ChuDe, attributes: ['TenCD'] },
                { model: db.ThanhVien, attributes: ['HoTen', 'AnhDaiDien'] },
            ],
            order: [['NgayDang', 'DESC']],
            limit,
            offset,
        });

        const successMessage = req.session.tempData?.successMessage || null;
        delete req.session.tempData;

        res.render('DienDanThaoLuan/BaiVietCuaToi', {
            baiViets: baiViets.map(bv => ({
                MaBV: bv.MaBV,
                TieuDe: bv.TieuDeBV,
                NgayDang: bv.NgayDang,
                TenNguoiViet: bv.ThanhVien?.HoTen || '',
                AnhDaiDien: bv.ThanhVien?.AnhDaiDien || null,
                TrangThai: bv.TrangThai,
                SoBL: 0,
            })),
            successMessage,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('baiVietCuaToi error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Chỉnh sửa bài viết ───────────────────────────────────────────────────────
const getChinhSuaBV = async (req, res) => {
    const maBV = req.params.maBV;
    const userId = req.session.userId;

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV, MaTV: userId } });
        if (!baiViet) return res.status(403).send('Không có quyền chỉnh sửa bài viết này!');

        const { noiDungVanBan, codeContent } = parseXmlContent(baiViet.NoiDung);
        const chuDeList = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });

        res.render('DienDanThaoLuan/ChinhSuaBV', {
            baiViet,
            noiDungVanBan,
            codeContent,
            chuDeList,
            Loi: null,
        });
    } catch (error) {
        console.error('getChinhSuaBV error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const postChinhSuaBV = async (req, res) => {
    const maBV = req.params.maBV;
    const userId = req.session.userId;
    const { TieuDeBV, NoiDung, CodeContent, MaCD } = req.body;

    if (!TieuDeBV || !NoiDung || !MaCD) {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV, MaTV: userId } });
        const chuDeList = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        const { noiDungVanBan, codeContent } = parseXmlContent(baiViet?.NoiDung);
        return res.render('DienDanThaoLuan/ChinhSuaBV', {
            baiViet, noiDungVanBan, codeContent, chuDeList,
            Loi: 'Vui lòng điền đầy đủ thông tin!',
        });
    }

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV, MaTV: userId } });
        if (!baiViet) return res.status(403).send('Không có quyền chỉnh sửa bài viết này!');

        baiViet.TieuDeBV = TieuDeBV;
        baiViet.NoiDung = buildXmlContent(NoiDung, CodeContent);
        baiViet.MaCD = MaCD;
        baiViet.TrangThai = 'Chờ duyệt';   // ← khớp DB
        await baiViet.save();

        req.session.tempData = { successMessage: 'Bài viết đã được cập nhật, chờ xét duyệt lại!' };
        return res.redirect('/bai-viet-cua-toi');
    } catch (error) {
        console.error('postChinhSuaBV error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Xóa bài viết (thành viên tự xóa) ────────────────────────────────────────
const xoaBaiViet = async (req, res) => {
    const maBV = req.params.maBV;
    const userId = req.session.userId;

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV, MaTV: userId } });
        if (!baiViet) return res.status(403).send('Không có quyền xóa bài viết này!');

        await baiViet.destroy();
        req.session.tempData = { successMessage: 'Đã xóa bài viết!' };
        return res.redirect('/bai-viet-cua-toi');
    } catch (error) {
        console.error('xoaBaiViet error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Góp ý ────────────────────────────────────────────────────────────────────
const getGopY = (req, res) => {
    res.render('DienDanThaoLuan/GopY');
};

const postGopY = async (req, res) => {
    const { NoiDung } = req.body;
    const userId = req.session.userId;

    if (!NoiDung) {
        return res.json({ success: false, message: 'Nội dung góp ý không được để trống!' });
    }

    try {
        // ← KHÔNG truyền ID — để DB tự sinh (INTEGER IDENTITY)
        await db.GopY.create({
            NoiDung,
            MaTV: userId,
            NgayGui: new Date(),
            TrangThai: false,
        });
        return res.json({ success: true, message: 'Cảm ơn bạn đã góp ý!' });
    } catch (error) {
        console.error('postGopY error:', error);
        return res.json({ success: false, message: 'Đã xảy ra lỗi!' });
    }
};

// ─── Thông báo ────────────────────────────────────────────────────────────────
const thongBao = async (req, res) => {
    const userId = req.session.userId;
    const adminId = req.session.adminId;
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        const whereClause = userId ? { MaTV: userId } : { MaQTV: adminId };
        const { count, rows: thongBaos } = await db.ThongBao.findAndCountAll({
            where: whereClause,
            order: [['NgayTB', 'DESC']],
            limit,
            offset,
        });

        res.render('DienDanThaoLuan/ThongBao', {
            thongBaos,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            adminId: adminId,
        });
    } catch (error) {
        console.error('thongBao error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// ─── Mark as read ─────────────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
    const maTB = req.params.maTB;
    const userId = req.session.userId;
    const adminId = req.session.adminId;

    try {
        const whereClause = userId
            ? { MaTB: maTB, MaTV: userId }
            : { MaTB: maTB, MaQTV: adminId };

        await db.ThongBao.update({ TrangThai: true }, { where: whereClause });
        return res.redirect('/thong-bao');
    } catch (error) {
        console.error('markAsRead error:', error);
        return res.redirect('/thong-bao');
    }
};

// ─── Xóa thông báo ────────────────────────────────────────────────────────────
const xoaThongBao = async (req, res) => {
    const maTB = req.body.MaThongBao;
    const userId = req.session.userId;
    const adminId = req.session.adminId;

    try {
        const whereClause = userId
            ? { MaTB: maTB, MaTV: userId }
            : { MaTB: maTB, MaQTV: adminId };

        await db.ThongBao.destroy({ where: whereClause });
        return res.redirect('/thong-bao');
    } catch (error) {
        console.error('xoaThongBao error:', error);
        return res.redirect('/thong-bao');
    }
};

// ─── Thông tin người dùng (public profile) ────────────────────────────────────
const thongTinNguoiDung = async (req, res) => {
    const id = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const offset = (page - 1) * limit;

    try {
        let thongTin = await db.ThanhVien.findOne({ where: { MaTV: id } });
        let isAd = false;
        if (!thongTin) {
            thongTin = await db.QuanTriVien.findOne({ where: { MaQTV: id } });
            isAd = true;
        }
        if (!thongTin) return res.status(404).send('Người dùng không tồn tại!');

        // ← khớp DB: 'Đã duyệt' thay vì 'DaDuyet'
        const whereClause = isAd
            ? { MaQTV: id, TrangThai: 'Đã duyệt' }
            : { MaTV: id, TrangThai: 'Đã duyệt' };

        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: whereClause,
            order: [['NgayDang', 'DESC']],
            limit,
            offset,
        });

        res.render('DienDanThaoLuan/ThongTin', {
            thongTin,
            isAd,
            baiViets: baiViets.map(bv => ({
                MaBV: bv.MaBV,
                TieuDe: bv.TieuDeBV,
                NgayDang: bv.NgayDang,
                SoBL: 0,
            })),
            userId: id,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('thongTinNguoiDung error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

export default {
    index,
    baiVietMoi,
    locBaiViet,
    chuDeTheoLoai,
    baiVietTheoCD,
    noiDungBaiViet,
    getThemBV,
    postThemBV,
    baiVietCuaToi,
    getChinhSuaBV,
    postChinhSuaBV,
    xoaBaiViet,
    getGopY,
    postGopY,
    thongBao,
    markAsRead,
    xoaThongBao,
    thongTinNguoiDung,
    uploadAnh,
};