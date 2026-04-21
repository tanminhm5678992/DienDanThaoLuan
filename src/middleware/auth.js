const requireAuth = (req, res, next) => {
    if (req.session.userId || req.session.adminId) {
        return next();
    }
    return res.redirect('/account/login');
};

const requireAdmin = (req, res, next) => {
    if (req.session.adminId) {
        return next();
    }
    return res.redirect('/');
};

const requireMember = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    return res.redirect('/account/login');
};

export { requireAuth, requireAdmin, requireMember };
export default requireAuth;