'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class AiWeights extends Model {
        static associate(models) {
            // define association here

        }
    }
    AiWeights.init(
        {
            tuBatDau: DataTypes.STRING,
            tuKetThuc: DataTypes.STRING,
            qValue: DataTypes.FLOAT
        },
        {
            sequelize,
            modelName: 'AiWeights',
        }
    );
    return AiWeights;
};
