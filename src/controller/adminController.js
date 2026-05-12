import db from '../models/models/index';
import { parseXmlContent } from '../service/helperService.js';

// ─── Helper: sinh MaTB mới dạng TB001, TB002... ──────────────────────────────
const generateMaTB = async () => {
    const last = await db.ThongBao.findOne({ order: [['MaTB', 'DESC']] });
    if (!last) return 'TB001';
    const num = parseInt(last.MaTB.substring(2)) + 1;
    return 'TB' + num.toString().padStart(3, '0');
};

// ─── Duyệt bài viết ───────────────────────────────────────────────────────────
const getDuyetBai = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: baiViets } = await db.BaiViet.findAndCountAll({
            where: { TrangThai: 'Chờ duyệt' },          // ← khớp DB
            include: [
                { model: db.ThanhVien, attributes: ['HoTen', 'TenDangNhap'] },
                { model: db.ChuDe, attributes: ['TenCD'] },
            ],
            order: [['NgayDang', 'ASC']],
            limit,
            offset,
        });

        res.render('Admin/DuyetBai', {
            baiViets,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('getDuyetBai error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const getChiTietBV = async (req, res) => {
    try {
        const baiViet = await db.BaiViet.findOne({
            where: { MaBV: req.params.maBV },
            include: [
                { model: db.ThanhVien, attributes: ['TenDangNhap', 'HoTen'] },
                { model: db.ChuDe, attributes: ['TenCD'] },
            ],
        });
        if (!baiViet) return res.status(404).send('Không tìm thấy bài viết!');

        const { noiDungVanBan, codeContent } = parseXmlContent(baiViet.NoiDung);
        res.render('Admin/ChiTietBV', { baiViet, noiDungVanBan, codeContent });
    } catch (error) {
        console.error('getChiTietBV error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const postDuyetBai = async (req, res) => {
    const maBV = req.params.maBV;
    const adminId = req.session.adminId;

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV } });
        if (!baiViet) return res.status(404).send('Không tìm thấy bài viết!');

        baiViet.TrangThai = 'Đã duyệt';                  // ← khớp DB
        baiViet.MaQTV = adminId;
        await baiViet.save();

        if (baiViet.MaTV) {
            const maTB = await generateMaTB();
            await db.ThongBao.create({
                MaTB: maTB,
                NoiDung: `<NoiDung>Bài viết "${baiViet.TieuDeBV}" của bạn đã được phê duyệt.</NoiDung>`,
                NgayTB: new Date(),
                LoaiTB: 'Duyệt bài viết',
                MaTV: baiViet.MaTV,
                MaQTV: null,
                MaDoiTuong: maBV,
                LoaiDoiTuong: 'BaiViet',
                TrangThai: false,
            });
        }

        req.session.tempData = { successMessage: 'Đã duyệt bài viết!' };
        return res.redirect('/admin/duyet-bai');
    } catch (error) {
        console.error('postDuyetBai error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

const tuChoiBai = async (req, res) => {
    const maBV = req.params.maBV;
    const lydo = req.body.lydo || '';

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: maBV } });
        if (!baiViet) return res.status(404).send('Không tìm thấy bài viết!');

        baiViet.TrangThai = 'Từ chối';
        await baiViet.save();

        if (baiViet.MaTV) {
            const maTB = await generateMaTB();
            await db.ThongBao.create({
                MaTB: maTB,
                NoiDung: `<NoiDung>Bài viết "${baiViet.TieuDeBV}" của bạn đã bị từ chối vì "${lydo}".</NoiDung>`,
                NgayTB: new Date(),
                LoaiTB: 'Từ chối bài viết',
                MaTV: baiViet.MaTV,
                MaQTV: null,
                MaDoiTuong: maBV,
                LoaiDoiTuong: 'BaiViet',
                TrangThai: false,
            });
        }

        req.session.tempData = { successMessage: 'Đã từ chối bài viết!' };
        return res.redirect('/admin/duyet-bai');
    } catch (error) {
        console.error('tuChoiBai error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Xóa bài viết / bình luận (set TrangThai thay vì destroy) ─────────────────
const xoaBVBL = async (req, res) => {
    const { IdDoiTuong, LyDoXoa } = req.body;
    const referer = req.headers.referer || '/';

    try {
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: IdDoiTuong } });
        if (baiViet) {
            baiViet.TrangThai = 'Đã xóa';               // ← giống logic MVC cũ
            await baiViet.save();

            if (baiViet.MaTV) {
                const maTB = await generateMaTB();
                await db.ThongBao.create({
                    MaTB: maTB,
                    NoiDung: `<NoiDung>Bài viết "${baiViet.TieuDeBV}" của bạn đã bị xóa vì "${LyDoXoa}".</NoiDung>`,
                    NgayTB: new Date(),
                    LoaiTB: 'Xóa bài viết',
                    MaTV: baiViet.MaTV,
                    MaQTV: null,
                    MaDoiTuong: IdDoiTuong,
                    LoaiDoiTuong: 'BaiViet',
                    TrangThai: false,
                });
            }

            req.session.tempData = { successMessage: 'Đã xóa bài viết!' };
            return res.redirect(referer);
        }

        const binhLuan = await db.BinhLuan.findOne({ where: { MaBL: IdDoiTuong } });
        if (binhLuan) {
            binhLuan.TrangThai = 'Đã xóa';              // ← khớp DB (không destroy)
            await binhLuan.save();

            if (binhLuan.MaTV) {
                const maTB = await generateMaTB();
                await db.ThongBao.create({
                    MaTB: maTB,
                    NoiDung: `<NoiDung>Bình luận của bạn đã bị xóa vì "${LyDoXoa}".</NoiDung>`,
                    NgayTB: new Date(),
                    LoaiTB: 'Xóa bình luận',
                    MaTV: binhLuan.MaTV,
                    MaQTV: null,
                    MaDoiTuong: IdDoiTuong,
                    LoaiDoiTuong: 'BinhLuan',
                    TrangThai: false,
                });
            }

            req.session.tempData = { successMessage: 'Đã xóa bình luận!' };
            return res.redirect(referer);
        }

        return res.status(404).send('Không tìm thấy nội dung cần xóa!');
    } catch (error) {
        console.error('xoaBVBL error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Góp ý ────────────────────────────────────────────────────────────────────
const getGopY = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: gopYs } = await db.GopY.findAndCountAll({
            include: [{ model: db.ThanhVien, attributes: ['HoTen', 'TenDangNhap', 'AnhDaiDien'] }],
            order: [['NgayGui', 'DESC']],
            limit,
            offset,
        });

        res.render('Admin/GopY', {
            gopYs,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('getGopY error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const danhDauGopY = async (req, res) => {
    try {
        await db.GopY.update({ TrangThai: true }, { where: { ID: req.params.id } });
        req.session.tempData = { successMessage: 'Đã đánh dấu đã xử lý!' };
        return res.redirect('/admin/gop-y');
    } catch (error) {
        console.error('danhDauGopY error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Quản lý Loại chủ đề ─────────────────────────────────────────────────────
const getLoaiChuDe = async (req, res) => {
    try {
        const loaiCDs = await db.LoaiCD.findAll({ order: [['TenLoai', 'ASC']] });
        res.render('Admin/LoaiChuDe', { loaiCDs });
    } catch (error) {
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// Helper sinh MaLoai mới: L001 → L002...
const generateMaLoai = async () => {
    const last = await db.LoaiCD.findOne({ order: [['MaLoai', 'DESC']] });
    if (!last) return 'L001';
    const num = parseInt(last.MaLoai.substring(1)) + 1;
    return 'L' + num.toString().padStart(3, '0');
};

const themLoaiChuDe = async (req, res) => {
    const { TenLoai } = req.body;
    if (!TenLoai || !TenLoai.trim()) {
        req.session.tempData = { errorMessage: 'Tên loại không được rỗng!' };
        return res.redirect('/admin/quan-ly/loai-chu-de');
    }
    try {
        const existed = await db.LoaiCD.findOne({ where: { TenLoai: TenLoai.trim() } });
        if (existed) {
            req.session.tempData = { errorMessage: 'Loại chủ đề này đã tồn tại!' };
            return res.redirect('/admin/quan-ly/loai-chu-de');
        }
        const MaLoai = await generateMaLoai();
        await db.LoaiCD.create({ MaLoai, TenLoai: TenLoai.trim() });
        req.session.tempData = { successMessage: 'Thêm loại chủ đề thành công!' };
        return res.redirect('/admin/quan-ly/loai-chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

const suaLoaiChuDe = async (req, res) => {
    const { TenLoai } = req.body;
    const { id } = req.params;
    if (!TenLoai || !TenLoai.trim()) {
        req.session.tempData = { errorMessage: 'Tên loại không được rỗng!' };
        return res.redirect('/admin/quan-ly/loai-chu-de');
    }
    try {
        await db.LoaiCD.update({ TenLoai: TenLoai.trim() }, { where: { MaLoai: id } });
        req.session.tempData = { successMessage: 'Cập nhật loại chủ đề thành công!' };
        return res.redirect('/admin/quan-ly/loai-chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

const xoaLoaiChuDe = async (req, res) => {
    try {
        await db.LoaiCD.destroy({ where: { MaLoai: req.params.id } });
        req.session.tempData = { successMessage: 'Đã xóa loại chủ đề!' };
        return res.redirect('/admin/quan-ly/loai-chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Quản lý Chủ đề ──────────────────────────────────────────────────────────
const getChuDe = async (req, res) => {
    try {
        const chuDes = await db.ChuDe.findAll({ include: [{ model: db.LoaiCD }] });
        const loaiCDs = await db.LoaiCD.findAll({ order: [['TenLoai', 'ASC']] });
        res.render('Admin/ChuDe', { chuDes, loaiCDs });
    } catch (error) {
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// Helper sinh MaCD mới: CD001 → CD002...
const generateMaCD = async () => {
    const last = await db.ChuDe.findOne({ order: [['MaCD', 'DESC']] });
    if (!last) return 'CD001';
    const num = parseInt(last.MaCD.substring(2)) + 1;
    return 'CD' + num.toString().padStart(3, '0');
};

const themChuDe = async (req, res) => {
    const { TenCD, MaLoai } = req.body;
    if (!TenCD || !MaLoai) {
        req.session.tempData = { errorMessage: 'Vui lòng điền đủ thông tin!' };
        return res.redirect('/admin/quan-ly/chu-de');
    }
    try {
        const MaCD = await generateMaCD();
        await db.ChuDe.create({ MaCD, TenCD: TenCD.trim(), MaLoai });
        req.session.tempData = { successMessage: 'Thêm chủ đề thành công!' };
        return res.redirect('/admin/quan-ly/chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

const suaChuDe = async (req, res) => {
    const { TenCD } = req.body;
    const { id } = req.params;
    if (!TenCD || !TenCD.trim()) {
        req.session.tempData = { errorMessage: 'Tên chủ đề không được rỗng!' };
        return res.redirect('/admin/quan-ly/chu-de');
    }
    try {
        await db.ChuDe.update({ TenCD: TenCD.trim() }, { where: { MaCD: id } });
        req.session.tempData = { successMessage: 'Cập nhật chủ đề thành công!' };
        return res.redirect('/admin/quan-ly/chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

const xoaChuDe = async (req, res) => {
    try {
        await db.ChuDe.destroy({ where: { MaCD: req.params.id } });
        req.session.tempData = { successMessage: 'Đã xóa chủ đề!' };
        return res.redirect('/admin/quan-ly/chu-de');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Quản lý thành viên ───────────────────────────────────────────────────────
const getThanhVien = async (req, res) => {
    try {
        let where = {};
        const { search, sort } = req.query;

        let thanhViens = await db.ThanhVien.findAll({
            attributes: ['MaTV', 'TenDangNhap', 'HoTen', 'Email', 'NgayThamGia',
                'GioiTinh', 'AnhDaiDien', 'NgaySinh', 'MatKhau', 'TrangThai'],
        });

        if (search) {
            thanhViens = thanhViens.filter(tv =>
                tv.TenDangNhap && tv.TenDangNhap.toLowerCase().includes(search.toLowerCase())
            );
        }

        switch (sort) {
            case 'namez-a': thanhViens.sort((a, b) => b.TenDangNhap.localeCompare(a.TenDangNhap)); break;
            case 'datenew': thanhViens.sort((a, b) => new Date(b.NgayThamGia) - new Date(a.NgayThamGia)); break;
            case 'dateold': thanhViens.sort((a, b) => new Date(a.NgayThamGia) - new Date(b.NgayThamGia)); break;
            default: thanhViens.sort((a, b) => a.TenDangNhap.localeCompare(b.TenDangNhap)); break;
        }

        res.render('Admin/QuanLyThanhVien', {
            thanhViens,
            searchInput: search || '',
            sortOrder: sort || '',
        });
    } catch (error) {
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

// Khóa tài khoản: set TrangThai = false
const khoaThanhVien = async (req, res) => {
    try {
        await db.ThanhVien.update({ TrangThai: false }, { where: { MaTV: req.params.id } });
        req.session.tempData = { successMessage: 'Đã khóa tài khoản!' };
        return res.redirect('/admin/quan-ly-thanh-vien');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// Mở khóa tài khoản: set TrangThai = true
const moKhoaThanhVien = async (req, res) => {
    try {
        const thanhVien = await db.ThanhVien.findOne({ where: { MaTV: req.params.id } });
        if (!thanhVien) return res.status(404).send('Không tìm thấy thành viên!');

        await db.ThanhVien.update({ TrangThai: true }, { where: { MaTV: req.params.id } });

        // Gửi thông báo mở khóa cho thành viên
        const maTB = await generateMaTB();
        await db.ThongBao.create({
            MaTB: maTB,
            NoiDung: `<NoiDung>Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập bình thường.</NoiDung>`,
            NgayTB: new Date(),
            LoaiTB: 'Mở khóa tài khoản',
            MaTV: req.params.id,
            MaQTV: null,
            MaDoiTuong: null,
            LoaiDoiTuong: null,
            TrangThai: false,
        });

        req.session.tempData = { successMessage: 'Đã mở khóa tài khoản!' };
        return res.redirect('/admin/quan-ly-thanh-vien');
    } catch (error) {
        res.status(500).send('Lỗi: ' + error.message);
    }
};

// ─── Thông báo tổng ───────────────────────────────────────────────────────────
const getThongBaoTong = async (req, res) => {
    try {
        const loaiCDs = await db.LoaiCD.findAll();
        res.render('Admin/ThongBaoTong', { loaiCDs });
    } catch (error) {
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const postThongBaoTong = async (req, res) => {
    const { NoiDung } = req.body;

    if (!NoiDung || !NoiDung.trim()) {
        req.session.tempData = { errorMessage: 'Nội dung không được rỗng!' };
        return res.redirect('/admin/thong-bao-tong');
    }

    try {
        const thanhViens = await db.ThanhVien.findAll({ attributes: ['MaTV'] });

        // Lấy số TB cuối cùng một lần rồi tăng dần
        const last = await db.ThongBao.findOne({ order: [['MaTB', 'DESC']] });
        let counter = last ? parseInt(last.MaTB.substring(2)) + 1 : 1;

        await Promise.all(thanhViens.map(tv => {
            const maTB = 'TB' + (counter++).toString().padStart(3, '0');
            return db.ThongBao.create({
                MaTB: maTB,
                NoiDung: `<NoiDung>${NoiDung.trim()}</NoiDung>`,
                NgayTB: new Date(),
                LoaiTB: 'Thông báo hệ thống',
                MaTV: tv.MaTV,
                MaQTV: null,
                MaDoiTuong: null,
                LoaiDoiTuong: null,
                TrangThai: false,
            });
        }));

        req.session.tempData = { successMessage: `Đã gửi thông báo đến ${thanhViens.length} thành viên!` };
        return res.redirect('/admin/thong-bao-tong');
    } catch (error) {
        console.error('postThongBaoTong error:', error);
        res.status(500).send('Lỗi: ' + error.message);
    }
};

export default {
    getDuyetBai,
    getChiTietBV,
    postDuyetBai,
    tuChoiBai,
    xoaBVBL,
    getGopY,
    danhDauGopY,
    getLoaiChuDe,
    themLoaiChuDe,
    suaLoaiChuDe,
    xoaLoaiChuDe,
    getChuDe,
    themChuDe,
    suaChuDe,
    xoaChuDe,
    getThanhVien,
    khoaThanhVien,
    moKhoaThanhVien,
    getThongBaoTong,
    postThongBaoTong,
};