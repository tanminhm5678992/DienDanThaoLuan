import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import db from '../models/models/index';

// ─── Multer config ────────────────────────────────────────────────────────────
const UPLOAD_DIR = './src/public/Images';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `img_${Date.now()}${ext}`);
    },
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Chỉ chấp nhận file ảnh .jpg, .jpeg, .png, .gif, .webp'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const getUserFromSession = async (req) => {
    if (req.session.adminId) {
        return {
            user: await db.QuanTriVien.findOne({ where: { MaQTV: req.session.adminId } }),
            isAdmin: true,
        };
    }
    return {
        user: await db.ThanhVien.findOne({ where: { MaTV: req.session.userId } }),
        isAdmin: false,
    };
};

const deleteOldFile = (filename, defaultPrefixes = ['default']) => {
    if (!filename) return;
    const isDefault = defaultPrefixes.some(p => filename.startsWith(p));
    if (isDefault) return;
    const oldPath = path.join('./src/public/Images', filename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
};

// ─── Controllers ─────────────────────────────────────────────────────────────
const index = async (req, res) => {
    try {
        const { user, isAdmin } = await getUserFromSession(req);
        if (!user) { req.session.destroy(); return res.redirect('/account/login'); }
        const viewName = isAdmin ? 'UserInfo/AdminInfo' : 'UserInfo/MemberInfo';
        return res.render(viewName, { user, isAdmin });
    } catch (error) {
        console.error('userInfo index error:', error);
        res.status(500).send('Đã xảy ra lỗi!');
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    try {
        const { user } = await getUserFromSession(req);
        if (!user) { req.session.destroy(); return res.redirect('/account/login'); }

        if (!bcrypt.compareSync(currentPassword, user.MatKhau)) {
            req.session.tempData = { errorMessage: 'Mật khẩu hiện tại không đúng!' };
            return res.redirect('/user-info');
        }
        if (newPassword.length < 8) {
            req.session.tempData = { errorMessage: 'Mật khẩu phải có độ dài ít nhất 8 ký tự!' };
            return res.redirect('/user-info');
        }
        if (newPassword !== confirmPassword) {
            req.session.tempData = { errorMessage: 'Mật khẩu mới và xác nhận không khớp!' };
            return res.redirect('/user-info');
        }

        const salt = bcrypt.genSaltSync(10);
        user.MatKhau = bcrypt.hashSync(newPassword, salt);
        await user.save();

        req.session.tempData = { successMessage: 'Đổi mật khẩu thành công!' };
        return res.redirect('/user-info');
    } catch (error) {
        console.error('changePassword error:', error);
        req.session.tempData = { errorMessage: 'Đã xảy ra lỗi, vui lòng thử lại!' };
        return res.redirect('/user-info');
    }
};

// ─── Helper đổi ảnh (dùng cho cả avatar và ảnh bìa) ─────────────────────────
const _doChangeImage = async (req, res, fieldName) => {
    if (!req.file) {
        req.session.tempData = { errorMessage: 'Vui lòng chọn file ảnh!' };
        return res.redirect('/user-info');
    }

    try {
        const { user, isAdmin } = await getUserFromSession(req);
        if (!user) {
            fs.unlinkSync(req.file.path);
            req.session.destroy();
            return res.redirect('/account/login');
        }

        // Xóa ảnh cũ
        deleteOldFile(user[fieldName]);

        // Dùng tên file multer sinh ra (img_timestamp.ext), tối đa ~20 ký tự, khớp varchar(50)
        const fileName = req.file.filename;
        user[fieldName] = fileName;
        await user.save();

        req.session.tempData = { successMessage: `Cập nhật ảnh thành công!` };
        return res.redirect('/user-info');
    } catch (error) {
        console.error(`_doChangeImage(${fieldName}) error:`, error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        req.session.tempData = { errorMessage: 'Đã xảy ra lỗi, vui lòng thử lại!' };
        return res.redirect('/user-info');
    }
};

const changeAvatar = (req, res) => _doChangeImage(req, res, 'AnhDaiDien');
const changeCover = (req, res) => _doChangeImage(req, res, 'AnhBia');

// ─── Cập nhật thông tin ───────────────────────────────────────────────────────
const updateInfo = async (req, res) => {
    const { hoTen, email, sdt, gioiTinh, ngaySinh, HoTen, Email, SDT, GioiTinh, NgaySinh } = req.body;
    // Hỗ trợ cả camelCase (cũ) và PascalCase (form mới)
    const _hoTen = HoTen || hoTen;
    const _email = Email || email;
    const _sdt = SDT !== undefined ? SDT : sdt;
    const _gioiTinh = GioiTinh || gioiTinh;
    const _ngaySinh = NgaySinh || ngaySinh;

    try {
        const { user } = await getUserFromSession(req);
        if (!user) { req.session.destroy(); return res.redirect('/account/login'); }

        if (_email !== undefined && _email !== user.Email) {
            const emailExisted = await db.ThanhVien.findOne({ where: { Email: _email } });
            if (emailExisted) {
                req.session.tempData = { errorMessage: 'Email này đã được sử dụng bởi tài khoản khác!' };
                return res.redirect('/user-info');
            }
        }

        // Dùng !== undefined để cho phép xóa giá trị (gửi chuỗi rỗng)
        if (_hoTen !== undefined) user.HoTen = _hoTen;
        if (_email !== undefined) user.Email = _email;
        if (_sdt !== undefined) user.SDT = _sdt;
        if (_gioiTinh !== undefined) user.GioiTinh = _gioiTinh;
        if (_ngaySinh !== undefined) user.NgaySinh = _ngaySinh || null;
        await user.save();

        req.session.tempData = { successMessage: 'Cập nhật thông tin thành công!' };
        return res.redirect('/user-info');
    } catch (error) {
        console.error('updateInfo error:', error);
        req.session.tempData = { errorMessage: 'Đã xảy ra lỗi, vui lòng thử lại!' };
        return res.redirect('/user-info');
    }
};

export default {
    index,
    changePassword,
    changeAvatar,
    changeCover,
    updateInfo,
    upload,
};