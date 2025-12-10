const { connect, config, baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const utility = require('../../utility/utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const whatsappUtility = require('../../utility/whatsapp.utility');
const emailUtility = require('../../utility/email.utility');
const notificationUtility = require('../../utility/fcm_notification.utitlity');
const messagingService = require('../../router/whatsapp/messagingService');
class AddMoney {
  db = {};

  constructor() {
    this.db = connect();
  }

  async addMoneyRequest(req, res) {
    try {
      // 1️⃣ Check if encrypted data exists
      const encrypted = req.body?.data;
      if (!encrypted) {
        return res.status(400).json({
          status: 400,
          message: "Missing encrypted data",
          data: [],
        });
      }

      // 2️⃣ Decrypt payload
      let decryptedData;
      try {
        decryptedData = JSON.parse(utility.DataDecrypt(encrypted));
      } catch (err) {
        console.error("❌ Failed to decrypt payload:", err);
        return res.status(400).json({
          status: 400,
          message: "Invalid encrypted data",
          data: [],
        });
      }

      const { user_id, amount, category, trans_no, wallet } = decryptedData;

      // 3️⃣ Handle uploaded file if exists
      const filePath = req.file ? req.file.filename : null;

      //console.log("addMoneyRequest decrypted data:", decryptedData, "file:", filePath);

      // 4️⃣ Get user details
      const whereChk = { id: user_id };
      const UserAttribute = ["id", "first_name", "last_name", "mobile", "email"];
      const userRow = await this.db.user.getData(UserAttribute, whereChk);
      const walletType = wallet || "Main";

      // 5️⃣ Get FCM tokens
      const user_token = await this.db.fcm_notification.getFcmToken(userRow.id);
      const fcmTokens = user_token ? user_token.token : "";

      // 6️⃣ Check if transaction already exists
      const addMoneyCount = await this.db.add_money.getCount(trans_no);
      if (addMoneyCount > 0) {
        return res.status(400).json(
          utility.DataEncrypt(
            JSON.stringify({
              status: 400,
              message: "Already added money of that transaction no",
              data: [],
            })
          )
        );
      }

      // 7️⃣ Insert money data
      const results = await this.insertMoneyData(
        user_id,
        amount,
        category,
        trans_no,
        filePath,
        walletType
      );

      if (!results.id) {
        return res.status(500).json(
          utility.DataEncrypt(
            JSON.stringify({
              status: 500,
              message: "Failed to insert data",
              data: [],
            })
          )
        );
      }

      // 8️⃣ Send FCM notification
      if (fcmTokens.length > 0) {
        const notification = await notificationUtility.addMoneyRequestPendingNotification(
          fcmTokens,
          userRow.first_name,
          userRow.last_name,
          userRow.id
        );
        await this.db.log_app_notification.insertData(notification);
      }

      // 9️⃣ Generate Invoice PDF
      const invoicePDFPath = await emailUtility.generateInvoicePDF(
        userRow,
        amount,
        trans_no,
        walletType
      );

      //  🔟 Send PDF via WhatsApp + Email
      try {
        await messagingService.sendMessage(
          userRow.mobile,
          null,
          invoicePDFPath,
          userRow.email,
          "Mayway Wallet Top-Up Receipt",
          null,
          invoicePDFPath
        );
        //console.log("✅ PDF sent successfully via WhatsApp & Email");
      } catch (err) {
        console.error("❌ Error sending PDF via WhatsApp/Email:", err);
      }

      // ✅ Success response
      return res.status(200).json(
        utility.DataEncrypt(
          JSON.stringify({ status: 200, message: "success", data: results })
        )
      );
    } catch (err) {
      console.error("❌ Error in addMoneyRequest:", err);
      return res.status(500).json(
        utility.DataEncrypt(
          JSON.stringify({ status: 500, message: "Internal Server Error", data: [] })
        )
      );
    }
  }



  async insertMoneyData(user_id, amount, category, trans_no, filePath, walletType) {

    const moneyData = {
      user_id,
      amount,
      category,
      trans_no,
      img: filePath,
      wallet: walletType
    };
    return await this.db.add_money.insertData(moneyData);
  }

  //   async handleFileUpload(fileName) {
  //     try {
  //       const uploadPath = path.join(__dirname, '../uploads/add_money/', fileName);
  //       return { uploadPath, status: 'success' };
  //     } catch (error) {
  //       throw new Error(`Failed to handle file upload: ${error.message}`);
  //     }
  //   }

  handleError(err, res) {
    logger.error(`Unable to process request: ${err}`);

    if (err.name === 'SequelizeValidationError') {
      const validationErrors = err.errors.map((err) => err.message);
      res.status(500).json({ status: 500, errors: validationErrors });
    } else {
      res.status(500).json({ status: 500, message: err.message, data: [] });
    }
  }




  async addMoneyOrder(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id, trans_amount, tran_sub_type, ip_address } = decryptedObject;

    const requiredKeys = Object.keys({ user_id, trans_amount, tran_sub_type, ip_address });

    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {
      const currentDate = new Date();
      const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

      const order_id = utility.generateUniqueNumericAddMoney(6);


      const results = await this.db.sequelize.transaction(async (t) => {


        const newUpiAddMoney = await this.db.upi_order.create(
          {

            user_id,
            env: 'PROD',
            tran_type: 'Credit',
            tran_sub_type,
            tran_for: 'Add Money',
            trans_amount,
            currency: 'INR',
            order_id,
            order_status: 'PENDING',
            created_on,
            created_by: user_id,
            ip_address


          },
          { validate: true, transaction: t, logging: sql => logger.info(sql), }
        );
        return newUpiAddMoney;
      });



      if (results != null) {

        // const reference_no = '1' + String(insertedId).padStart(10, '0');

        //       const updateResult = await  this.db.upi_order.update(
        //           { reference_no: reference_no },
        //           { where: { order_id : order_id }, returning: true }
        //       );

        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: order_id })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Failed', data: [] })));


    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json();
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message, data: [] })));
    }

  }





  async addMoneyRequest(filename, reqBody, res) {
    try {
      // 1️⃣ Get encrypted data
      let encrypted = reqBody?.data;

      if (!encrypted) {
        return res.status(400).json(
          utility.DataEncrypt(
            JSON.stringify({ status: 400, message: "Missing encrypted data", data: [] })
          )
        );
      }

      // 2️⃣ If encrypted is an object (frontend sent JSON), stringify it
      if (typeof encrypted === "object") {
        encrypted = JSON.stringify(encrypted);
      }

      // 3️⃣ Decrypt payload
      let decryptedData;
      try {
        const decrypted = utility.DataDecrypt(encrypted); // returns string
        decryptedData = typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
      } catch (err) {
        console.error("❌ Failed to decrypt payload:", err);
        return res.status(400).json(
          utility.DataEncrypt(
            JSON.stringify({ status: 400, message: "Invalid encrypted data", data: [] })
          )
        );
      }

      const { user_id, amount, category, trans_no, wallet } = decryptedData;

      // 4️⃣ Use filename passed from route
      const filePath = filename || null;

      //console.log("addMoneyRequest decrypted data:", decryptedData, "file:", filePath);

      // 5️⃣ Get user details
      const whereChk = { id: user_id };
      const UserAttribute = ["id", "first_name", "last_name", "mobile", "email"];
      const userRow = await this.db.user.getData(UserAttribute, whereChk);
      const walletType = wallet || "Main";

      // 6️⃣ Get FCM tokens
      const user_token = await this.db.fcm_notification.getFcmToken(userRow.id);
      const fcmTokens = user_token ? user_token.token : "";

      // 7️⃣ Check if transaction already exists
      const addMoneyCount = await this.db.add_money.getCount(trans_no);
      if (addMoneyCount > 0) {
        return res.status(400).json(
          utility.DataEncrypt(
            JSON.stringify({
              status: 400,
              message: "Already added money of that transaction no",
              data: [],
            })
          )
        );
      }

      // 8️⃣ Insert money data
      const results = await this.insertMoneyData(
        user_id,
        amount,
        category,
        trans_no,
        filePath,
        walletType
      );

      if (!results.id) {
        return res.status(500).json(
          utility.DataEncrypt(
            JSON.stringify({
              status: 500,
              message: "Failed to insert data",
              data: [],
            })
          )
        );
      }

      // 9️⃣ Send FCM notification
      if (fcmTokens.length > 0) {
        const notification = await notificationUtility.addMoneyRequestPendingNotification(
          fcmTokens,
          userRow.first_name,
          userRow.last_name,
          userRow.id
        );
        await this.db.log_app_notification.insertData(notification);
      }

      // 🔟 Generate Invoice PDF
      const invoicePDFPath = await emailUtility.generateInvoicePDF(
        userRow,
        amount,
        trans_no,
        walletType
      );

      // 1️⃣1️⃣ Send PDF via WhatsApp + Email
      try {
        await messagingService.sendMessage(
          userRow.mobile,
          null,
          invoicePDFPath,
          userRow.email,
          "Mayway Wallet Top-Up Receipt",
          null,
          invoicePDFPath
        );
        //console.log("✅ PDF sent successfully via WhatsApp & Email");
      } catch (err) {
        console.error("❌ Error sending PDF via WhatsApp/Email:", err);
      }

      // ✅ Success response
      // Example for success
      res.status(200).json(
        utility.DataEncrypt(
          JSON.stringify({ status: 200, message: "success", data: results })
        )
      );

    } catch (err) {
      console.error("❌ Error in addMoneyRequest:", err);
      return res.status(500).json(
        utility.DataEncrypt(
          JSON.stringify({ status: 500, message: "Internal Server Error", data: [] })
        )
      );
    }
  }


  async updateMoneyStatus(req, res, ipAddress) {
    try {
      // ✅ Check encrypted request
      if (!req.body.data) {
        const response = { status: 400, message: "Encrypted data missing." };
        return res.status(400).send({ data: utility.DataEncrypt(JSON.stringify(response)) });
      }

      // ✅ Decrypt request
      const decryptedRequest = utility.DataDecrypt(req.body.data);
      let { add_money_req_id, action, note, status } = decryptedRequest;

      if (!add_money_req_id || !action || !status) {
        const response = { status: 400, message: "Required fields missing." };
        return res.status(400).send({ data: utility.DataEncrypt(JSON.stringify(response)) });
      }

      if (!note) note = (action === 'Approve') ? 'Approve' : 'Rejected';

      const getMoneyRequestData = await this.db.add_money.getAddMoneyById(add_money_req_id);
      if (!getMoneyRequestData) {
        const response = { status: 404, message: "Money request not found." };
        return res.status(404).send({ data: utility.DataEncrypt(JSON.stringify(response)) });
      }

      const userId = getMoneyRequestData.user_id;
      const walletType = getMoneyRequestData.wallet;
      const amount = getMoneyRequestData.amount;

      // --- Fetch user data
      const userRow = await this.db.user.getData(
        ['id', 'first_name', 'last_name', 'mobile'],
        { id: userId }
      );

      const user_token = await this.db.fcm_notification.getFcmToken(userId);
      const fcmTokens = user_token ? user_token.token : '';

      const currentDate = new Date();
      const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const order_id = utility.generateUniqueNumeric(6);
      const type = 'Credit';
      const env = config.env;

      // --- Insert UPI order
      const upiData = {
        user_id: userId,
        env: 'PROD',
        tran_type: type,
        tran_sub_type: 'MANUAL ORDER',
        tran_for: 'Add Money',
        trans_amount: amount,
        currency: 'INR',
        order_id,
        order_status: 'SUCCESS',
        created_on,
        created_by: userId,
        ip_address: ipAddress
      };

      const newUpiAddMoney = await this.db.upi_order.insertData(upiData);

      let walletEntry = [];
      if (newUpiAddMoney && newUpiAddMoney.id && action === 'Approve') {

        // --- Insert to main wallet
        if (walletType.toLowerCase() === 'main') {
          const walletData = {
            transaction_id: order_id,
            user_id: userId,
            env: env,
            type: type,
            amount: amount,
            sub_type: 'Add Money',
            tran_for: 'main'
          };
          walletEntry = await this.db.wallet.insert_wallet(walletData);
        }

        // --- Insert to epin wallet with bonus
        if (walletType.toLowerCase() === 'epin') {
          let bonus_amount = 0;
          const bonusPoints = [
            { threshold: 5000, points: 250 },
            { threshold: 10000, points: 500 },
            { threshold: 15000, points: 750 },
            { threshold: 20000, points: 1000 }
          ];
          for (let i = 0; i < bonusPoints.length; i++) {
            const { threshold, points } = bonusPoints[i];
            if (amount == threshold) bonus_amount = points;
          }

          const ewalletData = {
            transaction_id: order_id,
            user_id: userId,
            env: env,
            type: type,
            amount: amount,
            sub_type: 'Add Money',
            tran_for: 'epin'
          };
          walletEntry = await this.db.epinWallet.insert_wallet(ewalletData);

          if (parseInt(amount) >= 5000 && bonus_amount > 0) {
            const bonus_order_id = utility.generateUniqueNumeric(6);
            const bonusData = {
              user_id: userId,
              env: 'PROD',
              tran_type: type,
              tran_sub_type: 'MANUAL ORDER',
              tran_for: 'Add Money Bonus',
              trans_amount: bonus_amount,
              currency: 'INR',
              order_id: bonus_order_id,
              order_status: 'SUCCESS',
              created_on,
              created_by: userId,
              ip_address: ipAddress
            };
            await this.db.upi_order.insertData(bonusData);

            const ewalletBonusData = {
              transaction_id: bonus_order_id,
              user_id: userId,
              env: env,
              type: type,
              amount: bonus_amount,
              sub_type: 'Add Money Bonus',
              tran_for: 'epin'
            };
            await this.db.epinWallet.insert_wallet(ewalletBonusData);
          }
        }
      }

      // --- Insert passbook entry
      if (walletEntry && walletEntry.error === 0) {
        const passbookData = {
          transaction_id: order_id,
          user_id: userId,
          env: env,
          type: type,
          amount: amount,
          tran_for: 'Add Money',
          ref_tbl_id: walletEntry.createdId
        };
        await this.db.passbook.insert_passbook(passbookData);

        await this.db.upi_order.update(
          { order_status: 'SUCCESS' },
          { where: { user_id: userId, order_id, order_status: 'PENDING' } }
        );
      }

      // --- Update Add Money request status
      const updatedMoneyStatus = await this.db.add_money.UpdateData(
        { rejection_reason: note, status: (action === 'Approve') ? 1 : 2, updated_on: created_on },
        add_money_req_id
      );

      if (updatedMoneyStatus > 0) {
        // --- Send notifications
        if (fcmTokens.length > 0) {
          if (action === 'Approve') {
            const notification = await notificationUtility.addMoneyRequestApprovedNotification(fcmTokens, userRow.first_name, userRow.last_name, userRow.id);
            await this.db.log_app_notification.insertData(notification);
          } else {
            const notification = await notificationUtility.addMoneyRequestRejectNotification(fcmTokens, userRow.first_name, userRow.last_name, userRow.id);
            await this.db.log_app_notification.insertData(notification);
          }
        }

        const responsePayload = { status: 200, message: 'Money Request Successful.', data: walletEntry };
        return res.status(200).send({ data: utility.DataEncrypt(JSON.stringify(responsePayload)) });
      } else {
        const responsePayload = { status: 500, message: 'Failed to insert/update data', data: [] };
        return res.status(500).send({ data: utility.DataEncrypt(JSON.stringify(responsePayload)) });
      }

    } catch (error) {
      logger.error(`updateMoneyStatus error: ${error}`);
      const responsePayload = { status: 500, message: error.message || error, data: [] };
      return res.status(500).send({ data: utility.DataEncrypt(JSON.stringify(responsePayload)) });
    }
  }



  async addMoneyRequestHistory(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id, wallet } = decryptedObject;
    const requiredKeys = Object.keys({ user_id });

    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {
      const walletType = wallet ? wallet : 'Main';

      let whereCondition;
      whereCondition = {
        user_id: user_id,
        wallet: walletType
      }


      const result = await this.db.add_money_view.getAllData(whereCondition);

      const moneyResult = [];
      for (const item of result) {
        moneyResult.push({
          ...item.dataValues,
          img: baseurl + `uploads/add_money/` + item.img,
        });
      }

      return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: moneyResult })));
      // return res.status(200).json({ status: 200,  message:'success', data : moneyResult });

    } catch (error) {
      logger.error(`Unable to find Result: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
        // return res.status(500).json({ status: 500,errors: validationErrors });
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: error, data: [] })));
      //   return res.status(500).json({ status: 500,  message: error.message ,data:[]});
    }
  }

  async addMoneyRequestReport(req, res) {
    try {
      if (!req.body || !req.body.data) {
        //console.log("❌ No encrypted payload found in request");
        const encryptedError = utility.DataEncrypt(
          JSON.stringify({ status: 400, message: "No data provided", data: [], report: {} })
        );
        return res.status(400).json({ data: encryptedError });
      }

      // Decrypt incoming request
      const decryptedBody = utility.DataDecrypt(req.body.data);
      //console.log("🟢 Decrypted Request:", decryptedBody);

      const { from_date, to_date } = decryptedBody;

      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      endDate.setHours(23, 59, 59);

      const whereCondition = {
        created_on: { [Op.between]: [startDate, endDate] }
      };

      const report = {
        totalAddmoneyCount: await this.db.add_money_view.count({ where: { ...whereCondition } }),
        totalPendingAddMoney: await this.db.add_money_view.count({ where: { ...whereCondition, status: 0 } }),
        totalApprovedaddMoney: await this.db.add_money_view.count({ where: { ...whereCondition, status: 1 } }),
        totalRejectedaddMoney_view: await this.db.add_money_view.count({ where: { ...whereCondition, status: 2 } }),
      };

      const result = await this.db.add_money_view.getAllData(whereCondition);

      const moneyResult = result.map(item => ({
        ...item.dataValues,
        img: baseurl + `uploads/add_money/` + item.img
      }));

      // Encrypt response
      const encryptedResponse = utility.DataEncrypt(
        JSON.stringify({ status: 200, message: "success", data: moneyResult, report })
      );

      return res.status(200).json({ data: encryptedResponse });

    } catch (error) {
      console.error("🚨 Unable to fetch Add Money report:", error);

      const encryptedError = utility.DataEncrypt(
        JSON.stringify({ status: 500, message: error.message || error, data: [], report: {} })
      );
      return res.status(500).json({ data: encryptedError });
    }
  }


}

module.exports = new AddMoney();