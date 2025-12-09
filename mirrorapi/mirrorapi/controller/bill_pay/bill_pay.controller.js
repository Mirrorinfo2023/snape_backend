const { connect,config } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { secretKey } = require('../../middleware/config'); 
const { QueryTypes,Sequelize,sequelize, Model, DataTypes,Op } = require('sequelize');
const utility = require('../../utility/utility'); 
const bbpsUtility = require('../../utility/bbps.utility'); 
const rechargeUtility = require('../../utility/recharge.utility'); 
const jwt = require('jsonwebtoken');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);



class BillPayment {

    db = {};

    constructor() {
        this.db = connect();
        
    }
    
    async billerInfo(req,res) {
        const decryptedObject = utility.DataDecrypt(req.encReq);
      const { biller_id, user_id } = decryptedObject;
      const requiredKeys = Object.keys({ biller_id, user_id });
      let date = new Date();
      

      if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
          //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
          return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
      }

      try {




        let billerArray = [];
        billerArray.push(biller_id);

       
        const checkData = await this.db.bbpsBillerInfo.count({where: { biller_id: billerArray }, });
        
        if(checkData == 0)
        {
          const {result, reqData} = await bbpsUtility.bbpsBillerInfo(billerArray);
          
          if(result)
          {
            
            const base = result.billerInfoResponse.biller;
 
           
            const billerId = base.billerId;
            const billerName = base.billerName;
            const billerCategory = base.billerCategory;
            const billerInputParams = base.billerInputParams;
            const billerFetchRequiremet = base.billerFetchRequiremet;
            
            let consumerNumber = '';
            let distributorId = '';
            let mobileNo = '';
            let consumerId = '';

            // for(const data of billerInputParams)
            // {
            //   consumerNumber = data.paramInfo[0].paramName;
            //   distributorId = data.paramInfo[1].paramName;
            //   mobileNo = data.paramInfo[2].paramName;
            //   consumerId = data.paramInfo[3].paramName;
            // }

            const fetchData = {
              user_id,
              biller_id: billerId,
              biller_name: billerName,
              biller_category: billerCategory,
              consumer_number: consumerNumber,
              distributor_id: distributorId,
              mobile_no: mobileNo,
              consumer_id: consumerId,
              status: 1,
              input_params: JSON.stringify(billerInputParams),
              response_json: JSON.stringify(result),
              created_on: date.getTime(),
              biller_fetch_requiremet: billerFetchRequiremet
            }

            await this.db.bbpsBillerInfo.insertData(fetchData);
            
          }
          
        }

        const resultData = await this.db.bbpsBillerInfo.getData({biller_id: biller_id});
        
        //return res.status(200).json({ status: 200, data: resultData });
         return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, data: resultData })));
    
      } catch (error) {
        console.error('An error occurred:', error);

        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, error: error.message })));
        // Handle the error or throw it again if needed
      }
    }

    async billFetch(req,res,ipAddress) {  
        let t = await this.db.sequelize.transaction();
        try {
            const decryptedObject = utility.DataDecrypt(req.encReq);
            const { biller_id, user_id, mobile_no, email_id, inputParam } = decryptedObject;
            const requiredKeys = Object.keys({ biller_id, user_id, mobile_no, email_id });
            let date = new Date();

            if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
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
            
            // const resultData = await this.db.bbpsBillFetch.getData({biller_id: biller_id, user_id: user_id, status:2});
            
            // if(resultData == null)
            // {
                const { result, reqData } = await bbpsUtility.bbpsBillFetch(biller_id, inputParam.paramInfo, mobile_no, email_id);
                
                //return res.status(200).json({ status: 200,data: result.billFetchResponse.billerResponse, reqData:reqData });
                
                if(result.billFetchResponse.responseCode=='000')
                {
                    const base = result.billFetchResponse.billerResponse;
                    const amount = parseFloat(base.billAmount) / 100;
                    //const amount_option = base.amountOptions.option;
                    const consumer_name = base.customerName;
                    const bill_date = base.billDate?base.billDate:null;
                    const bill_period = base.billPeriod;
                    const due_date = base.dueDate?base.dueDate:null;
                    const bill_number = base.billNumber;
                    const request_id = reqData.requestId;
                    const request_data = reqData.encRequest;
                    const response_data = reqData.encResponse;
                    const consumer_no = '';
                    const inputParams = result.billFetchResponse.inputParams;
                    const addtionalInfo = result.billFetchResponse.additionalInfo;
    
                    let late_fine = 0;
                    let fixed_charge = 0;
                    let additional_charge = 0;
    
                    // if(amount_option.amountName == 'Late Payment Fee')
                    // {
                    //     late_fine = parseFloat(amount_option.amountValue) / 10;
                    // }
    
                    // if(amount_option.amountName == 'Fixed Charges')
                    // {
                    //     fixed_charge = parseFloat(amount_option.amountValue) / 10;
                    // }
    
                    // if(amount_option.amountName == 'Additional Charges')
                    // {
                    //     additional_charge = parseFloat(amount_option.amountValue) / 10;
                    // }
                    
                    
                    
                    // let walletbalance = await this.db.wallet.getWalletAmount(user_id);
                    // if(walletbalance!==null && walletbalance > 0 && walletbalance >= amount)
                    // {
                    //     return res.status(500).json({ status: 500,error: 'You do not have sufficient wallet balance' });
                    // }
    
                    const order_id=utility.generateUniqueNumeric(7);
                    const transaction_id = order_id;
                    // Order Generate
                    const orderData = {
                        user_id:user_id,
                        env:config.env, 
                        tran_type:'Debit',
                        tran_sub_type:'Bill Payment',
                        tran_for:'Bill Payment',
                        trans_amount:amount,
                        currency:'INR',
                        order_id,
                        order_status:'PENDING',
                        created_on:Date.now(),
                        created_by:user_id,
                        ip_address:ipAddress
                    };
                    
                    const generateorder = await this.db.upi_order.insertData(orderData, { transaction: t }); 
                    const fetchData = {
                        user_id,
                        transaction_id,
                        biller_id,
                        request_id,
                        request_data,
                        response_data,
                        consumer_no,
                        consumer_name,
                        bill_amount: amount,
                        late_fine,
                        fixed_charge,
                        additional_charge,
                        bill_period,
                        bill_number,
                        status: 2,
                        created_on: date.getTime(),
                        created_by: user_id,
                        response_json: JSON.stringify(result),
                        input_params: JSON.stringify(inputParams),
                        biller_response: JSON.stringify(base),
                        additional_info: JSON.stringify(addtionalInfo)
                    }
                    
                    if(bill_date!=null){
                        fetchData.bill_date = new Date(bill_date);
                    }
                    if(due_date!=null){
                        fetchData.due_date = new Date(due_date);
                    }
                    const billFetchEntery = await this.db.bbpsBillFetch.insertData(fetchData, { transaction: t });
                    if(billFetchEntery)
                    {
                        await t.commit();
                        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Bill Fetched', data: billFetchEntery })));
                        //return res.status(200).json({ status: 200, message: 'Bill Fetched', data: billFetchEntery });
                    }else{
                        await t.rollback()
                        console.error('An error occurred:', 'Somthing went wrong');
                        return res.status(201).json(utility.DataEncrypt(JSON.stringify({ status: 201, message: 'Somthing went wrong'})));
                    }
                }else{
                    return res.status(201).json(utility.DataEncrypt(JSON.stringify({ status: 201, message: result.billFetchResponse.errorInfo.error.errorMessage, data: result})));
                }
            // }else{
            //     return res.status(200).json({ status: 200, message: 'Bill Fetched', data: resultData });
            // }
          } catch (error) {
            console.error('An error occurred:', error);
            // Handle the error or throw it again if needed
            return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, error: error.message })));
            //return res.status(500).json({ status: 500, error: error.message });
          }
    }
    
    
    async billPay(req,res, ipAddress) { 
        const decryptedObject = utility.DataDecrypt(req.encReq);
      const {amount, biller_id, user_id, cwallet, transaction_id} = decryptedObject;
		  const requiredKeys = Object.keys({ amount, biller_id, user_id, cwallet, transaction_id });
            
      if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
        //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
      }

      let t = await this.db.sequelize.transaction();

      try {
          let userId = user_id;
          const checkplan  = await this.db.PlanPurchase.getAllPlanUser(userId);
          let maxPlan = null;
          if(checkplan.length > 0)
          {
            maxPlan = Math.max(...checkplan);
          }

          let user_type = (maxPlan !=null) ? 'Prime' : '';
          let plan_id = maxPlan ? maxPlan : null;
          let env = config.env;
          let date = new Date();
          let crdate = utility.formatDate(date);
          let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          firstDay = utility.formatDate(firstDay);
          lastDay = utility.formatDate(lastDay);
          let walletbalance = await this.db.wallet.getWalletAmount(userId);
          let d_amount = amount;
          let wallet = cwallet ? cwallet : '';
          const setting = await this.db.setting.getDataRow(['bbps_cutoff_limit']);


          const whereChk={id:userId};
          const UserAttribute=['first_name','last_name','mobile', 'email'];
          const userRow = await this.db.user.getData(UserAttribute,whereChk);
          const biller_info = await this.db.bbpsBillerInfo.getData({biller_id: biller_id});
          const resultData = await this.db.bbpsBillFetch.getData({biller_id: biller_id, user_id: userId, transaction_id:transaction_id, status:2});
          //return resultData;

          if((resultData == null || resultData.length==0) || (biller_info == null))
          {
              return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'No bill dues or biller does not exists', data:resultData })));
            //return res.status(500).json({ status: 500, message: 'No bill dues or biller does not exists', data:resultData });
          }

          if(walletbalance!==null && walletbalance > 0 && walletbalance >= amount)
          {

            let prime_rate = 0;
            let prime_amount = 0;
            let cashback_amount = 0;
            let cashback_rate = 0;
            let prime_wallet_balance = await this.db.prime.getPrimeAmount(userId);

            let service_rate = 0;
            let service_amount = 0;
            let transaction_id= resultData.transaction_id;
            let request_id= resultData.request_id;
            let consumer_name= resultData.consumer_name;
            //let bill_amount= resultData.bill_amount;
            let bill_amount= amount;
            let input_params= resultData.input_params;
            let bill_date= resultData.bill_date?resultData.bill_date:null;
            let bill_period= resultData.bill_period;
            let due_date= resultData.due_date?resultData.due_date:null;
            let bill_number= resultData.bill_number;
            let biller_response= resultData.biller_response;
            let additional_info= resultData.additional_info;

            if(user_type == 'Prime' && wallet == 'Prime' && plan_id > 0){
              const plan_details = await this.db.cashbackPlan.getData(plan_id);

              if(prime_wallet_balance>0){
                prime_rate = plan_details.bill_rate;
                prime_amount = amount*prime_rate/100;
                
                if(prime_wallet_balance>=prime_amount)
                {
                  d_amount = d_amount-prime_amount;
                  service_rate = prime_rate;
                  service_amount = prime_amount;
                }
                
              }


            }
            
            if(amount >= setting.bbps_cutoff_limit )
            {
              
              const inputData = { 
                consumer_name: consumer_name, 
                biller_id: biller_id,  
                amount: d_amount,
                env: config.env,
                main_amount: amount,
                service_rate: service_rate,
                service_amount: service_amount,
                cashback_amount: cashback_amount,
                cashback_rate: cashback_rate,
                payment_status: 'HOLD',
                user_id: user_id,
                transaction_id: transaction_id,
                response_code: '202',
                status: 4,
                input_params: input_params,
                description: 'Bill Payment has been temporarily on hold for verification'
              };

              const paymentEntry = await this.db.bbpsBillPayment.insertData(inputData, { transaction: t });
              if(paymentEntry)
              {
                //entry in wallet for deduction
                const walletData = {
                    transaction_id:transaction_id,
                    user_id:userId,
                    env:config.env,
                    type:'Debit',
                    amount:d_amount,
                    sub_type:'Bill Payment',
                    tran_for:'main'
                };
                
                const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });

                if(walletEntry && cashback_amount > 0)
                {

                    const cashbackData = {
                        user_id:userId, 
                        env: config.env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:cashback_amount,
                        transaction_id:transaction_id
                    
                    };
                    const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
                }

                if(walletEntry && prime_amount>0)
                {
                    const primeData = {
                        user_id:userId, 
                        env: config.env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:prime_amount,
                        transaction_id:transaction_id
                    };
                    
                    const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });
                }
              }
              return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Your payment has been temporarily Hold for security reasons. Please contact the support team-9112421742.', data: paymentEntry })));
              //return res.status(200).json({ status: 200, message: 'Your payment has been temporarily Hold for security reasons. Please contact the support team-9112421742.', data: paymentEntry });
            }

            
            const {result, reqData} = await bbpsUtility.bbpsBillPay(bill_amount, biller_id, request_id, biller_info.biller_adhoc, userRow.mobile, userRow.email, input_params, biller_response, additional_info);

            if(result.ExtBillPayResponse.responseCode == '000')
            {
              const base = result.ExtBillPayResponse;
              //entry in bill payment
              const inputData = { 
                consumer_name: base.RespCustomerName, 
                biller_id: biller_id,  
                amount: d_amount,
                env: env,
                main_amount: amount,
                service_rate: service_rate,
                service_amount: service_amount,
                cashback_amount: cashback_amount,
                cashback_rate: cashback_rate,
                payment_status: 'SUCCESS',
                user_id: userId,
                transaction_id: transaction_id,
                response_code: base.responseCode,
                status: 1,
                resp_amount: base.RespAmount/100,
                bill_no: base.RespBillNumber,
                bill_preriod: base.RespBillPeriod,
                input_params: JSON.stringify(base.inputParams),
                trax_id: base.txnRefId,
                response_code: base.responseCode,
                cust_conv_fee: base.CustConvFee,
              };
              if(base.RespBillDate!=null){
                  inputData.bill_date=new Date(base.RespBillDate);
              }
              
              if(base.RespDueDate!=null){
                  inputData.bill_due_date=new Date(base.RespDueDate);
              }
              const paymentEntry = await this.db.bbpsBillPayment.insertData(inputData, { transaction: t });

              if(paymentEntry)
              {
                //entry in wallet for deduction
                const walletData = {
                    transaction_id:transaction_id,
                    user_id:userId,
                    env:env,
                    type:'Debit',
                    amount:d_amount,
                    sub_type:'Bill Payment',
                    tran_for:'main'
                };
                
                const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });

                if(walletEntry && cashback_amount > 0)
                {

                    const cashbackData = {
                        user_id:userId, 
                        env: env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:cashback_amount,
                        transaction_id:transaction_id
                    
                    };
                    const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
                }

                if(walletEntry && prime_amount>0)
                {
                    const primeData = {
                        user_id:userId, 
                        env: env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:prime_amount,
                        transaction_id:transaction_id
                    };
                    
                    const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });
                }
                
                await this.db.bbpsBillFetch.update(
                    { status: 1 }, 
                    { where: {transaction_id:transaction_id}, t }
                );
    
                await this.db.upi_order.update(
                    {order_status: 'SUCCESS' },
                    { where: { user_id:userId,order_id:transaction_id }, t }
                );
              
              }
                return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Payment done successfully', data: paymentEntry })));
              //return res.status(200).json({ status: 200, message: 'Payment done successfully', data: paymentEntry });
            }else{
                return res.status(201).json(utility.DataEncrypt(JSON.stringify({ status: 201, message: 'Payment failed', data: result })));
              //return res.status(201).json({ status: 201, message: 'Payment failed', data: result });
            }
            
          }else{
              return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,error: 'You do not have sufficient wallet balance' })));
            //return res.status(500).json({ status: 500,error: 'You do not have sufficient wallet balance' });
          }
      
        } catch (error) {
          await t.rollback();
          logger.error(`Unable to find user: ${error}`);
          if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map((err) => err.message);
            return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
            //return res.status(500).json({ status: 500,errors: validationErrors });
          }
        
            return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
          //return res.status(500).json({ status: 500,  message: error ,data:[]});
        }
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400,  message: 'Bad request' ,data:[]})));
        //return res.status(400).json({ status: 400,  message: 'Bad request' ,data:[]});
    }
    
    
    async bulkBiller(req,res) { 

      try {

        const [results, metadata] = await this.db.sequelize.query(`SELECT mst_service_operator.biller_id FROM mst_service_operator
        left join tbl_bbps_bill_info on tbl_bbps_bill_info.biller_id=mst_service_operator.biller_id
        where mst_service_operator.status=1 and mst_service_operator.biller_id is not null and tbl_bbps_bill_info.id is null group by biller_id limit 2000`);

        let billerArray = [];
        for(const data of results){
          billerArray.push(data.biller_id);
        }

        if(billerArray.length>0){
          const {result, reqData} = await bbpsUtility.bbpsBillerInfo(billerArray);
          
          if(result)
          {
            
            const base = result.billerInfoResponse.biller;
            

            for(const item of base)
            {
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
    
    async quickPay(req,res, ipAddress) { 

      const {amount, biller_id, user_id, cwallet, inputParam} = req;
		  const requiredKeys = Object.keys({ amount, biller_id, user_id, cwallet, inputParam });
            
      if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
        return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
      }

      let t = await this.db.sequelize.transaction();

      try {
          let userId = user_id;
          const checkplan  = await this.db.PlanPurchase.getAllPlanUser(userId);
          let maxPlan = null;
          if(checkplan.length > 0)
          {
            maxPlan = Math.max(...checkplan);
          }

          let user_type = (maxPlan !=null) ? 'Prime' : '';
          let plan_id = maxPlan ? maxPlan : null;
          let env = config.env;
          let date = new Date();
          let crdate = utility.formatDate(date);
          let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          firstDay = utility.formatDate(firstDay);
          lastDay = utility.formatDate(lastDay);
          let walletbalance = await this.db.wallet.getWalletAmount(userId);
          let d_amount = amount;
          let wallet = cwallet ? cwallet : '';


          const whereChk={id:userId};
          const UserAttribute=['first_name','last_name','mobile', 'email'];
          const userRow = await this.db.user.getData(UserAttribute,whereChk);
          const biller_info = await this.db.bbpsBillerInfo.getData({biller_id: biller_id});
          //return resultData;


          if(walletbalance!==null && walletbalance > 0 && walletbalance >= amount)
          {

            let prime_rate = 0;
            let prime_amount = 0;
            let cashback_amount = 0;
            let cashback_rate = 0;
            let prime_wallet_balance = await this.db.prime.getPrimeAmount(userId);

            let service_rate = 0;
            let service_amount = 0;
            

            if(user_type == 'Prime' && wallet == 'Prime' && plan_id > 0){
              const plan_details = await this.db.cashbackPlan.getData(plan_id);

              if(prime_wallet_balance>0){
                prime_rate = plan_details.bill_rate;
                prime_amount = amount*prime_rate/100;
                
                if(prime_wallet_balance>=prime_amount)
                {
                  d_amount = d_amount-prime_amount;
                  service_rate = prime_rate;
                  service_amount = prime_amount;
                }
                
              }


            }


            // const order_id=utility.generateUniqueNumeric(7);
            // const transaction_id = order_id;
            // // Order Generate
            // const orderData = {
            //     user_id:user_id,
            //     env:config.env, 
            //     tran_type:'Debit',
            //     tran_sub_type:'Bill Payment',
            //     tran_for:'Bill Payment',
            //     trans_amount:amount,
            //     currency:'INR',
            //     order_id,
            //     order_status:'PENDING',
            //     created_on:Date.now(),
            //     created_by:user_id,
            //     ip_address:ipAddress
            // };
            
            // const generateorder = await this.db.upi_order.insertData(orderData, { transaction: t }); 

            
            const {result, reqData} = await bbpsUtility.bbpsQuickPay(amount, biller_id, biller_info.biller_adhoc, userRow.mobile, userRow.email, inputParam.paramInfo);
            //return reqData;
            return res.status(200).json({ status: 200, message: result, data: reqData });
            if(result.ExtBillPayResponse.responseCode == '000')
            {
              
              const base = result.ExtBillPayResponse;
              //entry in bill payment
              const inputData = { 
                consumer_name: base.RespCustomerName, 
                biller_id: biller_id,  
                amount: d_amount,
                env: env,
                main_amount: amount,
                service_rate: service_rate,
                service_amount: service_amount,
                cashback_amount: cashback_amount,
                cashback_rate: cashback_rate,
                payment_status: 'SUCCESS',
                user_id: userId,
                transaction_id: transaction_id,
                response_code: base.responseCode,
                status: 1,
                resp_amount: base.RespAmount/100,
                bill_no: base.RespBillNumber,
                bill_date: base.RespBillDate,
                bill_preriod: base.RespBillPeriod,
                bill_due_date: base.RespDueDate,
                input_params: JSON.stringify(base.inputParams),
                trax_id: base.txnRefId,
                response_code: base.responseCode,
                cust_conv_fee: base.CustConvFee,
              };
              const paymentEntry = await this.db.bbpsBillPayment.insertData(inputData, { transaction: t });

              if(paymentEntry)
              {
                //entry in wallet for deduction
                const walletData = {
                    transaction_id:transaction_id,
                    user_id:userId,
                    env:env,
                    type:'Debit',
                    amount:d_amount,
                    sub_type:'Bill Payment',
                    tran_for:'main'
                };
                
                const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });

                if(walletEntry && cashback_amount > 0)
                {

                    const cashbackData = {
                        user_id:userId, 
                        env: env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:cashback_amount,
                        transaction_id:transaction_id
                    
                    };
                    const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
                }

                if(walletEntry && prime_amount>0)
                {
                    const primeData = {
                        user_id:userId, 
                        env: env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:prime_amount,
                        transaction_id:transaction_id
                    };
                    
                    const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });
                }


                // await this.db.bbpsBillFetch.update(
                //   { status: 1 }, 
                //   { where: {transaction_id:transaction_id}, t }
                // );
  
                await this.db.upi_order.update(
                  {order_status: 'SUCCESS' },
                  { where: { user_id:userId,order_id:transaction_id }, t }
                );
                
              }

              return res.status(200).json({ status: 200, message: 'Payment done successfully', data: paymentEntry });
            }else{
              return res.status(201).json({ status: 201, message: 'Payment Failed', data: result });
            }
            
          }else{
            return res.status(500).json({ status: 500,error: 'You do not have sufficient wallet balance' });
          }
      
        } catch (error) {
          await t.rollback();
          logger.error(`Unable to find user: ${error}`);
          if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map((err) => err.message);
            return res.status(500).json({ status: 500,errors: validationErrors });
          }
        
          return res.status(500).json({ status: 500,  message: error ,data:[]});
        }
        return res.status(400).json({ status: 400,  message: 'Bad request' ,data:[]});
    }
    
    // async billPayHoldApprove(req, res)
    // {
    //   const { user_id, transaction_id } = req;

    //   const requiredKeys = Object.keys({ user_id, transaction_id});
              
    //   if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
    //       return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    //   }

    //   let t = await this.db.sequelize.transaction();

    //   try
    //   {

    //     let date = new Date();
    //     let crdate = utility.formatDate(date);
    //     let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    //     let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    //     firstDay = utility.formatDate(firstDay);
    //     lastDay = utility.formatDate(lastDay);
    //     let walletbalance = await this.db.wallet.getWalletAmount(user_id);

        
    //     const whereClause = {'user_id': user_id, 'transaction_id': transaction_id, 'status': 4 }

    //     const getDataBillPayment = await this.db.bbpsBillPayment.getData(whereClause, { transaction: t });
    //     const getPanel = await this.db.panel.getDataPanel(2);
    //     const service_url = getPanel.service_url;
        
    //     const panelId = getPanel.id;
        
    //     const requestId = transaction_id;
    //     const amount = getDataBillPayment.main_amount;
    //     const d_amount = getDataBillPayment.amount;
    //     const input_params = getDataBillPayment.input_params;
    //     const biller_id = getDataBillPayment.biller_id;
    //     const operator = await this.db.serviceOperator.getData(biller_id);
    //     const operator_code = operator.bbps_code;
    //     const whereChk={id:user_id};
    //     const UserAttribute=['first_name','last_name','mobile', 'email'];
    //     const userRow = await this.db.user.getData(UserAttribute,whereChk);
    //     const mobile = userRow.mobile;
    //     const ConsumerNumber = mobile;
    //     const prime_amount = getDataBillPayment.service_amount;
    //     const cashback_amount = getDataBillPayment.cashback_amount;

    //     if(walletbalance!=null && walletbalance> 0 && amount <= walletbalance)
    //     {
    //       const {result:response, panel_id } = await rechargeUtility.kppsbbps(service_url, requestId, transaction_id, operator_code, mobile, ConsumerNumber, amount, panelId, input_params);
          
    //       try
    //       {

    //         if(response)
    //         {

    //           const whereClause = { id: getDataBillPayment.id };
    //           const updateData = { 
    //             payment_status: response.status,
    //             status: 1,
    //             resp_amount: amount,
    //             bill_no: response.txn_id,
    //             bill_date: date.getTime(),
    //             trax_id: response.txn_id,
    //           };
    //           const paymentEntry = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });
              
    
    //           if(paymentEntry.error == 0)
    //           {
    //             //entry in wallet for deduction
    //             const walletData = {
    //                 transaction_id:transaction_id,
    //                 user_id:user_id,
    //                 env: config.env,
    //                 type:'Debit',
    //                 amount:d_amount,
    //                 sub_type:'Bill Payment',
    //                 tran_for:'main'
    //             };
                
    //             const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });
    
    //             if(walletEntry && cashback_amount > 0)
    //             {
    
    //                 const cashbackData = {
    //                     user_id:user_id, 
    //                     env: config.env, 
    //                     type: 'Debit', 
    //                     sub_type: 'Bill Payment', 
    //                     tran_for: 'Bill Payment', 
    //                     amount:cashback_amount,
    //                     transaction_id:transaction_id
                    
    //                 };
    //                 const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
    //             }
    
    //             if(walletEntry && prime_amount>0)
    //             {
    //                 const primeData = {
    //                     user_id:user_id, 
    //                     env: config.env, 
    //                     type: 'Debit', 
    //                     sub_type: 'Bill Payment', 
    //                     tran_for: 'Bill Payment', 
    //                     amount:prime_amount,
    //                     transaction_id:transaction_id
    //                 };
                    
    //                 const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });

    //             }
    
    
    //             await this.db.bbpsBillFetch.update(
    //               { status: 1 }, 
    //               { where: {transaction_id:transaction_id}, t }
    //             );
  
    //             await this.db.upi_order.update(
    //               {order_status: response.status },
    //               { where: { user_id:user_id,order_id:transaction_id }, t }
    //             );

    //             await t.commit();
    //             updateData.transaction_id = transaction_id;
    //             return res.status(200).json({ status: 200,  message: 'Bill payment successfully done', data:updateData});
    //           }
    //           else{
    //             await t.rollback();
    //           }
              
    //         }

    //       }catch({ result: response, panel_id }){
    //         if(response)
    //         {
    //           const whereClause = { id: getDataBillPayment.id };
    //           const updateData = { 
    //             payment_status: response.status,
    //             status: 3,
    //             resp_amount: amount,
    //             bill_no: response.txn_id,
    //             bill_date: date.getTime(),
    //             trax_id: response.txn_id,
    //           };
    //           const paymentEntry = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });
                
    //             await this.db.bbpsBillFetch.update(
    //               { status: 3 }, 
    //               { where: {transaction_id:transaction_id}, t }
    //             );

    //             await this.db.upi_order.update(
    //               {order_status: response.status },
    //               { where: { user_id:user_id,order_id:transaction_id }, t }
    //             );
    //             updateData.transaction_id = transaction_id;
    //             await t.commit();
    //             return res.status(200).json({ status: 500, error: 'Sorry ! Failed to bill Paymenty', data: updateData});
    //         }
    //       }

    //     }else{
    //       return res.status(200).json({ status: 500,error: 'You do not have sufficient wallet balance' });
    //     }
        
        
    //   }catch (error) {
        
    //     await t.rollback();
    //       logger.error(`Unable to find user: ${error}`);
    //       if (error.name === 'SequelizeValidationError') {
    //         const validationErrors = error.errors.map((err) => err.message);
    //         return res.status(500).json({ status: 500,errors: validationErrors });
    //       }
        
    //       return res.status(500).json({ status: 500,  message: error ,data:[]});
    //   }

    // }
    
    
    async billPayHoldApprove(req, res)
    {
      const { user_id, transaction_id } = req;

      const requiredKeys = Object.keys({ user_id, transaction_id});
              
      if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
          return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
      }

      let t = await this.db.sequelize.transaction();

      try
      {

        let date = new Date();
        let crdate = utility.formatDate(date);
        let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        firstDay = utility.formatDate(firstDay);
        lastDay = utility.formatDate(lastDay);
        let walletbalance = await this.db.wallet.getWalletAmount(user_id);
        
        const whereClause = {'user_id': user_id, 'transaction_id': transaction_id, 'status': 4 }
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

        const whereChk={id:user_id};
        const UserAttribute=['first_name','last_name','mobile', 'email'];
        const userRow = await this.db.user.getData(UserAttribute,whereChk);

        const mobile = userRow.mobile;
        const ConsumerNumber = mobile;
        const prime_amount = getDataBillPayment.service_amount;
        const cashback_amount = getDataBillPayment.cashback_amount;

        const biller_info = await this.db.bbpsBillerInfo.getData({biller_id: biller_id});
        const resultData = await this.db.bbpsBillFetch.getData({biller_id: biller_id, user_id: user_id, transaction_id: transaction_id, status:2});

        let request_id= resultData.request_id;
        let input_params= resultData.input_params;
        let biller_response= resultData.biller_response;
        let additional_info= resultData.additional_info;

        // if(walletbalance!=null && walletbalance> 0 && amount <= walletbalance)
        // {
          //const {result:response, panel_id } = await rechargeUtility.kppsbbps(service_url, requestId, transaction_id, operator_code, mobile, ConsumerNumber, amount, panelId, input_params);
          const {result, reqData} = await bbpsUtility.bbpsBillPay(amount, biller_id, request_id, biller_info.biller_adhoc, userRow.mobile, userRow.email, input_params, biller_response, additional_info);


            if(result.ExtBillPayResponse.responseCode == '000')
            {
              
              const base = result.ExtBillPayResponse;
              //update in bill payment
              const updateData = { 
                consumer_name: base.RespCustomerName, 
                payment_status: 'SUCCESS',
                response_code: base.responseCode,
                status: 1,
                resp_amount: base.RespAmount/100,
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
                { where: {transaction_id:transaction_id}, t }
              );

              await this.db.upi_order.update(
                {order_status: 'SUCCESS' },
                { where: { user_id:user_id,order_id:transaction_id }, t }
              );

              await t.commit();
              updateData.transaction_id = transaction_id;
              return res.status(200).json({ status: 200,  message: 'Bill payment successfully done', data:updateData});

            }else{

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
                  user_id:user_id,
                  env:config.env, 
                  tran_type:'Credit',
                  tran_sub_type:'Bill Payment',
                  tran_for:'Refund',
                  trans_amount:amount,
                  currency:'INR',
                  order_id:reTransaction_id,
                  order_status:'SUCCESS',
                  created_on:Date.now(),
                  created_by:user_id,
                  ip_address:0
              };
              
              const generateorder = await this.db.upi_order.insertData(reorderData); 
              if(generateorder)
              {
                //entry in wallet for deduction
                const walletData = {
                    transaction_id:reTransaction_id,
                    user_id:user_id,
                    env: config.env,
                    type:'Credit',
                    amount:d_amount,
                    sub_type:'Bill Payment',
                    tran_for:'main'
                };
                
                const walletEntry = await this.db.wallet.insert_wallet(walletData, { transaction: t });
    
                if(walletEntry && cashback_amount > 0)
                {
    
                    const cashbackData = {
                        user_id:user_id, 
                        env: config.env, 
                        type: 'Credit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Refund', 
                        amount:cashback_amount,
                        transaction_id:reTransaction_id
                    
                    };
                    const cashbackEntry = await this.db.cashback.insert_cashback_wallet(cashbackData, { transaction: t });
                }
    
                if(walletEntry && prime_amount>0)
                {
                    const primeData = {
                        user_id:user_id, 
                        env: config.env, 
                        type: 'Debit', 
                        sub_type: 'Bill Payment', 
                        tran_for: 'Bill Payment', 
                        amount:prime_amount,
                        transaction_id:reTransaction_id
                    };
                    
                    const primeEntry = await this.db.prime.insert_prime_wallet(primeData, { transaction: t });

                }
    
    
                await this.db.bbpsBillFetch.update(
                  { status: 3 }, 
                  { where: {transaction_id:transaction_id}, t }
                );
  
                await this.db.upi_order.update(
                  {order_status: 'FAILED' },
                  { where: { user_id:user_id,order_id:transaction_id }, t }
                );
              }

              await t.commit();
              updateData.transaction_id = reTransaction_id;
              return res.status(200).json({ status: 200,  message: 'Bill payment failed', data:updateData});

            }


        // }else{
        //   return res.status(200).json({ status: 500,error: 'You do not have sufficient wallet balance' });
        // }
        
        
      }catch (error) {
        
        await t.rollback();
          logger.error(`Unable to find user: ${error}`);
          if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map((err) => err.message);
            return res.status(500).json({ status: 500,errors:'Internal Server Error', data:validationErrors });
          }
        
          return res.status(500).json({ status: 500,  message: error.message ,data:[]});
      }

    }


    async billPaymentReject(req, res) {

      const { user_id, transaction_id, reject_reason, admin_user_id } = req;

      const requiredKeys = Object.keys({ user_id, transaction_id, reject_reason, admin_user_id });
              
      if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
          return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
      }
      let t = await this.db.sequelize.transaction();

      try {
        let date = new Date();
        const whereClause = {'user_id': user_id, 'transaction_id': transaction_id, 'status': 4 }
        const getDataBillPayment = await this.db.bbpsBillPayment.getData(whereClause, { transaction: t });

        if(getDataBillPayment)
        {
          const updateData = { 
            payment_status: 'REJECT',
            description: reject_reason,
            status: 5,
            updated_on: date.getTime(),
            updated_by: admin_user_id
          }


          const whereClause = { id:getDataBillPayment.id };
          const paymentUpdate = await this.db.bbpsBillPayment.updateData(updateData, whereClause, { transaction: t });

          if(paymentUpdate)
          {

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
            return res.status(200).json({ status: 200,  message: 'Bill payment rejected successfully'});
          }

        }else{
          return res.status(201).json({ status: 500, message: 'Data not found', data: [] });
        }


      }catch (error) {
         
        logger.error(`Unable to find record: ${error}`);
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
          return res.status(500).json({ status: 500,errors: validationErrors });
        }
      
        return res.status(500).json({ status: 500,  message: error.message ,data:[]});
      }
    }
    
    
    async billFetchTesting(req,res,ipAddress) {  
        let t = await this.db.sequelize.transaction();
        try {
            
            const { biller_id, user_id, mobile_no, email_id, inputParam } = req;
            const requiredKeys = Object.keys({ biller_id, user_id, mobile_no, email_id });
            let date = new Date();

            if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
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
                
                return res.status(200).json({ status: 200, message: result.billFetchResponse.errorInfo.error.errorMessage, data: result, reqData:reqData});
                
          } catch (error) {
            console.error('An error occurred:', error);
            // Handle the error or throw it again if needed
            return res.status(500).json({ status: 500, error: error.message });
          }
    }
    
   
}

module.exports = new BillPayment();