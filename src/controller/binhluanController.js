import db from '../models/models/index';
import { buildXmlContent } from '../service/helperService.js';

// Helper sinh MaTB
const generateMaTB = async () => {
    const last = await db.ThongBao.findOne({ order: [['MaTB', 'DESC']] });
    if (!last) return 'TB001';
    const num = parseInt(last.MaTB.substring(2)) + 1;
    return 'TB' + num.toString().padStart(3, '0');
};

// ─── Thêm bình luận ───────────────────────────────────────────────────────────
const themBinhLuan = async (req, res) => {
    const { MaBV, IDCha, NoiDung, CodeContent } = req.body;
    const userId = req.session.userId;
    const adminId = req.session.adminId;

    if (!NoiDung || !NoiDung.trim()) {
        req.session.tempData = { errorMessage: 'Nội dung bình luận không được để trống!' };
        return res.redirect(`/bai-viet/${MaBV}`);
    }

    try {
        // Sinh MaBL mới dạng BL001, BL002...
        const lastBL = await db.BinhLuan.findOne({ order: [['MaBL', 'DESC']] });
        let newMaBL = 'BL001';
        if (lastBL) {
            const num = parseInt(lastBL.MaBL.substring(2)) + 1;
            newMaBL = 'BL' + num.toString().padStart(3, '0');
        }

        const noiDungXML = buildXmlContent(NoiDung, CodeContent);

        await db.BinhLuan.create({
            MaBL: newMaBL,
            NoiDung: noiDungXML,
            IDCha: IDCha || null,
            MaBV,
            MaTV: userId || null,
            MaQTV: adminId || null,
            NgayGui: new Date(),
            TrangThai: 'Hiển thị',              // ← khớp DB ('Hiển thị' thay vì 'DaDuyet')
        });

        // Thông báo cho chủ bài viết
        const baiViet = await db.BaiViet.findOne({ where: { MaBV } });
        if (baiViet) {
            const nguoiBinhLuan = userId
                ? await db.ThanhVien.findOne({ where: { MaTV: userId }, attributes: ['TenDangNhap'] })
                : await db.QuanTriVien.findOne({ where: { MaQTV: adminId }, attributes: ['TenDangNhap'] });

            const tenNguoiBL = nguoiBinhLuan?.TenDangNhap || 'Ai đó';
            const tieuDeBV = baiViet.TieuDeBV;

            // Thông báo cho chủ bài viết (nếu không phải tự bình luận)
            const chuBaiTv = baiViet.MaTV && baiViet.MaTV !== userId;
            const chuBaiQtv = baiViet.MaQTV && baiViet.MaQTV !== adminId;

            if (chuBaiTv || chuBaiQtv) {
                const maTB = await generateMaTB();
                await db.ThongBao.create({
                    MaTB: maTB,
                    NoiDung: `<NoiDung>Bài viết '${tieuDeBV}' của bạn vừa có bình luận mới từ ${tenNguoiBL}.</NoiDung>`,
                    NgayTB: new Date(),
                    LoaiTB: 'Bình luận',
                    MaTV: baiViet.MaTV || null,
                    MaQTV: baiViet.MaQTV || null,
                    MaDoiTuong: newMaBL,
                    LoaiDoiTuong: 'BinhLuan',
                    TrangThai: false,
                });
            }

            // Nếu là reply, thông báo cho người bị reply
            if (IDCha) {
                const blCha = await db.BinhLuan.findOne({ where: { MaBL: IDCha } });
                if (blCha && blCha.MaTV && blCha.MaTV !== userId) {
                    const maTB2 = await generateMaTB();
                    await db.ThongBao.create({
                        MaTB: maTB2,
                        NoiDung: `<NoiDung>Bình luận của bạn ở bài viết '${tieuDeBV}' đã có phản hồi mới.</NoiDung>`,
                        NgayTB: new Date(),
                        LoaiTB: 'Bình luận',
                        MaTV: blCha.MaTV,
                        MaQTV: null,
                        MaDoiTuong: newMaBL,
                        LoaiDoiTuong: 'BinhLuan',
                        TrangThai: false,
                    });
                }
            }
        }

        return res.redirect(`/bai-viet/${MaBV}`);
    } catch (error) {
        console.error('themBinhLuan error:', error);
        req.session.tempData = { errorMessage: 'Đã xảy ra lỗi khi gửi bình luận!' };
        return res.redirect(`/bai-viet/${MaBV}`);
    }
};

// ─── Tố cáo ───────────────────────────────────────────────────────────────────
const luuLyDoToCao = async (req, res) => {
    const { IdDoiTuong, LyDoToCao } = req.body;

    try {
        const admins = await db.QuanTriVien.findAll({ attributes: ['MaQTV'] });
        const last = await db.ThongBao.findOne({ order: [['MaTB', 'DESC']] });
        let counter = last ? parseInt(last.MaTB.substring(2)) + 1 : 1;

        await Promise.all(admins.map(admin => {
            const maTB = 'TB' + (counter++).toString().padStart(3, '0');
            return db.ThongBao.create({
                MaTB: maTB,
                NoiDung: `<NoiDung>Tố cáo nội dung #${IdDoiTuong}: ${LyDoToCao}</NoiDung>`,
                NgayTB: new Date(),
                LoaiTB: 'Tố cáo',
                MaQTV: admin.MaQTV,
                MaTV: null,
                MaDoiTuong: IdDoiTuong,
                LoaiDoiTuong: 'NoiDung',
                TrangThai: false,
            });
        }));

        return res.json({ success: true, message: 'Tố cáo đã được ghi nhận!' });
    } catch (error) {
        console.error('luuLyDoToCao error:', error);
        return res.json({ success: false, message: 'Đã xảy ra lỗi!' });
    }
};

export default { themBinhLuan, luuLyDoToCao };