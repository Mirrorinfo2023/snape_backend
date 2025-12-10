const { connect, config } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');

class ReferralUserReport {
  db = {};

  constructor() {
    this.db = connect();
  }



  async GetRoyalityHistroy(req, res) {
    try {
      const { from_date, to_date } = req.body;

      if (!from_date || !to_date) {
        return res.status(400).json({ status: 400, message: "from_date and to_date are required", data: [] });
      }

      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      endDate.setHours(23, 59, 59);

      // 🟢 Today's date range
      const today = new Date();
      const currentFirstDate = new Date(today.setHours(0, 0, 0, 0));
      const currentEndDate = new Date(today.setHours(23, 59, 59, 999));

      // 🟢 Month range
      const currentFirstDateM = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentEndDateM = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      // 🔥 REPORT DATA
      const report = {
        total_royalitygenerate: await this.db.view_royality.total_RoyalityGenerate(),

        todays_royalityIncome: await this.db.view_royality.total_royalityIncome({
          created_on: { [Op.between]: [currentFirstDate, currentEndDate] }
        }),

        Month_royalityIncome: await this.db.view_royality.total_royalityIncome({
          created_on: { [Op.between]: [currentFirstDateM, currentEndDateM] }
        }),
      };

      // FILTER CONDITION
      const whereCondition = {
        created_on: {
          [Op.between]: [startDate, endDate]
        },
      };

      // Fetch data from view
      const results = await this.db.view_royality.getAllData(whereCondition);

      if (!results.length) {
        return res.status(400).json({ status: 400, message: "Record not found", data: [], report });
      }

      // 🟢 Optimization: Fetch Plan counts ONCE
      const plan555 = await this.db.PlanPurchase.getPrimeCountwithCondition(1);
      const plan1499 = await this.db.PlanPurchase.getPrimeCountwithCondition(2);
      const plan2360A = await this.db.PlanPurchase.getPrimeCountwithCondition(3);
      const plan2360B = await this.db.PlanPurchase.getPrimeCountwithCondition(4);

      const totalBusiness =
        plan555 * 555 +
        plan1499 * 1499 +
        plan2360A * 2360 +
        plan2360B * 2360;

      const royality = totalBusiness * 0.04;

      const royalityResult = results.map(item => ({
        ...item.dataValues,
        resultsCount555: plan555,
        resultsCount1499: plan1499,
        resultsCount2360A: plan2360A,
        resultsCount2360B: plan2360B,
        totalBusiness,
        royality
      }));

      return res.status(200).json({
        status: 200,
        message: "Successful",
        data: royalityResult,
        report
      });

    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ status: 500, message: error.message });
    }
  }




}

module.exports = new ReferralUserReport();