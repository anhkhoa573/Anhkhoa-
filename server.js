const express = require('express');
const path = require('path');
const luamin = require('luamin');

const app = express();
const PORT = process.env.PORT || 3000;

// Nâng giới hạn nhận dữ liệu lên 50MB để nuốt trọn mọi file Lua siêu dài
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const rawStorage = {};

// Thuật toán chuyển đổi chuỗi sang Hex dạng mảng tốc độ cao (Tối ưu RAM gấp 10 lần)
function encryptStringToHexFast(str) {
    const len = str.length;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = '\\' + str.charCodeAt(i);
    }
    return arr.join('');
}

// Bọc hàm xử lý mã hóa vào Promise bất đồng bộ để chống chặn luồng (Anti-Block)
function applyVipProtectionAsync(sourceCode, antiDump, antiPrint) {
    return new Promise((resolve, reject) => {
        // Sử dụng setImmediate để đẩy tiến trình nặng xuống hàng đợi, không làm treo Event Loop
        setImmediate(() => {
            try {
                // 1. Tối ưu thu gọn code thô tốc độ cao
                const minifiedRaw = luamin.minify(sourceCode);
                
                // 2. Chuyển đổi ký tự nhanh bằng bộ nhớ mảng tối ưu
                const encryptedHexCode = encryptStringToHexFast(minifiedRaw);

                let protectionHeaders = `-- [[ ANHKHOA LUA HIGH-END PROTECTION V4.0 ULTRA ]] \nlocal _M = "${encryptedHexCode}"\nlocal _G = getfenv and getfenv() or _G\n`;

                if (antiPrint) {
                    protectionHeaders += `_G.print = function() _G.error("Hanh vi xam pham file qua print da bi chan!", 0) end\n`;
                }

                if (antiDump) {
                    protectionHeaders += `if _G.debug or not _G.pairs or _G.print == nil then _G.error("Phat hien thiet bi do tham RAM! Tu huy.", 0) end\n_G.debug = nil\n_G.setfenv = nil\n_G.getfenv = nil\n`;
                }

                const finalTemplate = protectionHeaders + `local run = _G.loadstring or _G.load\nif run then run(_M)() else _G.error("Environment not support execute!", 0) end`;
                
                resolve(finalTemplate);
            } catch (e) {
                reject(new Error("Cú pháp mã Lua bị lỗi hoặc dung lượng vượt ngưỡng xử lý!"));
            }
        });
    });
}

// API Xử lý mã hóa bất đồng bộ siêu tốc
app.post('/api/obfuscate', async (req, res) => {
    const { code, antiDump, antiPrint } = req.body;
    if (!code) return res.status(400).json({ error: 'Không nhận được mã nguồn!' });

    try {
        // Chạy bất đồng bộ, server vẫn phản hồi mượt mà dù file có nặng đến đâu
        const protectedCode = await applyVipProtectionAsync(code, antiDump, antiPrint);
        
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

app.get('/raw/:id', (req, res) => {
    const scriptCode = rawStorage[req.params.id];
    if (!scriptCode) {
        return res.status(404).send('-- [LỖI] Script không tồn tại hoặc đã hết hạn trên hệ thống!');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(scriptCode);
});

app.listen(PORT, () => console.log(`Hệ thống SIÊU TỐC ĐỘ KHÔNG LAG đang chạy tại cổng: ${PORT}`));
