import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import db from '../models/models/index';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createTransporter = () =>
    nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

const generateRandomPassword = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Controllers ─────────────────────────────────────────────────────────────

const getLogin = (req, res) => {
    if (req.session.userId || req.session.adminId) return res.redirect('/');
    res.render('Account/Login', { error: null, errorType: null, TenDangNhap: null });
};

const postLogin = async (req, res) => {
    const { TenDangNhap, MatKhau } = req.body;

    if (!TenDangNhap || !MatKhau) {
        return res.render('Account/Login', {
            error: '*Không được để trống tài khoản hoặc mật khẩu!!!',
            errorType: 'general',
            TenDangNhap,
        });
    }

    try {
        const memberAcc = await db.ThanhVien.findOne({
            where: { TenDangNhap: TenDangNhap },
        });

        if (memberAcc) {
            if (!memberAcc.TrangThai) {
                return res.render('Account/Login', {
                    error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!',
                    errorType: 'locked',
                    TenDangNhap,
                });
            }
            if (!bcrypt.compareSync(MatKhau, memberAcc.MatKhau)) {
                return res.render('Account/Login', {
                    error: 'Sai tên tài khoản hoặc mật khẩu!!',
                    errorType: 'general',
                    TenDangNhap,
                });
            }
            req.session.userId = memberAcc.MaTV;
            return res.redirect('/');
        }

        const adminAcc = await db.QuanTriVien.findOne({
            where: { TenDangNhap: TenDangNhap },
        });

        if (adminAcc) {
            req.session.adminId = adminAcc.MaQTV;
            return res.redirect('/');
        }

        return res.render('Account/Login', {
            error: 'Tài khoản không tồn tại!!',
            errorType: 'general',
            TenDangNhap,
        });
    } catch (error) {
        console.error('postLogin error:', error);
        return res.render('Account/Login', {
            error: 'Đã xảy ra lỗi, vui lòng thử lại!',
            errorType: 'general',
            TenDangNhap,
        });
    }
};

const logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};

const getForgotPassword = (req, res) => {
    res.render('Account/ForgotPassword', { error: null, success: null });
};

const postForgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email!' });
    }

    try {
        const member = await db.ThanhVien.findOne({ where: { Email: email } });

        if (!member) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống!' });
        }

        if (!member.TrangThai) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa!' });
        }

        const newPassword = generateRandomPassword(10);
        const salt = bcrypt.genSaltSync(10);
        member.MatKhau = bcrypt.hashSync(newPassword, salt);
        await member.save();

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"Forum" <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Mật khẩu mới của bạn',
            html: `
                <p>Xin chào <b>${member.HoTen}</b>,</p>
                <p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p>
                <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này.</p>
            `,
        });

        return res.json({ success: true, message: 'Mật khẩu mới đã được gửi đến email của bạn!' });
    } catch (error) {
        console.error('postForgotPassword error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi, vui lòng thử lại!' });
    }
};

const getRegister = (req, res) => {
    res.render('Account/Register', { error: null });
};

const postRegister = async (req, res) => {
    const { TenDangNhap, MatKhau, confirmPassword, HoTen, Email, SDT } = req.body;

    if (!TenDangNhap || !MatKhau || !HoTen || !Email || !SDT) {
        return res.render('Account/Register', { error: 'Vui lòng điền đầy đủ thông tin!' });
    }

    if (MatKhau !== confirmPassword) {
        return res.render('Account/Register', { error: 'Mật khẩu xác nhận không khớp!' });
    }

    if (MatKhau.length < 8) {
        return res.render('Account/Register', { error: 'Mật khẩu phải có ít nhất 8 ký tự!' });
    }

    try {
        const existed = await db.ThanhVien.findOne({ where: { TenDangNhap: TenDangNhap } });
        if (existed) {
            return res.render('Account/Register', { error: 'Tên đăng nhập đã tồn tại!' });
        }

        const emailExisted = await db.ThanhVien.findOne({ where: { Email: Email } });
        if (emailExisted) {
            return res.render('Account/Register', { error: 'Email này đã được sử dụng!' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(MatKhau, salt);

        await db.ThanhVien.create({
            MaTV: 'TV' + Date.now(),
            TenDangNhap: TenDangNhap,
            MatKhau: hashedPassword,
            HoTen: HoTen,
            Email: Email,
            SDT: SDT,
            NgayThamGia: new Date(),
        });

        return res.redirect('/account/login');
    } catch (error) {
        console.error('postRegister error:', error);
        return res.render('Account/Register', { error: 'Đã xảy ra lỗi, vui lòng thử lại!' });
    }
};

export default {
    getLogin,
    postLogin,
    logout,
    getForgotPassword,
    postForgotPassword,
    getRegister,
    postRegister,
};