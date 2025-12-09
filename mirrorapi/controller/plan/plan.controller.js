const { connect } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { secretKey } = require('../../middleware/config');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const utility = require('../../utility/utility');
const planUtility = require('../../utility/mplan.utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);

class ServicesOperator {

  db = {};

  constructor() {
    this.db = connect();

  }


  async browsePlan(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    //   const { operator, circle, mobile_no } = decryptedObject;

    const { operator_id, circle_id, recharge_type_id } = decryptedObject;

    const requiredKeys = Object.keys({ operator_id, circle_id, recharge_type_id });

    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {

      if (planUtility.getIpaymentPlan) {
        const result = await planUtility.getIpaymentPlan(circle_id, recharge_type_id, operator_id);
        // const planPromise = planUtility.getPlan(operator, circle, null);
        //const planOfferPromise = planUtility.getPlan(operator, circle, mobile_no);

        // const [planResponse] = await Promise.all([planPromise]);

        // if (planResponse.error) {
        //      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Plan Error' })));
        // }

        if (result.status == 'SUCCESS') {
          //planResponse.result.records.OFFER = planResponseOffer.result.records;

          return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: result.data })));
        } else {
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Invalid Plan Response' })));
        }
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'DB Error' })));
      } else {
        return res.status(404).json(utility.DataEncrypt(JSON.stringify({ status: 404, message: 'Plan not Received' })));
      }

    } catch (error) {

      logger.error(`Error in getPlan: ${error}`);

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }

      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Failed to create', data: [] })));
    }

    return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Bad request', data: [] })));
  }



  async rofferPlan(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    // const decryptedObject = req
    // console.log("decryptedObject are: ", decryptedObject)
    const { operator, circle, mobile_no } = decryptedObject;

    const requiredKeys = ["operator", "circle", "mobile_no"];
    if (!requiredKeys.every(key => decryptedObject[key])) {
      return res.status(400).json(
        utility.DataEncrypt(JSON.stringify({
          status: 400,
          message: "Required input data is missing",
          columns: requiredKeys,
        }))
      );
    }

    try {
      const planModel = this.db.mobileplan;
      // console.log("planModel ", planModel)
      // 🔍 1. CHECK IF PLAN EXISTS IN DB
      let savedPlan = await planModel.findOne({
        where: { operator, circle, mobile: mobile_no },
      });

      // 🔥 CHECK IF PLAN IS < 30 DAYS OLD
      const isValid =
        savedPlan &&
        (new Date() - new Date(savedPlan.last_updated)) / (1000 * 60 * 60 * 24) <
        30;

      if (isValid) {
        return res.status(200).json(
          utility.DataEncrypt(
            JSON.stringify({
              status: 200,
              message: "success (from db cache)",
              data: JSON.parse(savedPlan.plans),
            })
          )
        );
      }

      // 🟢 2. FETCH LIVE PLAN (because DB empty or expired)
      const planResponse = await planUtility.getPlan(operator, circle, mobile_no);

      if (planResponse.error || !planResponse.result) {
        return res.status(500).json(
          utility.DataEncrypt(
            JSON.stringify({ status: 500, message: "Plan Error" })
          )
        );
      }

      const planData = planResponse.result.records;

      // 🟣 3. SAVE OR UPDATE DB
      if (savedPlan) {
        await savedPlan.update({
          plans: JSON.stringify(planData),
          last_updated: new Date(),
        });
      } else {
        await planModel.create({
          operator,
          circle,
          mobile: mobile_no,
          plans: JSON.stringify(planData),
          last_updated: new Date(),
        });
      }

      // 🟢 4. RETURN FINAL RESPONSE
      return res.status(200).json(
        utility.DataEncrypt(
          JSON.stringify({
            status: 200,
            message: "success (fresh data)",
            data: planData,
          })
        )
      );
    } catch (error) {
      logger.error(`Error in getPlan: ${error}`);
      return res.status(500).json(
        utility.DataEncrypt(
          JSON.stringify({
            status: 500,
            message: "Internal server error",
          })
        )
      );
    }
  }


  async checkOperator(req, res) {

    const { mobile_no } = req;

    const requiredKeys = Object.keys({ mobile_no });

    if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    }

    try {

      if (planUtility.checkOperator) {
        const operators = await planUtility.checkOperator(mobile_no);

        if (operators.error) {
          return res.status(500).json({ status: 500, message: 'Operator not found' });
        }

        if (operators.result) {

          return res.status(200).json({ status: 200, message: 'success', data: operators.result.records });
        } else {
          return res.status(500).json({ status: 500, message: 'Invalid operator Response' });
        }

        return res.status(500).json({ status: 500, message: 'DB Error' });
      } else {
        return res.status(404).json({ status: 404, message: 'Operator not found' });
      }

    } catch (error) {

      logger.error(`Error in checkOperator: ${error}`);

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: 'Failed to fetch', data: [] });
    }

    return res.status(400).json({ status: 400, message: 'Bad request', data: [] });
  }

}





module.exports = new ServicesOperator();