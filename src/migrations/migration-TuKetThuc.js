'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TuKetThucs', {
      id: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.STRING
      },


      idTuBatDau: {
        type: Sequelize.STRING
      },
      label: {
        type: Sequelize.STRING
      },
      stt: {
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.STRING
      },
      lost: {
        type: Sequelize.INTEGER
      },


      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TuKetThucs');
  }
};