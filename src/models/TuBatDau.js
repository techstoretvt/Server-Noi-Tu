'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class TuBatDau extends Model {
        static associate(models) {
            // define association here
            TuBatDau.hasMany(models.TuKetThucs, { foreignKey: 'idTuBatDau' });
        }
    }
    TuBatDau.init(
        {
            label: DataTypes.STRING


        },
        {
            sequelize,
            modelName: 'TuBatDaus',
        }
    );
    return TuBatDau;
};
