import axiosInstance from './axiosInstance';

// Thực thi code (gửi lên server, server gọi Piston API)
export const thucThiCode = (language, sourceCode, input = '') =>
    axiosInstance.post('/code/execute', new URLSearchParams({
        language,
        sourceCode,
        input,
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

// Hiển thị HTML
export const hienThiHtml = (sourceCode) =>
    axiosInstance.post('/code/execute-html', new URLSearchParams({
        sourceCode,
        language: 'html',
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });