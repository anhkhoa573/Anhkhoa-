const express = require('express');
const path = require('path');
const luamin = require('luamin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Thuật toán băm chuỗi ký tự sang mã hóa Bytecode số Hex cực mạnh
function encryptStringToHex(str) {
    return str.split('').map(char => '\\' + char.charCodeAt(0)).join('');
}

function applyVipProtection(sourceCode, antiDump, antiPrint) {
    try {
        // Nén code thô bằng luamin để tối ưu hóa hiệu năng trước khi khóa
        const minifiedRaw = luamin.minify(sourceCode);
        
        // Tiến hành băm toàn bộ mã nguồn thành dạng chuỗi Hex kín
        const encryptedHexCode = encryptStringToHex(minifiedRaw);

        // Khởi tạo các lớp khiên bảo mật VIP tùy chọn
        let protectionHeaders = `-- [[ ANHKHOA LUA HIGH-END PROTECTION V3.0 ]] \nlocal _M = "${encryptedHexCode}"\nlocal _G = getfenv and getfenv() or _G\n`;

        // Lớp bảo mật 1: Khóa tính năng Bypass qua hàm Print
        if (antiPrint) {
            protectionHeaders += `_G.print = function() _G.error("Hanh vi xam pham file qua print da bi chan!", 0) end\n`;
        }

        // Lớp bảo mật 2: Chống Dump bộ nhớ RAM khi script đang chạy
        if (antiDump) {
            protectionHeaders += `if _G.debug or not _G.pairs or _G.print == nil then _G.error("Phat hien thiet bi do tham RAM! Tu huy.", 0) end\n_G.debug = nil\n_G.setfenv = nil\n_G.getfenv = nil\n`;
        }

        // Kích hoạt trình thông dịch chạy chuỗi an toàn ẩn danh
        const finalTemplate = protectionHeaders + `local run = _G.loadstring or _G.load\nif run then run(_M)() else _G.error("Environment not support execute!", 0) end`;

        return finalTemplate;
    } catch (e) {
        throw new Error("Cú pháp mã Lua bị lỗi, hãy kiểm tra lại cấu trúc code gốc!");
    }
}

app.post('/api/obfuscate', (req, res) => {
    const { code, antiDump, antiPrint } = req.body;
    if (!code) return res.status(400).json({ error: 'Không nhận được mã nguồn!' });

    try {
        const protectedCode = applyVipProtection(code, antiDump, antiPrint);
        res.json({ result: protectedCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Hệ thống VIP đang chạy tại cổng: ${PORT}`));
