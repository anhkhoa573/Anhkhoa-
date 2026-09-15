const express = require('express');
const path = require('path');
const luamin = require('luamin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Bộ nhớ tạm thời lưu code mã hóa phục vụ tính năng sinh link Raw cho Executor
const rawStorage = {};

function encryptStringToHex(str) {
    return str.split('').map(char => '\\' + char.charCodeAt(0)).join('');
}

function applyVipProtection(sourceCode, antiDump, antiPrint) {
    try {
        // Nén code thô bằng luamin để tối ưu hóa hiệu năng trước khi khóa
        const minifiedRaw = luamin.minify(sourceCode);
        
        // Tiến hành băm toàn bộ mã nguồn thành dạng chuỗi Hex kín
        const encryptedHexCode = encryptStringToHex(minifiedRaw);

        let protectionHeaders = `-- [[ ANHKHOA LUA HIGH-END PROTECTION V3.5 ]] \nlocal _M = "${encryptedHexCode}"\nlocal _G = getfenv and getfenv() or _G\n`;

        if (antiPrint) {
            protectionHeaders += `_G.print = function() _G.error("Hanh vi xam pham file qua print da bi chan!", 0) end\n`;
        }

        if (antiDump) {
            protectionHeaders += `if _G.debug or not _G.pairs or _G.print == nil then _G.error("Phat hien thiet bi do tham RAM! Tu huy.", 0) end\n_G.debug = nil\n_G.setfenv = nil\n_G.getfenv = nil\n`;
        }

        const finalTemplate = protectionHeaders + `local run = _G.loadstring or _G.load\nif run then run(_M)() else _G.error("Environment not support execute!", 0) end`;
        return finalTemplate;
    } catch (e) {
        throw new Error("Cú pháp mã Lua bị lỗi, hãy kiểm tra lại cấu trúc code gốc!");
    }
}

// API Xử lý mã hóa chính
app.post('/api/obfuscate', (req, res) => {
    const { code, antiDump, antiPrint } = req.body;
    if (!code) return res.status(400).json({ error: 'Không nhận được mã nguồn!' });

    try {
        const protectedCode = applyVipProtection(code, antiDump, antiPrint);
        
        // Tạo một mã định danh ID ngẫu nhiên cho file để làm đường dẫn Raw
        const rawId = 'script_' + Math.random().toString(36).substring(2, 10);
        rawStorage[rawId] = protectedCode;

        res.json({ 
            result: protectedCode,
            rawId: rawId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Xuất code Raw thuần túy cho Delta, Fluxus đọc trực tiếp
app.get('/raw/:id', (req, res) => {
    const scriptCode = rawStorage[req.params.id];
    if (!scriptCode) {
        return res.status(404).send('-- [LỖI] Script không tồn tại hoặc đã hết hạn trên hệ thống!');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(scriptCode);
});

app.listen(PORT, () => console.log(`Hệ thống VIP đang chạy tại cổng: ${PORT}`));
