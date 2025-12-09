const { connect, baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { secretKey } = require('../../middleware/config');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const utility = require('../../utility/utility');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const { paginate } = require('../../utility/pagination.utility');
const logger = pino({ level: 'info' }, process.stdout);


require('dotenv').config();
// const baseUrl = process.env.API_BASE_URL;
// const baseUrl ='https://apis.mayway.in/';


class ServicesOperator {

  db = {};

  constructor() {
    this.db = connect();

  }


  async addOperator(req, res) {
    let t;

    try {
      const { operator_name, description, category,biller_id } = req.body;
      const uploadedFile = req.file;

      console.log("📥 Incoming Body:", req.body);
      console.log("📸 Uploaded File:", req.file);

      if (!uploadedFile) {
        return res.status(400).json({ status: 400, message: "Image is required" });
      }

      const filePath = `uploads/operatorlogos/${category}/${uploadedFile.filename}`;

      t = await this.db.sequelize.transaction();

      const existing = await this.db.serviceOperator.findOne({
        where: { operator_name, status: 1 }
      });

      if (existing) {
        await t.rollback();
        return res.status(400).json({ status: 400, message: "Operator already exists" });
      }

      const operatorData = {
        operator_name,
        description,
        category,
        image: filePath,
        status: 1,
        biller_id
      };

      const newOperator = await this.db.serviceOperator.insertData(operatorData, {
        validate: true,
        transaction: t
      });

      await t.commit();

      return res.status(201).json({
        status: 201,
        message: "Operator added successfully",
        data: newOperator
      });

    } catch (error) {
      if (t) await t.rollback();
      return res.status(500).json({
        status: 500,
        message: "Failed to add operator",
        error: error.message
      });
    }
  }



  async updateOperator(req, res) {
    let t;

    try {
      console.log("📥 Incoming Update Request Body:", req.body);
      console.log("📸 Uploaded File:", req.file);

      const { id, operator_name, description, category } = req.body;
      const uploadedFile = req.file;

      t = await this.db.sequelize.transaction();

      // Fetch existing operator
      const operator = await this.db.serviceOperator.findOne({
        where: { id, status: 1 }
      });

      console.log("🔍 Existing Operator Data:", operator?.dataValues);

      if (!operator) {
        await t.rollback();
        return res.status(404).json({ status: 404, message: "Operator not found" });
      }

      // Duplicate name check
      if (operator_name) {
        console.log(`🔎 Checking duplicate for operator_name: ${operator_name}`);

        const exists = await this.db.serviceOperator.findOne({
          where: {
            operator_name,
            status: 1,
            id: { [this.db.Sequelize.Op.ne]: id }
          }
        });

        if (exists) {
          console.log("⚠ Duplicate name found:", exists.operator_name);

          await t.rollback();
          return res.status(400).json({ status: 400, message: "Operator name already exists" });
        }
      }

      const updateData = {
        operator_name: operator_name || operator.operator_name,
        description: description || operator.description,
        category: category || operator.category
      };

      // If image uploaded
      if (uploadedFile) {
        const newPath = `uploads/operatorlogos/${updateData.category}/${uploadedFile.filename}`;

        console.log("🆕 New Image Path:", newPath);

        updateData.image = newPath;

        const fs = require("fs");

        if (operator.image && fs.existsSync(operator.image)) {
          console.log("🗑 Deleting old image:", operator.image);
          fs.unlinkSync(operator.image);
        }
      }

      console.log("📦 Final Update Data:", updateData);

      await this.db.serviceOperator.update(updateData, {
        where: { id },
        transaction: t
      });

      await t.commit();

      console.log("✅ Operator Updated Successfully");

      return res.status(200).json({
        status: 200,
        message: "Operator updated successfully",
        data: updateData
      });

    } catch (error) {
      if (t) await t.rollback();

      console.error("❌ Error in updateOperator:", error);

      return res.status(500).json({
        status: 500,
        message: "Failed to update operator",
        error: error.message
      });
    }
  }





  async getOperator(req, res) {

    try {
      const decryptedObject = utility.DataDecrypt(req.encReq);
      const { category, user_id, page } = decryptedObject;

      const requiredKeys = Object.keys({ category });
      let getOperator = [];
      const pagecount = (page) ? page : 1;
      let orderExtension = '';
      let getBillPayment = [];

      if (user_id != null) {
        const whereChk = { id: user_id };
        const UserAttribute = ['first_name', 'last_name', 'circle'];
        const userRow = await this.db.user.getData(UserAttribute, whereChk);

        if (userRow.circle != null) {
          orderExtension = [Sequelize.literal(`(CASE WHEN location = '${userRow.circle}' THEN 0 ELSE 1 END)`), 'ASC'];
        }
      }

      if (requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
        getOperator = await this.db.serviceOperator.getAllData();
      } else {
        let whereClause = { 'status': 1, 'category': category };
        let orderClause = [
          ...(orderExtension ? [orderExtension] : []),
        ];
        getOperator = await paginate(this.db.serviceOperator, {
          order: orderClause,
          whereClause,
          page: pagecount,
          pageSize: 100
        });
        getOperator = getOperator.data;
      }



      let getOperatorWithPath = getOperator.map((operator) => ({
        id: operator.id,
        operator_name: operator.operator_name,
        image: operator.image,
        category: operator.category,
        description: operator.description,
        status: operator.status,
        biller_id: operator.biller_id,
      }));


      if (user_id != null) {
        //   getBillPayment = await this.db.billPaymentReport.findAll({
        //       where:{
        //         user_id: user_id,
        //         status: 1,
        //         category: category
        //       },
        //       order: [['created_on', 'DESC']],
        //       limit: 2
        //     });
      }

      const circle = ['Andhra Pradesh Telangana', 'Assam', 'Bihar Jharkhand', 'Chennai', 'Delhi NCR', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu Kashmir', 'Karnataka', 'Kerala', 'Kolkata', 'Madhya Pradesh Chhattisgarh', 'Maharashtra Goa', 'Mumbai', 'North East', 'Orissa', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'UP East', 'UP West', 'West Bengal'];

      const circle2 = [
        {
          "circleId": 1,
          "circleName": "Andhra Pradesh Telangana"
        },
        {
          "circleId": 2,
          "circleName": "Assam"
        },
        {
          "circleId": 3,
          "circleName": "Bihar Jharkhand"
        },
        {
          "circleId": 4,
          "circleName": "Chennai"
        },
        {
          "circleId": 5,
          "circleName": "Delhi NCR"
        },
        {
          "circleId": 6,
          "circleName": "Gujarat"
        },
        {
          "circleId": 7,
          "circleName": "Haryana"
        },
        {
          "circleId": 8,
          "circleName": "Himachal Pradesh"
        },
        {
          "circleId": 9,
          "circleName": "Jammu Kashmir"
        },
        {
          "circleId": 10,
          "circleName": "Karnataka"
        },
        {
          "circleId": 11,
          "circleName": "Kerala"
        },
        {
          "circleId": 12,
          "circleName": "Kolkata"
        },
        {
          "circleId": 13,
          "circleName": "Madhya Pradesh Chhattisgarh"
        },
        {
          "circleId": 14,
          "circleName": "Maharashtra Goa"
        },
        {
          "circleId": 15,
          "circleName": "Mumbai"
        },
        {
          "circleId": 16,
          "circleName": "North East"
        },
        {
          "circleId": 17,
          "circleName": "Orissa"
        },
        {
          "circleId": 18,
          "circleName": "Punjab"
        },
        {
          "circleId": 19,
          "circleName": "Rajasthan"
        },
        {
          "circleId": 20,
          "circleName": "Tamil Nadu"
        },
        {
          "circleId": 21,
          "circleName": "UP East"
        },
        {
          "circleId": 22,
          "circleName": "UP West"
        },
        {
          "circleId": 23,
          "circleName": "West Bengal"
        }
      ]


      const rechargeType = [
        {
          "rechargeTypeId": 1,
          "rechargeType": "Top-up"
        },
        {
          "rechargeTypeId": 3,
          "rechargeType": "Full Talktime"
        },
        {
          "rechargeTypeId": 4,
          "rechargeType": "SMS"
        },
        {
          "rechargeTypeId": 5,
          "rechargeType": "2G Data"
        },
        {
          "rechargeTypeId": 6,
          "rechargeType": "3G Data"
        },
        {
          "rechargeTypeId": 8,
          "rechargeType": "4G Data"
        },
        {
          "rechargeTypeId": 9,
          "rechargeType": "Local"
        },
        {
          "rechargeTypeId": 10,
          "rechargeType": "STD"
        },
        {
          "rechargeTypeId": 11,
          "rechargeType": "ISD"
        },
        {
          "rechargeTypeId": 13,
          "rechargeType": "Roaming"
        },
        {
          "rechargeTypeId": 14,
          "rechargeType": "Other"
        },
        {
          "rechargeTypeId": 16,
          "rechargeType": "Validity"
        },
        {
          "rechargeTypeId": 17,
          "rechargeType": "Plan"
        },
        {
          "rechargeTypeId": 18,
          "rechargeType": "FRC"
        }
      ]
      //   return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: getOperatorWithPath, circle: circle, recent_bill_data:getBillPayment, rechargeType: rechargeType, circle2: circle2 })));

      return res.status(200).json({ status: 200, message: 'success', data: getOperatorWithPath, circle: circle, recent_bill_data: getBillPayment, rechargeType: rechargeType, circle2: circle2 });

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message, data: [] })));
    }


  }



  async getOperatorTest(req, res) {

    try {
      const decryptedObject = req
      // const decryptedObject = utility.DataDecrypt(req.encReq);
      const { category } = decryptedObject;

      // return decryptedObject;

      const requiredKeys = Object.keys({ category });
      let getOperator = [];

      if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
        getOperator = await this.db.serviceOperator.getAllData();
      } else {
        getOperator = await this.db.serviceOperator.getDataWithClause(category);
      }




      let getOperatorWithPath = getOperator.map(operator => {
        return {
          id: operator.id,
          operator_name: operator.operator_name,
          image: baseurl + operator.image,
          category: operator.category,
          description: operator.description,
          status: operator.status,
          biller_id: operator.biller_id,
        };
      });

      const circle = ['Andhra Pradesh Telangana', 'Assam', 'Bihar Jharkhand', 'Chennai', 'Delhi NCR', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu Kashmir', 'Karnataka', 'Kerala', 'Kolkata', 'Madhya Pradesh Chhattisgarh', 'Maharashtra Goa', 'Mumbai', 'North East', 'Orissa', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'UP East', 'UP West', 'West Bengal'];
      return res.status(200).json({ status: 200, message: 'success', data: getOperatorWithPath, circle: circle });
      //return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: getOperatorWithPath, circle: circle })));

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        //return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        return res.status(500).json({ status: 500, errors: validationErrors });
      }
      //return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message,data: []  })));
      return res.status(500).json({ status: 500, message: err.message, data: [] });
    }


  }


  async getMobileOperator(req, res) {

    try {
      const decryptedObject = utility.DataDecrypt(req.encReq);
      const { mobile } = decryptedObject;

      const requiredKeys = Object.keys({ mobile });

      if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
      }

      const mOperator = await this.db.mobileOperator.findOne({
        where: { status: 1, mobile_no: mobile },
      });

      let getOperatorWithPath = [];

      if (mOperator) {
        const operator = await this.db.serviceOperator.findOne({
          where: { status: 1, id: mOperator.operator_id },
        });

        getOperatorWithPath = {
          id: operator.id,
          operator_name: operator.operator_name,
          category: operator.category,
          description: operator.description,
          image: baseurl + operator.image,
          status: operator.status,
          biller_id: operator.biller_id,
        }
      }


      const circle = ['Andhra Pradesh Telangana', 'Assam', 'Bihar Jharkhand', 'Chennai', 'Delhi NCR', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu Kashmir', 'Karnataka', 'Kerala', 'Kolkata', 'Madhya Pradesh Chhattisgarh', 'Maharashtra Goa', 'Mumbai', 'North East', 'Orissa', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'UP East', 'UP West', 'West Bengal'];

      return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: getOperatorWithPath, circle: circle })));

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        //return res.status(500).json({ status: 500,errors: validationErrors });
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      //return res.status(500).json({ status: 500, message: err.message,data: []  });
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message, data: [] })));
    }


  }

  async getOperatorCategories(req, res) {
    try {
      const categories = await this.db.serviceOperator.getDistinctCategories();
      return res.status(200).json({
        status: 200,
        message: 'success',
        data: categories
      });
    } catch (err) {
      logger.error(`Unable to fetch categories: ${err}`);
      return res.status(500).json({
        status: 500,
        message: err.message,
        data: []
      });
    }
  }



}





module.exports = new ServicesOperator();