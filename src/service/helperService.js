import { XMLParser } from 'fast-xml-parser';

/**
 * Đóng gói nội dung bài viết thành XML
 * @param {string} noiDung    - Nội dung văn bản
 * @param {string} codeContent - Nội dung code (tuỳ chọn)
 * @returns {string} XML string
 */
export function buildXmlContent(noiDung, codeContent) {
    if (codeContent && codeContent.trim()) {
        return `<NoiDung>${noiDung}<Code><![CDATA[${codeContent}]]></Code></NoiDung>`;
    }
    return `<NoiDung>${noiDung}</NoiDung>`;
}

/**
 * Phân tích XML nội dung bài viết
 * @param {string} xmlString
 * @returns {{ noiDungVanBan: string, codeContent: string }}
 */
export function parseXmlContent(xmlString) {
    if (!xmlString) return { noiDungVanBan: '', codeContent: '' };

    try {
        const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
        const jsonObj = parser.parse(xmlString);

        const root = jsonObj?.NoiDung;

        // Trường hợp NoiDung là object (có chứa Code)
        if (typeof root === 'object' && root !== null) {
            const codeContent = root.Code?.__cdata || root.Code || '';
            // Lấy phần text thuần — loại bỏ key Code
            const { Code, ...rest } = root;
            const noiDungVanBan = rest['#text'] || rest.__cdata || '';
            return { noiDungVanBan: String(noiDungVanBan), codeContent: String(codeContent) };
        }

        // Trường hợp NoiDung là string thuần (không có Code)
        return { noiDungVanBan: String(root || ''), codeContent: '' };
    } catch (err) {
        console.error('parseXmlContent error:', err);
        return { noiDungVanBan: xmlString, codeContent: '' };
    }
}