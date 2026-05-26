'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AiWeights', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tuBatDau: {
        type: Sequelize.STRING, // Ví dụ: "học"
        allowNull: false
      },
      tuKetThuc: {
        type: Sequelize.STRING, // Ví dụ: "sinh"
        allowNull: false
      },
      qValue: {
        type: Sequelize.FLOAT, // Điểm số thông minh (Q-value). Mặc định là 0.
        defaultValue: 0.0
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    // Tạo Index để AI tra cứu cực nhanh khi train hàng triệu ván
    await queryInterface.addIndex('AiWeights', ['tuBatDau', 'tuKetThuc'], { unique: true });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AiWeights');
  }
};