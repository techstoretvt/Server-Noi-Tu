'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class TuKetThuc extends Model {
        static associate(models) {
            // define association here

        }
    }
    TuKetThuc.init(
        {
            idTuBatDau: DataTypes.STRING,
            label: DataTypes.STRING,
            stt: DataTypes.INTEGER,
            type: DataTypes.STRING, //normal, warning, die

        },
        {
            sequelize,
            modelName: 'TuKetThucs',
        }
    );
    return TuKetThuc;
};
