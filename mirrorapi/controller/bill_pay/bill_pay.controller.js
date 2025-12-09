const { connect, config } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { secretKey } = require('../../middleware/config');
const { QueryTypes, Sequelize, sequelize, Model, DataTypes, Op } = require('sequelize');
const utility = require('../../utility/utility');
const bbpsUtility = require('../../utility/bbps.utility');
const rechargeUtility = require('../../utility/recharge.utility');
const jwt = require('jsonwebtoken');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const { generateClientToken } = require("../../middleware/bbpsauthMiddleware")
const axios = require('axios');


class BillPayment {

  db = {};

  constructor() {
    this.db = connect();

  }

  async billerInfo(req, res) {
    console.log("🟢 billerInfo() called at", new Date().toISOString());

    try {
      console.log("📥 Incoming encReq:", req.body.encReq ? "[RECEIVED]" : "[MISSING]");
      const decryptedObject = utility.DataDecrypt(req.body.encReq);
      console.log("🔓 Decrypted Object:", decryptedObject);

      const { biller_id, user_id } = decryptedObject || {};
      console.log("🧾 biller_id:", biller_id, " | user_id:", user_id);

      const requiredKeys = Object.keys({ biller_id, user_id });
      const date = new Date();

      // ✅ Input validation
      if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key])) {
        console.log("❌ Validation failed. Missing keys:", requiredKeys.filter(k => !decryptedObject[k]));
        return res.status(400).send(
          utility.DataEncrypt(JSON.stringify({
            status: 400,
            message: 'Required input data is missing or empty',
            columns: requiredKeys
          }))
        );
      }

      // const t = await this.db.sequelize.transaction();

      // 🔍 Check if biller info exists locally
      console.log("🔎 Checking local DB for biller_id:", biller_id);
      const checkData = await this.db.bbpsBillerInfo.count({ where: { biller_id } });
      console.log("📊 Local record count:", checkData);

      // 🔹 If not found, fetch from BBPS Portal
      if (checkData === 0) {
        console.log("🌐 Biller not found locally. Fetching from BBPS Portal...");

        const CLIENT_ID = process.env.CLIENT_ID;
        const SECRET_KEY = process.env.SECRET_KEY;
        const BBPS_API_URL = process.env.BBPS_API_URL;
        console.log("🔐 CLIENT_ID:", CLIENT_ID, " | BBPS_API_URL:", BBPS_API_URL);

        if (!CLIENT_ID || !SECRET_KEY || !BBPS_API_URL) {
          console.error("❌ Missing environment variables for BBPS config");
          return res.status(500).send(
            utility.DataEncrypt(JSON.stringify({
              status: 500,
              message: 'Client configuration missing in .env'
            }))
          );
        }

        // 🔹 Prepare encrypted payload
        const payload = { biller_id, user_id, client_id: CLIENT_ID, secret_key: SECRET_KEY };
        console.log("📦 Payload to encrypt:", payload);
        const encReq = utility.clientDataEncrypt(payload, SECRET_KEY);
        console.log("🔒 Encrypted request prepared.");

        const token = generateClientToken(CLIENT_ID);
        console.log("🔑 Generated Bearer token:", token ? "[SUCCESS]" : "[FAILED]");

        try {
          console.log("🚀 Sending POST request to BBPS API...");
          const portalResponse = await axios.post(
            `${BBPS_API_URL}bill_payment/454a048ee09f82be251a44b976fadb1bf3f3a4e6`,
            { encReq, client_id: CLIENT_ID },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          console.log("✅ Portal response received.");

          console.log("📩 Raw portalResponse.data:", portalResponse.data);
          const decryptedResponse = utility.clientDataDecrypt(portalResponse.data, SECRET_KEY);
          console.log("🔓 Decrypted portal response:", decryptedResponse);

          if (decryptedResponse.status === 200 && decryptedResponse.data) {
            console.log("🟩 Valid response received from BBPS Portal. Inserting to DB...");
            const data = decryptedResponse.data;

            await this.db.bbpsBillerInfo.insertData({
              user_id,
              biller_id: data.biller_id,
              biller_name: data.biller_name,
              biller_category: data.biller_category,
              status: 1,
              input_params: data.input_params,
              response_json: JSON.stringify(data),
              created_on: date.getTime()
            });
            console.log("💾 Data inserted into bbpsBillerInfo table.");
          } else {
            console.error("🟥 BBPS Portal returned invalid or failed response:", decryptedResponse);
            return res.status(500).send(
              utility.DataEncrypt(JSON.stringify({
                status: 500,
                message: 'Failed to fetch from BBPS Portal',
                data: decryptedResponse
              }))
            );
          }
        } catch (apiErr) {
          console.error("🔥 Error requesting Biller info from BBPS Portal:", apiErr.message);
          return res.status(500).send(
            utility.DataEncrypt(JSON.stringify({
              status: 500,
              message: 'API call failed',
              error: apiErr.message
            }))
          );
        }
      }

      console.log("📦 Fetching final data from local DB...");
      const resultData = await this.db.bbpsBillerInfo.getData({ biller_id });
      console.log("✅ Final resultData:", resultData);

      return res.status(200).send(
        utility.DataEncrypt(JSON.stringify({
          status: 200,
          data: resultData
        }))
      );

    } catch (error) {
      console.error("💥 Error in billerInfo():", error);
      return res.status(500).send(
        utility.DataEncrypt(JSON.stringify({
          status: 500,
          error: error.message
        }))
      );
    }
  }


  async billFetch(req, res, ipAddress) {
    try {
      const date = new Date();
      console.log("📩 Incoming Bill Fetch Request at:", date);
      console.log("🔹 Raw Request Body:", req.body);

      // 🔹 Step 1: Extract input
      const decryptedObject = utility.DataDecrypt(req.body.encReq);
      console.log("🔹 Decrypted Object:", decryptedObject);

      const { biller_id, user_id, mobile_no, email_id, inputParam } = decryptedObject;
      const requiredKeys = Object.keys({ biller_id, user_id, mobile_no, email_id });
      console.log("🔹 Required Keys:", requiredKeys);

      // 🔹 Step 2: Validate required fields
      if (!requiredKeys.every(k => decryptedObject[k] && decryptedObject[k] !== "")) {
        console.warn("⚠️ Missing or empty required fields:", requiredKeys);
        return res.status(400).json({
          status: 400,
          message: "Required input data is missing or empty",
          columns: requiredKeys,
        });
      }

      // 🔹 Step 3: Load client credentials from .env
      const client_id = process.env.CLIENT_ID;
      const secret_key = process.env.SECRET_KEY;
      const BBPS_API_URL = process.env.BBPS_API_URL;

      console.log("🔹 ENV Client ID:", client_id);
      console.log("🔹 ENV BBPS_API_URL:", BBPS_API_URL);

      if (!client_id || !secret_key) {
        console.error("❌ Missing client credentials in .env");
        return res.status(401).json({ status: 401, message: "Client credentials missing in .env" });
      }

      // 🔹 Step 4: Prepare payload for BBPS Portal
      const payload = {
        biller_id,
        mobile_no,
        email_id,
        inputParam,
        client_id,
        secret_key,
      };
      console.log("🔹 Payload to Encrypt:", payload);

      // 🔹 Step 5: Encrypt before sending
      const encReq = utility.clientDataEncrypt(payload, secret_key);
      console.log("🔒 Encrypted Request (encReq):", encReq);

      // 🔹 Step 6: Log initial order (PENDING)
      const order_id = utility.generateUniqueNumeric(7);
      const transaction_id = order_id;
      const amount = 0;

      const orderData = {
        user_id,
        client_id,
        env: config.env,
        tran_type: "Debit",
        tran_sub_type: "Bill Payment",
        tran_for: "Bill Payment",
        trans_amount: amount,
        currency: "INR",
        order_id,
        order_status: "PENDING",
        created_on: Date.now(),
        created_by: user_id,
        ip_address: ipAddress,
      };
      console.log("📝 Order Data to Insert:", orderData);

      await this.db.upi_order.insertData(orderData);
      console.log("✅ Order inserted successfully with Order ID:", order_id);

      // 🔹 Step 7: Send request to BBPS Portal
      const token = generateClientToken(client_id);
      console.log("🔑 Generated Token:", token);

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      console.log(`🌐 Sending request to BBPS URL: ${BBPS_API_URL}bill_payment/f308eae69c85a45d634afbcc76a5d94609b832dd`);
      const bbpsResponse = await axios.post(
        `${BBPS_API_URL}bill_payment/f308eae69c85a45d634afbcc76a5d94609b832dd`,
        { encReq, client_id },
        { headers }
      );

      console.log("📦 Raw BBPS Response:", bbpsResponse?.data || bbpsResponse);

      // 🔹 Step 8: Decrypt BBPS response
      const decrypted = utility.clientDataDecrypt(bbpsResponse.data, secret_key);
      console.log("🔓 Decrypted BBPS Response:", decrypted);

      // 🔹 Step 9: Parse and handle Bill Fetch response
      if (decrypted.status === 200 && decrypted.data) {
        console.log("✅ Bill Fetch Success Response:", decrypted.data);
        const base = decrypted.data;

        // 🔹 Prepare data for DB insert
        const fetchData = {
          user_id,
          client_id,
          transaction_id,
          biller_id,
          consumer_no: "",
          consumer_name: base.consumer_name || "",
          bill_amount: parseFloat(base.bill_amount || 0),
          bill_period: base.bill_period || "",
          bill_number: base.bill_number || "",
          status: 2,
          created_on: date.getTime(),
          created_by: user_id,
          response_json: JSON.stringify(decrypted),
          input_params: JSON.stringify(inputParam),
          biller_response: JSON.stringify(base),
        };

        if (base.bill_date) fetchData.bill_date = new Date(base.bill_date);
        if (base.due_date) fetchData.due_date = new Date(base.due_date);
        if (base.request_id) fetchData.request_id = base.request_id;
        if (base.request_data) fetchData.request_data = base.request_data;

        console.log("🧾 Bill Fetch Data to Insert:", fetchData);

        const billFetchEntry = await this.db.bbpsBillFetch.insertData(fetchData);
        console.log("✅ Bill Fetch Entry Inserted:", billFetchEntry);

        console.log("💾 Transaction Committed Successfully");

        // 🔹 Step 10: Prepare clean response for frontend
        const responseData = {
          id: billFetchEntry.id,
          user_id: user_id,
          transaction_id: transaction_id,
          biller_id: biller_id,
          request_id: base.request_id,
          request_data: base.request_data,
          biller_response: base.biller_response || null,
        };

        console.log("📤 Final Clean Response:", responseData);

        // ✅ Encrypt and send clean response
        return res
          .status(200)
          .json(
            utility.DataEncrypt(
              JSON.stringify({
                status: 200,
                message: "Bill Fetched",
                data: responseData,
              })
            )
          );
      } else {
        console.warn("⚠️ Bill Fetch Failed Response:", decrypted);
        return res.status(201).json({
          status: 201,
          message: decrypted.message || "Bill fetch failed",
          data: decrypted,
        });
      }
    } catch (error) {
      console.error("💥 Error in Client billFetch:", error);
      return res.status(500).json({
        status: 500,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async billPay(req, res, ipAddress) {
  console.log("⏳ billPay() STARTED");

  try {
    console.log("👉 Incoming Body:", req.body);

    // ---------------------------------------
    // STEP 1: Validate & Decrypt Request
    // ---------------------------------------
    if (!req.body.encReq) {
      return res.status(400).json({ status: 400, message: "Missing encReq" });
    }

    const decryptedObject = utility.DataDecrypt(req.body.encReq);

    if (!decryptedObject) {
      return res.status(400).json({ status: 400, message: "Invalid encrypted data" });
    }

    const { amount, biller_id, user_id, cwallet, transaction_id } = decryptedObject;

    const userId = user_id;
    const env = config.env;

    // ---------------------------------------
    // STEP 2: Wallet Validation
    // ---------------------------------------
    const walletBalance = await this.db.wallet.getWalletAmount(userId);

    if (!walletBalance || walletBalance < amount) {
      return res.status(400).json({ status: 400, message: "Insufficient wallet balance" });
    }

    // ---------------------------------------
    // STEP 3: Load Settings & User Details
    // ---------------------------------------
    const setting = await this.db.setting.getDataRow(["bbps_cutoff_limit"]);
    const userRow = await this.db.user.getData(
      ["first_name", "last_name", "mobile", "email"],
      { id: userId }
    );

    // ---------------------------------------
    // STEP 4: Check BillFetch Data
    // ---------------------------------------
    const resultData = await this.db.bbpsBillFetch.getData({
      biller_id,
      user_id: userId,
      transaction_id,
      status: 2,
    });

    if (!resultData || resultData.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "No pending bill found for this transaction",
      });
    }

    const dataRow = Array.isArray(resultData)
      ? resultData[0]?.dataValues || resultData[0]
      : resultData?.dataValues || resultData;

    // ---------------------------------------
    // STEP 5: Prepare Request for BBPS Server
    // ---------------------------------------
    const CLIENT_ID = process.env.CLIENT_ID;
    const SECRET_KEY = process.env.SECRET_KEY;
    const BBPS_API_URL = process.env.BBPS_API_URL;

    const payload = {
      amount,
      biller_id,
      user_id,
      cwallet,
      transaction_id,
      client_id: CLIENT_ID,
      secret_key: SECRET_KEY,
    };

    const encReq = utility.clientDataEncrypt(payload, SECRET_KEY);

    const token = generateClientToken(CLIENT_ID);

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ---------------------------------------
    // STEP 6: Call BBPS API (Bill Payment)
    // ---------------------------------------
    let bbpsResponse;

    try {
      const bbpsRes = await axios.post(
        `${BBPS_API_URL}bill_payment/44672b279d2d2f4cf1a9ea3fae4029bfd1674e39`,
        { encReq, client_id: CLIENT_ID },
        { headers }
      );

      // Try decrypting BBPS response
      try {
        const resdecrpt = utility.DataDecrypt(bbpsRes.data);
        console.log("🔓 Decrypted BBPS Response:", resdecrpt);

        bbpsResponse =
          typeof resdecrpt === "string" ? JSON.parse(resdecrpt) : resdecrpt;

      } catch (decErr) {
        console.error("⚠️ Unable to decrypt BBPS response:", decErr.message);
        bbpsResponse = bbpsRes.data;
      }

    } catch (err) {
      return res.status(500).json({
        status: 500,
        message: "BBPS server error",
        error: err.response?.data || err.message,
      });
    }

    console.log("🔍 Final Parsed BBPS Response:", bbpsResponse);

    // ---------------------------------------
    // STEP 7: Store SUCCESS or FAILED
    // ---------------------------------------
    const bbpsResult = bbpsResponse;

    // ---------------- SUCCESS ----------------
    if (bbpsResult?.responseCode === "000") {
      await this.db.bbpsBillPayment.insertData({
        consumer_name: bbpsResult.RespCustomerName,
        biller_id,
        amount,
        env,
        main_amount: amount,
        payment_status: "SUCCESS",
        user_id,
        transaction_id,
        response_code: bbpsResult.responseCode,
        status: 1,
        resp_amount: bbpsResult.RespAmount / 100,
        bill_no: bbpsResult.RespBillNumber,
        bill_period: bbpsResult.RespBillPeriod,
        trax_id: bbpsResult.txnRefId,
        cust_conv_fee: bbpsResult.CustConvFee,
        bill_date: bbpsResult.RespBillDate ? new Date(bbpsResult.RespBillDate) : null,
        bill_due_date: bbpsResult.RespDueDate ? new Date(bbpsResult.RespDueDate) : null,
      });

      await this.db.wallet.insert_wallet({
        transaction_id,
        user_id,
        env,
        type: "Debit",
        amount,
        sub_type: "Bill Payment",
        tran_for: "main",
      });

      await this.db.bbpsBillFetch.update({ status: 1 }, { where: { transaction_id } });

      await this.db.upi_order.update(
        { order_status: "SUCCESS" },
        { where: { user_id, order_id: transaction_id } }
      );

      return res.status(200).json({
        status: 200,
        message: "Payment successful",
        data: bbpsResult,
      });
    }

    // ---------------- FAILED ----------------
    return res.status(400).json({
      status: 500,
      message: "Payment failed",
      data: bbpsResult,
    });

  } catch (error) {
    console.error("❌ billPay() ERROR:", error);
    return res.status(500).json({
      status: 500,
      message: error.message,
      stack: error.stack,
    });
  }
}

                                                   



  async bulkBiller(req, res) {

    try {

      const [results, metadata] = await this.db.sequelize.query(`SELECT mst_service_operator.biller_id FROM mst_service_operator
        left join tbl_bbps_bill_info on tbl_bbps_bill_info.biller_id=mst_service_operator.biller_id
        where mst_service_operator.status=1 and mst_service_operator.biller_id is not null and tbl_bbps_bill_info.id is null group by biller_id limit 2000`);

      let billerArray = [];
      for (const data of results) {
        billerArray.push(data.biller_id);
      }

      if (billerArray.length > 0) {
        const { result, reqData } = await bbpsUtility.bbpsBillerInfo(billerArray);

        if (result) {

          const base = result.billerInfoResponse.biller;


          for (const item of base) {
            //return item;
            const billerId = item.billerId;
            const billerName = item.billerName;
            const billerCategory = item.billerCategory;
            const billerInputParams = item.billerInputParams;
            const billerCoverage = item.billerCoverage;
            const billerAdhoc = item.billerAdhoc;
            const billerFetchRequiremet = item.billerFetchRequiremet;

            let consumerNumber = '';
            let distributorId = '';
            let mobileNo = '';
            let consumerId = '';


            const fetchData = {
              biller_id: billerId,
              biller_name: billerName,
              biller_category: billerCategory,
              distributor_id: distributorId,
              biller_coverage: billerCoverage,
              biller_adhoc: billerAdhoc,
              mobile_no: mobileNo,
              consumer_id: consumerId,
              status: 1,
              input_params: JSON.stringify(billerInputParams),
              response_json: JSON.stringify(item),
              biller_fetch_requiremet: billerFetchRequiremet
            }

            await this.db.bbpsBillerInfo.insertData(fetchData);
          }

        }

      }
      return true;

    } catch (error) {
      console.error('An error occurred:', error);
      // Handle the error or throw it again if needed
    }
  }

  async billPayHoldApprove(req, res) {
    const { user_id, transaction_id } = req;

    const requiredKeys = Object.keys({ user_id, transaction_id });

    if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    }

    let t = await this.db.sequelize.transaction();

    try {

      let date = new Date();
      let crdate = utility.formatDate(date);
      let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      firstDay = utility.formatDate(firstDay);
      lastDay = utility.formatDate(lastDay);
      let walletbalance = await this.db.wallet.getWalletAmount(user_id);

      const whereClause = { 'user_id': user_id, 'transaction_id': transaction_id, 'status': 4 }
      const getDataBillPayment = await this.db.bbpsBillPayment.getData(whereClause, { transaction: t });
      const getPanel = await this.db.panel.getDataPanel(2);
      const service_url = getPanel.service_url;

      const panelId = getPanel.id;

      const requestId = transaction_id;
      const amount = getDataBillPayment.main_amount;
      const d_amount = getDataBillPayment.amount;
      //const input_params = getDataBillPayment.input_params;
      const biller_id = getDataBillPayment.biller_id;
      const operator = await this.db.serviceOperator.getData(biller_id);
      const operator_code = operator.bbps_code;

      const whereChk = { id: user_id };
      const UserAttribute = ['first_name', 'last_name', 'mobile', 'email'];
      const userRow = await this.db.user.getData(UserAttribute, whereChk);

      const mobile = userRow.mobile;
      const ConsumerNumber = mobile;
      const prime_amount = getDataBillPayment.service_amount;
      const cashback_amount = getDataBillPayment.cashback_amount;

      const biller_info = await this.db.bbpsBillerInfo.getData({ biller_id: biller_id });
      const resultData = await this.db.bbpsBillFetch.getData({ biller_id: biller_id, user_id: user_id, transaction_id: transaction_id, status: 2 });

      let request_id = resultData.request_id;
      let input_params = resultData.input_params;
      let biller_response = resultData.biller_response;
      let additional_info = resultData.additional_info;

      // if(walletbalance!=null && walletbalance> 0 && amount <= walletbalance)
      // {
      //const {result:response, panel_id } = await rechargeUtility.kppsbbps(service_url, requestId, transaction_id, operator_code, mobile, ConsumerNumber, amount, panelId, input_params);
      const { result, reqData } = await bbpsUtility.bbpsBillPay(amount, biller_id, request_id, biller_info.biller_adhoc, userRow.mobile, userRow.email, input_params, biller_response, additional_info);


      if (result.ExtBillPayResponse.responseCode == '000') {

        const base = result.ExtBillPayResponse;
        //update in bill payment
        const updateData = {
          consumer_name: base.RespCustomerName,
          payment_status: 'SUCCESS',
          response_code: base.responseCode,
          status: 1,
          resp_amount: base.RespAmount / 100,
          bill_no: base.RespBillNumber,
          bill_date: base.RespBillDate,
          bill_preriod: base.RespBillPeriod,
          bill_due_date: base.RespDueDate,
          input_params: JSON.stringify(base.inputParams),
          trax_id: base.txnRefId,
          response_code: base.responseCode,
          cust_conv_fee: base.CustConvFee,
        };

        const whereClause = { id: getDataBillPayment.id };
        const paymentEntry = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });

        await this.db.bbpsBillFetch.update(
          { status: 1 },
          { where: { transaction_id: transaction_id }, t }
        );

        await this.db.upi_order.update(
          { order_status: 'SUCCESS' },
          { where: { user_id: user_id, order_id: transaction_id }, t }
        );

        await t.commit();
        updateData.transaction_id = transaction_id;
        return res.status(200).json({ status: 200, message: 'Bill payment successfully done', data: updateData });

      } else {

        const updateData = {
          payment_status: 'FAILED',
          response_code: base.responseCode,
          status: 3,
        };

        const whereClause = { id: getDataBillPayment.id };
        const paymentEntry = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });
        let reTransaction_id = utility.generateUniqueNumeric(7);
        // Order Generate
        const reorderData = {
          user_id: user_id,
          env: config.env,
          tran_type: 'Credit',
          tran_sub_type: 'Bill Payment',
          tran_for: 'Refund',
          trans_amount: amount,
          currency: 'INR',
          order_id: reTransaction_id,
          order_status: 'SUCCESS',
          created_on: Date.now(),
          created_by: user_id,
          ip_address: 0
        };

        const generateorder = await this.db.upi_order.insertData(reorderData);
        if (generateorder) {
          //entry in wallet for deduction
          const walletData = {
            transaction_id: reTransaction_id,
            user_id: user_id,
            env: config.env,
            type: 'Credit',
            amount: d_amount,
            sub_type: 'Bill Payment',
            tran_for: 'main'
          };

          const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });

          if (walletEntry && cashback_amount > 0) {

            const cashbackData = {
              user_id: user_id,
              env: config.env,
              type: 'Credit',
              sub_type: 'Bill Payment',
              tran_for: 'Refund',
              amount: cashback_amount,
              transaction_id: reTransaction_id

            };
            const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
          }

          if (walletEntry && prime_amount > 0) {
            const primeData = {
              user_id: user_id,
              env: config.env,
              type: 'Debit',
              sub_type: 'Bill Payment',
              tran_for: 'Bill Payment',
              amount: prime_amount,
              transaction_id: reTransaction_id
            };

            const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });

          }


          await this.db.bbpsBillFetch.update(
            { status: 3 },
            { where: { transaction_id: transaction_id }, t }
          );

          await this.db.upi_order.update(
            { order_status: 'FAILED' },
            { where: { user_id: user_id, order_id: transaction_id }, t }
          );
        }

        await t.commit();
        updateData.transaction_id = reTransaction_id;
        return res.status(200).json({ status: 200, message: 'Bill payment failed', data: updateData });

      }


      // }else{
      //   return res.status(200).json({ status: 500,error: 'You do not have sufficient wallet balance' });
      // }


    } catch (error) {

      await t.rollback();
      logger.error(`Unable to find user: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: 'Internal Server Error', data: validationErrors });
      }

      return res.status(500).json({ status: 500, message: error.message, data: [] });
    }

  }

  async billPaymentReject(req, res) {

    const { user_id, transaction_id, reject_reason, admin_user_id } = req;

    const requiredKeys = Object.keys({ user_id, transaction_id, reject_reason, admin_user_id });

    if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    }
    let t = await this.db.sequelize.transaction();

    try {
      let date = new Date();
      const whereClause = { 'user_id': user_id, 'transaction_id': transaction_id, 'status': 4 }
      const getDataBillPayment = await this.db.bbpsBillPayment.getData(whereClause, { transaction: t });

      if (getDataBillPayment) {
        const updateData = {
          payment_status: 'REJECT',
          description: reject_reason,
          status: 5,
          updated_on: date.getTime(),
          updated_by: admin_user_id
        }


        const whereClause = { id: getDataBillPayment.id };
        const paymentUpdate = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });

        if (paymentUpdate) {

          //entry in wallet for deduction
          // const walletData = {
          //     transaction_id:transaction_id,
          //     user_id:user_id,
          //     env: config.env,
          //     type:'Credit',
          //     amount:getDataBillPayment.amount,
          //     sub_type:'Bill Payment',
          //     tran_for:'main'
          // };

          // const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });

          // if(walletEntry && cashback_amount > 0)
          // {

          //     const cashbackData = {
          //         user_id:user_id, 
          //         env: config.env, 
          //         type: 'Credit', 
          //         sub_type: 'Bill Payment', 
          //         tran_for: 'Refund', 
          //         amount:getDataBillPayment.cashback_amount,
          //         transaction_id:transaction_id

          //     };
          //     const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
          // }

          // if(walletEntry && prime_amount>0)
          // {
          //     const primeData = {
          //         user_id:user_id, 
          //         env: config.env, 
          //         type: 'Debit', 
          //         sub_type: 'Bill Payment', 
          //         tran_for: 'Bill Payment', 
          //         amount:getDataBillPayment.service_amount,
          //         transaction_id:transaction_id
          //     };

          //     const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });

          // }
          return res.status(200).json({ status: 200, message: 'Bill payment rejected successfully' });
        }

      } else {
        return res.status(201).json({ status: 500, message: 'Data not found', data: [] });
      }


    } catch (error) {

      logger.error(`Unable to find record: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: error.message, data: [] });
    }
  }

  async billFetchTesting(req, res, ipAddress) {
    let t = await this.db.sequelize.transaction();
    try {

      const { biller_id, user_id, mobile_no, email_id, inputParam } = req;
      const requiredKeys = Object.keys({ biller_id, user_id, mobile_no, email_id });
      let date = new Date();

      if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
        //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
      }
      //return inputParam;
      //const resultData = await this.db.bbpsBillerInfo.getData({biller_id: biller_id});
      // const inputParam = {
      //     "paramInfo": {
      //       "paramName": "User Id",
      //       "paramValue": "160240233379",
      //       "dataType": "ALPHANUMERIC",
      //       "isOptional": "false",
      //       "minLength": "1",
      //       "maxLength": "25"
      //     }
      // };
      //return typeof inputParam.paramInfo;



      const { result, reqData } = await bbpsUtility.bbpsBillFetch(biller_id, inputParam.paramInfo, mobile_no, email_id);

      return res.status(200).json({ status: 200, message: result.billFetchResponse.errorInfo.error.errorMessage, data: result, reqData: reqData });

    } catch (error) {
      console.error('An error occurred:', error);
      // Handle the error or throw it again if needed
      return res.status(500).json({ status: 500, error: error.message });
    }
  }


}

module.exports = new BillPayment();