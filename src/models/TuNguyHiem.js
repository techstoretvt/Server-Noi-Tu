'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class TuNguyHiem extends Model {
        static associate(models) {
            // define association here

        }
    }
    TuNguyHiem.init(
        {
            tuBatDau: DataTypes.STRING,
            tuKetThuc: DataTypes.STRING,
        },
        {
            sequelize,
            modelName: 'TuNguyHiems',
        }
    );
    return TuNguyHiem;
};
