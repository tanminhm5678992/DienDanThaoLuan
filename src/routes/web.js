import express from 'express';
import dienDanController from '../controller/dienDanController.js';
import accountController from '../controller/accountController.js';
import userInfoController from '../controller/userInfoController.js';
import codeController from '../controller/codeController.js';
import adminController from '../controller/adminController.js';
import binhLuanController from '../controller/binhluanController.js';
import { requireAuth, requireMember, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── Account ──────────────────────────────────────────────────────────────────
router.get('/account/login', accountController.getLogin);
router.post('/account/login', accountController.postLogin);
router.get('/account/logout', accountController.logout);
router.get('/account/register', accountController.getRegister);
router.post('/account/register', accountController.postRegister);
router.get('/account/forgot-password', accountController.getForgotPassword);
router.post('/account/forgot-password', accountController.postForgotPassword);

// ─── Code ─────────────────────────────────────────────────────────────────────
router.get('/code/execution-result', codeController.getExecutionResult);
router.post('/code/execute', codeController.executeCode);
router.post('/code/execute-html', codeController.executeAndDisplayHtml);

// ─── Diễn đàn (public) ───────────────────────────────────────────────────────
router.get('/', dienDanController.index);
router.get('/bai-viet-moi', dienDanController.baiVietMoi);
router.get('/loc', dienDanController.locBaiViet);
router.get('/chu-de/:maLoai', dienDanController.chuDeTheoLoai);
router.get('/bai-viet-theo-chu-de/:MaCD', dienDanController.baiVietTheoCD);
router.get('/bai-viet/:MaBV', dienDanController.noiDungBaiViet);
router.get('/thong-tin/:id', dienDanController.thongTinNguoiDung);

// ─── Diễn đàn (thành viên) ───────────────────────────────────────────────────
router.get('/them-bai-viet', requireMember, dienDanController.getThemBV);
router.post('/them-bai-viet', requireMember, dienDanController.postThemBV);
router.get('/bai-viet-cua-toi', requireMember, dienDanController.baiVietCuaToi);
router.get('/chinh-sua/:maBV', requireMember, dienDanController.getChinhSuaBV);
router.post('/chinh-sua/:maBV', requireMember, dienDanController.postChinhSuaBV);
router.post('/xoa-bai-viet/:maBV', requireMember, dienDanController.xoaBaiViet);

router.get('/gop-y', requireMember, dienDanController.getGopY);
router.post('/gop-y', requireMember, dienDanController.postGopY);
router.get('/thong-bao', requireAuth, dienDanController.thongBao);
router.get('/mark-as-read/:maTB', requireAuth, dienDanController.markAsRead);
router.post('/xoa-thong-bao', requireAuth, dienDanController.xoaThongBao);

// ─── Bình luận ────────────────────────────────────────────────────────────────
router.post('/dien-dan/them-binh-luan', requireAuth, binhLuanController.themBinhLuan);
router.post('/dien-dan/luu-ly-do-to-cao', requireAuth, binhLuanController.luuLyDoToCao);

// ─── Upload ảnh (TinyMCE) ─────────────────────────────────────────────────────
router.post('/dien-dan/upload', requireAuth, ...dienDanController.uploadAnh);

// ─── User Info ────────────────────────────────────────────────────────────────
router.get('/user-info', requireAuth, userInfoController.index);
router.post('/user-info/change-password', requireAuth, userInfoController.changePassword);
router.post('/user-info/change-avatar', requireAuth, userInfoController.upload.single('avatar'), userInfoController.changeAvatar);
router.post('/user-info/change-cover', requireAuth, userInfoController.upload.single('cover'), userInfoController.changeCover);
router.post('/user-info/update-info', requireAuth, userInfoController.updateInfo);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/duyet-bai', requireAdmin, adminController.getDuyetBai);
router.get('/admin/chi-tiet-bai/:maBV', requireAdmin, adminController.getChiTietBV);     // ← MỚI
router.post('/admin/duyet-bai/:maBV', requireAdmin, adminController.postDuyetBai);
router.post('/admin/tu-choi-bai/:maBV', requireAdmin, adminController.tuChoiBai);
router.post('/admin/xoa-bv-bl', requireAdmin, adminController.xoaBVBL);

router.get('/admin/gop-y', requireAdmin, adminController.getGopY);
router.post('/admin/gop-y/da-xu-ly/:id', requireAdmin, adminController.danhDauGopY);

router.get('/admin/quan-ly/loai-chu-de', requireAdmin, adminController.getLoaiChuDe);
router.post('/admin/quan-ly/loai-chu-de/them', requireAdmin, adminController.themLoaiChuDe);
router.post('/admin/quan-ly/loai-chu-de/sua/:id', requireAdmin, adminController.suaLoaiChuDe);  // ← MỚI
router.post('/admin/quan-ly/loai-chu-de/xoa/:id', requireAdmin, adminController.xoaLoaiChuDe);

router.get('/admin/quan-ly/chu-de', requireAdmin, adminController.getChuDe);
router.post('/admin/quan-ly/chu-de/them', requireAdmin, adminController.themChuDe);
router.post('/admin/quan-ly/chu-de/sua/:id', requireAdmin, adminController.suaChuDe);           // ← MỚI
router.post('/admin/quan-ly/chu-de/xoa/:id', requireAdmin, adminController.xoaChuDe);

router.get('/admin/quan-ly-thanh-vien', requireAdmin, adminController.getThanhVien);
router.post('/admin/khoa-thanh-vien/:id', requireAdmin, adminController.khoaThanhVien);
router.post('/admin/mo-khoa-thanh-vien/:id', requireAdmin, adminController.moKhoaThanhVien);

router.get('/admin/thong-bao-tong', requireAdmin, adminController.getThongBaoTong);
router.post('/admin/thong-bao-tong', requireAdmin, adminController.postThongBaoTong);

const initWebRoute = (app) => {
    app.use('/', router);
};

export default initWebRoute;