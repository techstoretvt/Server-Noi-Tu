'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'TuKetThucs',
      'canWin',
      {
          type: Sequelize.STRING,
          defaultValue: "false"
      },
  );
  },
  async down(queryInterface, Sequelize) {
    // await queryInterface.dropTable('TuKetThucs');
  }
};