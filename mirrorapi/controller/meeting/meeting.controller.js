const { connect, baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const utility = require('../../utility/utility');
const path = require('path');
require('dotenv').config();
const moment = require('moment'); // install if not already: npm i moment

class Meeting {

  db = {};

  constructor() {
    this.db = connect();

  }





  async addMeeting(req, res) {
    let t;
    try {
      // 1️⃣ Decrypt incoming data
      const decrypted = (req.body)
      const { meeting_name, meeting_link, description, meeting_date, meeting_time } = decrypted;
      const created_by = req.user?.id;

      t = await this.db.sequelize.transaction();

      // 2️⃣ Prepare data
      const filePath = req.file ? `uploads/meeting/${req.file.filename}` : null;

      const Data = {
        name: meeting_name,
        meeting_link: meeting_link || null,
        description,
        meeting_date,
        meeting_time,
        image: filePath,
        created_on: moment().format('YYYY-MM-DD HH:mm:ss'),
        created_by: created_by || null,
      };

      // 3️⃣ Insert into DB
      const newMeeting = await this.db.meeting.insertData(Data, { transaction: t, logging: sql => console.log(sql) });
      await t.commit();

      // 4️⃣ Encrypt response
      const encryptedResponse = (JSON.stringify({ message: 'Meeting added successfully', data: newMeeting }));
      return res.status(201).json({ status: 201, message: encryptedResponse });

    } catch (error) {
      if (t) await t.rollback();
      console.error('Error in addMeeting:', error);

      const encryptedError = (JSON.stringify({ error: error.message }));
      return res.status(500).json({ status: 500, message: encryptedError });
    }
  }



  async meetingList(req, res) {
    const { from_date, to_date } = req;

    try {

      let whereCondition;

      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      endDate.setHours(23, 59, 59);

      whereCondition = {
        'created_on': {
          [Op.between]: [startDate, endDate]
        },
      }
      const result = await this.db.meeting.getAllData(whereCondition);

      const meetingResult = [];

      for (const item of result) {


        meetingResult.push({

          ...item.dataValues,
          image: baseurl + item.image,
        });
      }




      return res.status(200).json({ status: 200, message: 'success', data: meetingResult });

    }
    catch (err) {
      logger.error(`Unable to find Banner: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }
      return res.status(500).json({ status: 500, token: '', message: err, data: [] });
    }

  }







  async updateLikeShareCount(req, res) {

    const { id, action } = req;

    const requiredKeys = Object.keys({ id, action });

    if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    }

    let t;

    try {

      const like_count = (action === 'Like') ? 1 : 0;
      const share_count = (action === 'Share') ? 1 : 0;


      const whereCondition = {
        'id': id
      }

      const graphics = await this.db.graphics.findOne({
        where: whereCondition,
      });

      const likeCount = graphics.dataValues.like_count + like_count
      const shareCount = graphics.dataValues.share_count + share_count


      const currentDate = new Date();
      const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

      const updatedStatus = await this.db.graphics.UpdateData(
        {

          like_count: likeCount,
          share_count: shareCount,
          modified_on: created_on
        },

        { id: id }

      );

      if (updatedStatus > 0) {
        return res.status(200).json({ status: 200, message: 'Graphics Updated Successful.' });
      } else {
        return res.status(500).json({ status: 500, message: 'Failed to Update data', data: [] });
      }

    } catch (error) {
      logger.error(`Unable to find Feedback: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: error, data: [] });
    }
  }



  async getMeeting(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { date, user_id } = decryptedObject;

    try {

      let whereCondition;

      //const startDate1=utility.formatDate(new Date(date));
      //const endDate1=utility.formatDate(new Date(date));

      const startDate = new Date();
      startDate.setHours(0, 0, 0);
      //   const endDate =new Date(endDate1);
      //   endDate.setHours(23, 59, 59);

      whereCondition = {
        'meeting_date': {
          [Op.gte]: startDate
        }
      }

      const result = await this.db.meeting.getAllData(whereCondition);

      const meetingResult = [];

      for (const item of result) {

        const user_details = await this.db.meetingDetails.getData(['meeting_id', 'user_id', 'is_enroll', 'is_invite', 'is_join'],
          { user_id: user_id, meeting_id: item.id }

        );

        const get_total_enroll = await this.db.meetingDetails.getUserCount({ meeting_id: item.id, is_enroll: 1 });
        const get_total_invite = await this.db.meetingDetails.getUserCount({ meeting_id: item.id, is_invite: 1 });
        const get_total_join = await this.db.meetingDetails.getUserCount({ meeting_id: item.id, is_join: 1 });

        let is_enroll = 0;
        let is_invite = 0;
        let is_join = 0;

        if (user_details !== null) {
          is_enroll = user_details.is_enroll;
          is_invite = user_details.is_invite;
          is_join = user_details.is_join;
        }

        meetingResult.push({

          ...item.dataValues,
          is_invite,
          is_enroll,
          is_join,
          image: baseurl + item.image,
          total_enroll: get_total_enroll,
          total_invite: get_total_invite,
          total_join: get_total_join,
        });

      }

      return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'success', data: meetingResult })));
      //return res.status(200).json({ status: 200,  message:'success', data : meetingResult });
    }
    catch (err) {
      logger.error(`Unable to find Meeting: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
        //return res.status(500).json({ status: 500,errors: validationErrors });

      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, token: '', message: err.message, data: [] })));
      //return res.status(500).json({ status: 500,token:'', message: err.message,data: []  });

    }

  }





  async updateUserwiseMeetingDetails(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const {
      user_id,
      meeting_id,
      is_invite,
      is_enroll,
      is_join

    } = decryptedObject;

    const requiredKeys = Object.keys({
      user_id,
      meeting_id,
      is_invite,
      is_enroll,
      is_join
    });

    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));

    }


    let t;

    try {
      let updatedResult = '';


      const userRow = await this.db.meetingDetails.findOne({
        where: {
          user_id: user_id,
          meeting_id: meeting_id
        }
      });

      const currentDate = new Date();
      const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');



      if (userRow) {
        const data = {

          is_invite,
          is_enroll,
          is_join,
          modified_on: created_on,
          modified_by: user_id

        };
        updatedResult = await this.db.meetingDetails.UpdateData(data, { user_id: userRow.user_id, meeting_id: userRow.meeting_id });

      } else {
        const data = {
          user_id,
          meeting_id,
          is_invite,
          is_enroll,
          is_join,
          created_by: user_id

        };
        updatedResult = await this.db.meetingDetails.insertData(data);
      }

      if (updatedResult) {
        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Record Successful.' })));
      } else {
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Failed to Update data', data: [] })));
      }

    } catch (error) {
      logger.error(`Unable to find meeting: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));

      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: error, data: [] })));

    }
  }


  async meetingEnrollReport(req, res) {

    const { from_date, to_date } = req;

    try {

      let whereCondition;

      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      endDate.setHours(23, 59, 59);

      whereCondition = {
        'enroll_created_on': {
          [Op.between]: [startDate, endDate]
        },
      }

      const result = await this.db.viewMeetingDetails.getAllData(whereCondition);

      const meetingResult = [];

      for (const item of result) {

        meetingResult.push({
          ...item.dataValues,
          image: baseurl + item.image,
        });

      }

      return res.status(200).json({ status: 200, message: 'success', data: meetingResult });

    }
    catch (err) {
      logger.error(`Unable to find Meeting: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }
      return res.status(500).json({ status: 500, token: '', message: err, data: [] });
    }

  }













}




module.exports = new Meeting();