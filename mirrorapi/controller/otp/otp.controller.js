const { connect } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
const utility = require('../../utility/utility');
const smsUtility = require('../../utility/sms.utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const moment = require('moment');
const messagingService = require('../../router/whatsapp/messagingService');
const emailUtility = require('../../utility/email.utility');
const whatsappUtility = require('../../utility/whatsapp.utility');

class Otp {

  db = {};

  constructor() {
    this.db = connect();

  }

  async getOtp(req, res) {
    const decryptedObject = utility.DataDecrypt(req.body.encReq);
    // const decryptedObject = utility.DataDecrypt(req.encReq);
    const requiredKeys = ['mode', 'type', 'category', 'mobile', 'email', 'name'];

    if (!requiredKeys.every(key => key in decryptedObject)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing', columns: requiredKeys })));
    }

    const {
      mode,
      type,
      category,
      mobile,
      email,
      name,
    } = decryptedObject;

    try {
      const getUserSearchByData = { mobile: mobile }
      const userRow = await this.db.user.getUserSearchByDataWithOR(getUserSearchByData);

      if ((!userRow && category == 'Forgot Password') || (userRow && category == 'Register')) {
        if (category == 'Forgot Password') {
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'User not exists' })));
        } else {
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'User already exists' })));
        }

      }

      //  if (smsUtility.SendOtp) {
      let genOtp;
      let smsResponse = [];
      const fixedMob = ['9096608606', '1111111111', '9284277924', '8306667760', '9922337928'];
      const isIncluded = fixedMob.includes(mobile);
      if (isIncluded) {
        genOtp = '000000';
      } else {
        genOtp = smsUtility.generateOTP();
      }

      if (genOtp) {

        const results = await this.db.sequelize.transaction(async (t) => {
          const newOtp = await this.db.sms.create({
            mode,
            type,
            category,
            mobile,
            otp: genOtp,
            status: 1
          },
            { validate: true, transaction: t, logging: sql => logger.info(sql), }
          );
          return newOtp;
        });

        const otpMessage = `*${genOtp}* is Your One Time Password (OTP) ⏳
                             This code is valid for the next 5 minutes only.
                             Dear ${name || "User"} Ji, 👋
                             ⚠ Do not share this OTP with anyone for your account's safety 🔒.
                             — Team Mayway Business`;


        messagingService.sendMessage(mobile, otpMessage, null, email, "Otp Alert", otpMessage);

        if (results) {
          if (!isIncluded) {
            smsResponse = await smsUtility.countrySendOtp(mobile, genOtp);
          }
        }

        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success' })));
      }

      if (smsResponse.error) {
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'SMS Error' })));
      }



      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'DB Error' })));

      //  }else{
      //      return res.status(404).json(utility.DataEncrypt(JSON.stringify({ status: 404, message: 'Not Received' })));
      //  }


    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message })));
    }

  }

  async VerifyOtp(req, res) {
    const decryptedObject = utility.DataDecrypt(req.body.encReq);
        // const decryptedObject = req.body;

    const requiredKeys = ['otp', 'mode', 'type', 'category', 'mobile'];

    if (!requiredKeys.every(key => key in decryptedObject)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing', columns: requiredKeys })));
    }

    const {
      otp,
      mode,
      type,
      category,
      mobile
    } = decryptedObject;

    try {

      const userSms = await this.db.sms.findOne({
        where: {
          otp,
          mode,
          type,
          category,
          mobile,
          status: 1
        },
        order: [['id', 'DESC']],
        limit: 1, // Limit the result to one row
        logging: sql => console.log(sql) // Log the SQL query
      });
      if (userSms) {
        const dateDiffInMin = Math.round(Math.abs(moment().diff(moment(userSms.created_on), 'minutes', true) * 100) / 100);

        if (dateDiffInMin <= 15) {

          const updateData = {
            status: 0,
            modified_on: new Date(),
          };

          // Update the row in the database
          await this.db.sms.update(updateData, {
            where: {
              id: userSms.id,
              mobile: userSms.mobile,
              otp: userSms.otp
            },
          });

          const response = {
            status: 200,
            message: 'Otp verified'
          };
          try {
            const getUserSearchByData = { mobile: mobile }
            const userRow = await this.db.user.getUserSearchByDataWithOR(getUserSearchByData);

            const message = await whatsappUtility.loginWhatsappMessage(userRow.first_name, userRow.last_name, null, userRow.mobile);
            const emailMsg = await emailUtility.loginEmailMessage(userRow.first_name, userRow.last_name, null, userRow.mobile);
            messagingService.sendMessage(userRow.mobile, message, null, userRow.email, "Login Alert", emailMsg);

          } catch (err) {
            console.log(err);
          }
          return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: response })));

        } else {

          const response = {
            status: 500,
            message: 'Otp expired'
          };
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, error: response, message: response })));

        }
      } else {
        return res.status(401).json(utility.DataEncrypt(JSON.stringify({ status: 401, error: 'Wrong Otp', message: 'Wrong Otp', data: [] })));
      }

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message })));
    }

  }

   async getMobileOtp(req, res) {
    const decryptedObject = utility.DataDecrypt(req.body.encReq);
    // const decryptedObject = utility.DataDecrypt(req.encReq);
    const requiredKeys = ['mode', 'type', 'category', 'mobile', 'email', 'name'];

    if (!requiredKeys.every(key => key in decryptedObject)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing', columns: requiredKeys })));
    }

    const {
      mode,
      type,
      category,
      mobile,
      email,
      name,
    } = decryptedObject;

    try {
      
      let genOtp;
      let smsResponse = [];
      const fixedMob = ['9096608606', '1111111111', '9284277924', '8306667760', '9922337928'];
      const isIncluded = fixedMob.includes(mobile);
      if (isIncluded) {
        genOtp = '000000';
      } else {
        genOtp = smsUtility.generateOTP();
      }

      if (genOtp) {

        const results = await this.db.sequelize.transaction(async (t) => {
          const newOtp = await this.db.sms.create({
            mode,
            type,
            category,
            mobile,
            otp: genOtp,
            status: 1
          },
            { validate: true, transaction: t, logging: sql => logger.info(sql), }
          );
          return newOtp;
        });

        const otpMessage = `*${genOtp}* is Your One Time Password (OTP) ⏳
                             This code is valid for the next 5 minutes only.
                             Dear ${name || "User"} Ji, 👋
                             ⚠ Do not share this OTP with anyone for your account's safety 🔒.
                             — Team Mayway Business`;


        messagingService.sendMessage(mobile, otpMessage, null, email, "Otp Alert", otpMessage);

        if (results) {
          if (!isIncluded) {
            smsResponse = await smsUtility.countrySendOtp(mobile, genOtp);
          }
        }

        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success' })));
      }

      if (smsResponse.error) {
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'SMS Error' })));
      }



      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'DB Error' })));

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message })));
    }

  }
  async getEmailOtp(req, res) {
    const decryptedObject = req.body; // or utility.DataDecrypt(req.encReq)
    const requiredKeys = ['mode', 'type', 'category', 'email'];

    if (!requiredKeys.every(key => key in decryptedObject)) {
      return res.status(400).json(JSON.stringify({
        status: 400,
        message: 'Required input data is missing',
        columns: requiredKeys
      }));
    }

    const { mode, type, category, email } = decryptedObject;
    console.log("decryptedObject ", decryptedObject);

    try {

      // Generate OTPs
      const emailOtp = smsUtility.generateEmailOTP();
      console.log("emailOtp is: ", emailOtp);

      // Save Email OTP in database
      const results = await this.db.sequelize.transaction(async (t) => {
        const newOtp = await this.db.sms.create({
          mode,
          type,
          category,
          mobile: email,  // no mobile for email OTP
          otp: emailOtp,
          status: 1
        }, { validate: true, transaction: t, logging: sql => logger.info(sql) });
        return newOtp;
      });

      // Prepare email message
      const emailOtpMessage = `
Dear ${email},

Your One-Time Password (OTP) is:  ${emailOtp}

This OTP is valid for the next 5 minutes. Please do not share it with anyone to keep your account secure.

If you did not request this OTP, please ignore this email.

  Best regards,
Team Mayway Business
`

      // Send Email
      const emailOtpResponse = await emailUtility.send_mail(email, "Your OTP for Boltpe Login", emailOtpMessage);
      console.log("emailOtpResponse: ", emailOtpResponse);

      return res.status(200).json(JSON.stringify({ status: 200, message: 'Email OTP sent successfully' }));

    } catch (err) {
      logger.error(`Unable to generate Email OTP: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(JSON.stringify({ status: 500, errors: validationErrors }));
      }
      return res.status(500).json(JSON.stringify({ status: 500, message: err.message }));
    }
  }

  async VerifyEmailOtp(req, res) {
    const decryptedObject = utility.DataDecrypt(req.body.encReq);
    // const decryptedObject = req.body
    const requiredKeys = ['otp', 'mode', 'type', 'category', 'email'];
    // console.log("decryptedObject email ", decryptedObject);

    if (!requiredKeys.every(key => key in decryptedObject)) {
      return res.status(400).json(
        utility.DataEncrypt(JSON.stringify({
          status: 400,
          message: 'Required input data is missing',
          columns: requiredKeys
        }))
      );
    }

    const { otp, mode, type, category, email } = decryptedObject;

    try {
      // Fetch the latest email OTP
      const emailOtpRow = await this.db.sms.findOne({
        where: {
          otp,
          mode,
          type,
          category,
          mobile: email,
          status: 1
        },
        order: [['id', 'DESC']],
        limit: 1,
        logging: sql => console.log(sql)
      });

      if (!emailOtpRow) {
        return res.status(401).json(
          utility.DataEncrypt(JSON.stringify({
            status: 401,
            error: 'Wrong OTP',
            message: 'Wrong OTP',
            data: []
          }))
        );
      }

      // Check if OTP is expired (valid for 15 minutes)
      const dateDiffInMin = Math.round(Math.abs(moment().diff(moment(emailOtpRow.created_on), 'minutes', true) * 100) / 100);
      if (dateDiffInMin > 15) {
        return res.status(500).json(
          utility.DataEncrypt(JSON.stringify({
            status: 500,
            error: 'OTP expired',
            message: 'OTP expired'
          }))
        );
      }

      // Mark OTP as used
      await this.db.sms.update(
        { status: 0, modified_on: new Date() },
        { where: { id: emailOtpRow.id } }
      );

      return res.status(200).json(
        utility.DataEncrypt(JSON.stringify({
          status: 200,
          message: 'Email OTP verified successfully'
        }))
      );

    } catch (err) {
      logger.error(`Unable to verify email OTP: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map(e => e.message);
        return res.status(500).json(
          utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors }))
        );
      }
      return res.status(500).json(
        utility.DataEncrypt(JSON.stringify({ status: 500, message: err.message }))
      );
    }
  }


  async CheckOtp(req, res) {
    const requiredKeys = ['otp', 'mode', 'type', 'category', 'mobile'];

    if (!requiredKeys.every(key => key in req)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing', columns: requiredKeys });
    }

    const {
      otp,
      mode,
      type,
      category,
      mobile
    } = req;

    try {


      const userSms = await this.db.sms.findOne({
        where: {
          otp,
          mode,
          type,
          category,
          mobile,
          status: 1
        },
        order: [['id', 'DESC']],
        limit: 1, // Limit the result to one row
        logging: sql => console.log(sql) // Log the SQL query
      });

      if (userSms) {
        const dateDiffInMin = Math.round(Math.abs(moment().diff(moment(userSms.created_on), 'minutes', true) * 100) / 100);

        if (dateDiffInMin <= 15) {

          const updateData = {
            status: 0,
            modified_on: new Date(),
          };

          // Update the row in the database
          await this.db.sms.update(updateData, {
            where: {
              id: userSms.id,
              mobile: userSms.mobile,
              otp: userSms.otp
            },
          });

          const response = {
            status: 200,
            message: 'Otp verified'
          };
          return res.status(200).json({ status: 200, message: response });

        } else {

          const response = {
            status: 500,
            message: 'Otp expired'
          };
          return res.status(500).json({ status: 500, message: response });

        }
      } else {
        return res.status(401).json({ status: 401, token: '', message: 'Wrong Otp', data: [] });
      }

    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }
      return res.status(500).json({ status: 500, message: err.message });
    }

  }


  async countryGetOtp(req, res) {
    //const decryptedObject = utility.DataDecrypt(req.encReq);
    const requiredKeys = ['mode', 'type', 'category', 'mobile', 'email', 'name'];

    if (!requiredKeys.every(key => key in req)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing', columns: requiredKeys });
    }

    const {
      mode,
      type,
      category,
      mobile,
      email,
      name,
    } = req;

    try {
      //   const getUserSearchByData={ mobile: mobile}
      //   const userRow=await this.db.user.getUserSearchByDataWithOR(getUserSearchByData);

      //   if((!userRow && category == 'Forgot Password') || (userRow && category == 'Register'))
      //   {
      //      if(category == 'Forgot Password'){
      //          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'User not exists' })));
      //      }else{
      //          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'User already exists' })));
      //      }

      //   }

      //  if (smsUtility.SendOtp) {
      let genOtp;
      let smsResponse = [];
      const fixedMob = ['1111111111'];
      const isIncluded = fixedMob.includes(mobile);
      if (isIncluded) {
        genOtp = '000000';
      } else {
        genOtp = smsUtility.generateOTP();
      }

      if (genOtp) {
        smsResponse = await smsUtility.countrySendOtp(mobile, genOtp);
        return smsResponse;
        //   const results = await this.db.sequelize.transaction(async (t) => {
        //   const newOtp = await this.db.sms.create({
        //       mode,
        //       type,
        //       category,
        //       mobile,
        //       otp:genOtp,
        //       status:1
        //     },
        //     {  validate: true, transaction: t,logging: sql => logger.info(sql),  }
        //     );
        //     return newOtp;
        //   });

        //   if(results)
        //   {
        //       if(!isIncluded)
        //       {
        //           smsResponse = await smsUtility.countrySendOtp(mobile, genOtp);
        //       }
        //   }

        //return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success'})));
      }

      // if (smsResponse.error) {
      //   return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'SMS Error' })));
      // }



      // return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'DB Error' })));

      //  }else{
      //      return res.status(404).json(utility.DataEncrypt(JSON.stringify({ status: 404, message: 'Not Received' })));
      //  }


    } catch (err) {
      logger.error(`Unable to find : ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }
      return res.status(500).json({ status: 500, message: err.message });
    }

  }


}




module.exports = new Otp();