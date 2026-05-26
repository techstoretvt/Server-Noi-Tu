const fs = require('fs');
const db = require('../models');
require("dotenv").config();

const exportDataForPython = async () => {
    // Lấy tất cả từ bắt đầu và các từ kết thúc của chúng
    const tatCaTuBatDau = await db.TuBatDaus.findAll({ raw: true });

    let dictionary = {};

    for (let tu of tatCaTuBatDau) {
        const labelBatDau = tu.label.toLowerCase();

        // Tìm các từ kết thúc liên kết qua khóa ngoại idTuBatDau
        const cacTuKetThuc = await db.TuKetThucs.findAll({
            where: { idTuBatDau: tu.id },
            raw: true
        });

        // Chỉ lấy những label hợp lệ
        const listKetThuc = cacTuKetThuc.map(item => item.label.toLowerCase());

        if (listKetThuc.length > 0) {
            dictionary[labelBatDau] = listKetThuc;
        }
    }

    // Ghi ra file JSON sạch
    fs.writeFileSync('./data_for_ai.json', JSON.stringify(dictionary, null, 2), 'utf-8');
    console.log("Đã xuất dữ liệu thành công ra file data_for_ai.json!");
};
exportDataForPython();