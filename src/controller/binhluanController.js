import db from '../models/models/index';
import { buildXmlContent } from '../service/helperService.js';

// Helper sinh MaTB
const generateMaTB = async () => {
    // Lấy số lớn nhất thay vì sort string (tránh 'TB9' > 'TB10')
    const all = await db.ThongBao.findAll({ attributes: ['MaTB'] });
    let maxNum = 0;
    all.forEach(tb => {
        const n = parseInt((tb.MaTB || '').replace(/^TB0*/i, '') || '0');
        if (n > maxNum) maxNum = n;
    });
    return 'TB' + (maxNum + 1).toString().padStart(3, '0');
};

// ─── Thêm bình luận ───────────────────────────────────────────────────────────
const themBinhLuan = async (req, res) => {
    const { MaBV, IDCha, NoiDung, CodeContent } = req.body;
    // const userId = req.session.userId ? parseInt(req.session.userId) : null;
    // const adminId = req.session.adminId ? parseInt(req.session.adminId) : null;
    const userId = req.session.userId || null;       // ← BỎ parseInt
    const adminId = req.session.adminId || null;
    // const maBVInt = parseInt(MaBV);


    // ← THÊM 3 DÒNG DEBUG NÀY
    console.log('===== DEBUG THEM BINH LUAN =====');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('session:', { userId: req.session.userId, adminId: req.session.adminId });
    console.log('NoiDung received:', NoiDung);
    console.log('NoiDung length:', NoiDung ? NoiDung.length : 'NULL/UNDEFINED');
    console.log('================================');

    // TinyMCE gửi HTML như <p></p> khi trống → strip tag để kiểm tra
    const noiDungText = (NoiDung || '').replace(/<[^>]*>/g, '').trim();
    if (!noiDungText) {
        req.session.tempData = { errorMessage: 'Nội dung bình luận không được để trống!' };
        return res.redirect(`/bai-viet/${MaBV}`);
    }

    try {
        const newMaBL = 'BL' + Date.now();
        const noiDungXML = buildXmlContent(NoiDung, CodeContent);

        console.log('Dữ liệu trước khi create:', {
            NoiDung: noiDungXML.substring(0, 100),
            IDCha: IDCha ? parseInt(IDCha) : null,
            MaBV: MaBV,
            MaTV: userId,
            MaQTV: adminId,
            NgayGui: new Date(),
            TrangThai: 'Đã duyệt',
        });

        // MaBL là INTEGER autoIncrement → KHÔNG tự sinh, để DB tự tăng


        const newBL = await db.BinhLuan.create({
            MaBL: newMaBL,
            NoiDung: noiDungXML,
            IDCha: IDCha ? parseInt(IDCha) : null,
            MaBV: MaBV,
            MaTV: userId,
            MaQTV: adminId,
            NgayGui: new Date(),
            TrangThai: 'Đã duyệt',
        });



        // ── Thông báo cho chủ bài viết ──────────────────────────────────────
        const baiViet = await db.BaiViet.findOne({ where: { MaBV: MaBV } });
        if (baiViet) {
            const nguoiBinhLuan = userId
                ? await db.ThanhVien.findOne({ where: { MaTV: userId }, attributes: ['TenDangNhap'] })
                : await db.QuanTriVien.findOne({ where: { MaQTV: adminId }, attributes: ['TenDangNhap'] });

            const tenNguoiBL = nguoiBinhLuan?.TenDangNhap || 'Ai đó';
            const tieuDeBV = baiViet.TieuDeBV;

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
                    MaDoiTuong: String(newMaBL),
                    LoaiDoiTuong: 'BinhLuan',
                    TrangThai: false,
                });
            }

            // Nếu là reply → thông báo cho người bị reply
            if (IDCha) {
                const blCha = await db.BinhLuan.findOne({ where: { MaBL: parseInt(IDCha) } });
                if (blCha && blCha.MaTV && blCha.MaTV !== userId) {
                    const maTB2 = await generateMaTB();
                    await db.ThongBao.create({
                        MaTB: maTB2,
                        NoiDung: `<NoiDung>Bình luận của bạn ở bài viết '${tieuDeBV}' đã có phản hồi mới.</NoiDung>`,
                        NgayTB: new Date(),
                        LoaiTB: 'Bình luận',
                        MaTV: blCha.MaTV,
                        MaQTV: null,
                        MaDoiTuong: String(newMaBL),
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

        console.error('=== LỖI KHI TẠO BÌNH LUẬN ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('Details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));


        return res.redirect(`/bai-viet/${MaBV}`);
    }
};

// ─── Tố cáo ───────────────────────────────────────────────────────────────────
const luuLyDoToCao = async (req, res) => {
    const { IdDoiTuong, LyDoToCao } = req.body;

    try {
        const admins = await db.QuanTriVien.findAll({ attributes: ['MaQTV'] });
        const allTB = await db.ThongBao.findAll({ attributes: ['MaTB'] });
        let maxTB = 0;
        allTB.forEach(tb => {
            const n = parseInt((tb.MaTB || '').replace(/^TB0*/i, '') || '0');
            if (n > maxTB) maxTB = n;
        });
        let counter = maxTB + 1;

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
        return res.status(500).send('Đã xảy ra lỗi khi gửi tố cáo!'); // Trả về lỗi thay vì redirect
    }
};

export default { themBinhLuan, luuLyDoToCao };