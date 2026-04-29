import { XMLParser } from 'fast-xml-parser';

/**
 * Đóng gói nội dung thành XML.
 * noiDung được wrap trong CDATA để tránh lỗi khi chứa HTML (<p>, <strong>, &, v.v.)
 */
export function buildXmlContent(noiDung, codeContent) {
    const safeND = noiDung || '';
    if (codeContent && codeContent.trim()) {
        return `<NoiDung><![CDATA[${safeND}]]><Code><![CDATA[${codeContent}]]></Code></NoiDung>`;
    }
    return `<NoiDung><![CDATA[${safeND}]]></NoiDung>`;
}

/**
 * Phân tích XML nội dung bài viết / bình luận.
 * Xử lý 3 trường hợp:
 *   1. XML hợp lệ có CDATA (format mới)
 *   2. XML hợp lệ không có CDATA (format cũ trong DB)
 *   3. XML bị hỏng hoặc không phải XML → trả về nguyên chuỗi
 */
export function parseXmlContent(xmlString) {
    if (!xmlString) return { noiDungVanBan: '', codeContent: '' };

    // Nếu không có thẻ XML thì trả về nguyên chuỗi (plain text cũ)
    if (!xmlString.trim().startsWith('<')) {
        return { noiDungVanBan: xmlString, codeContent: '' };
    }

    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            cdataPropName: '__cdata',
            // Cho phép nhiều CDATA node trong cùng 1 element
            isArray: () => false,
        });
        const jsonObj = parser.parse(xmlString);
        const root = jsonObj?.NoiDung;

        // root là object → có chứa Code (có thể kèm __cdata cho noiDung)
        if (typeof root === 'object' && root !== null) {
            const codeContent = root.Code?.__cdata ?? root.Code ?? '';
            // noiDung nằm trong __cdata hoặc #text
            const noiDungVanBan = root.__cdata ?? root['#text'] ?? '';
            return {
                noiDungVanBan: String(noiDungVanBan),
                codeContent: String(codeContent),
            };
        }

        // root là string thuần (NoiDung chỉ có text, không có Code)
        return { noiDungVanBan: String(root ?? ''), codeContent: '' };

    } catch (err) {
        console.error('parseXmlContent error:', err.message);
        // Fallback: cố strip thẻ XML bằng regex để lấy nội dung bên trong
        const match = xmlString.match(/<NoiDung[^>]*>([\s\S]*?)<\/NoiDung>/i);
        if (match) {
            // Xóa thẻ <Code>...</Code> nếu có
            const inner = match[1].replace(/<Code[\s\S]*?<\/Code>/gi, '').trim();
            return { noiDungVanBan: inner, codeContent: '' };
        }
        return { noiDungVanBan: xmlString, codeContent: '' };
    }
}