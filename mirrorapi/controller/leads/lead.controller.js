const { connect, baseurl, config } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const utility = require('../../utility/utility');
const { paginate } = require('../../utility/pagination.utility');
const path = require('path');
require('dotenv').config();

class Lead {

  db = {};

  constructor() {
    this.db = connect();

  }

  async addLead(fileName, fileNames, req, res) {
    let t = await this.db.sequelize.transaction();

    const { category_id, lead_name, description, discount_upto, formFields } = req.body;

    console.log("req.body are: ", req.body);

    try {
      // Validate required fields
      if (!category_id || !lead_name || !description) {
        return res.status(400).json({ status: 400, message: 'Required fields are missing' });
      }

      const path = 'uploads/leads/';
      const lead_field_lebel = lead_name.replace(/\s+/g, '_').toLowerCase();

      // Check if lead already exists
      const existingLead = await this.db.leads.findOne({
        where: { status: 1, lead_name: lead_name, category_id: category_id }
      });

      if (!existingLead) {
        const instData = {
          lead_name,
          category_id,
          description,
          specification: description, // Using description for specification field
          img: fileName ? path + fileName : '',
          lead_field_lebel,
          discount_upto: discount_upto || null,
          input_params: JSON.stringify(formFields || []), // Store form fields in input_params
          status: 1,
          created_on: new Date()
        };

        console.log("instData ", instData);

        const newLead = await this.db.leads.insertData(instData, {
          validate: true,
          transaction: t,
          logging: sql => logger.info(sql),
        });

        console.log("newLead ", newLead);

        // Store form fields in leadsDetails table with group 'FormFields' if model exists
        if (formFields && formFields.length > 0 && this.db.leadsDetails) {
          let formFieldsFlag = 0;
          console.log("formFields are", formFields);
          for (const field of formFields) {
            const fieldData = {
              category_id: category_id,
              lead_header_id: newLead.id,
              lead_header_label: lead_field_lebel,
              lead_value: JSON.stringify(field), // Store field definition as JSON
              description: `Form Field: ${field.label}`,
              lead_detail_group: 'FormFields',
              status: 1,
              created_on: new Date()
            };

            try {
              const fieldInsert = await this.db.leadsDetails.insertData(fieldData, {
                transaction: t,
                logging: sql => logger.info(sql),
              });

              console.log("fieldInsert ", fieldInsert);

              if (fieldInsert) {
                formFieldsFlag = 1;
              }
            } catch (fieldError) {
              console.error('Error inserting form field:', fieldError);
              // Continue with other fields even if one fails
            }
          }
        } else if (formFields && formFields.length > 0) {
          console.log('leadsDetails model not available, skipping form field storage');
        }

        await t.commit();
        return res.status(201).json({
          status: 201,
          message: 'Lead added successfully',
          data: newLead
        });

      } else {
        await t.rollback();
        return res.status(400).json({ status: 400, error: 'Lead already exists' });
      }

    } catch (error) {
      await t.rollback();
      logger.error(`Error in add Lead: ${error}`);

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(400).json({ status: 400, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: 'Failed to create lead', data: [] });
    }
  }

  // Update lead (for edit functionality)
  async updateLead(fileName, fileNames, req, res) {

    let t = await this.db.sequelize.transaction();

    const { lead_id, category_id, lead_name, description, discount_upto, formFields } = req.body;

    try {

      // ---------- FIX: Parse formFields ----------
      let parsedFields = formFields;
      if (typeof formFields === "string") {
        try {
          parsedFields = JSON.parse(formFields);
        } catch (err) {
          console.log("❌ Error parsing formFields:", err);
          parsedFields = [];
        }
      }
      // ------------------------------------------

      if (!lead_id || !category_id || !lead_name || !description) {
        return res.status(400).json({ status: 400, message: "Required fields are missing" });
      }

      const path = 'uploads/leads/';
      const lead_field_lebel = lead_name.replace(/\s+/g, "_").toLowerCase();

      const updateData = {
        lead_name,
        category_id,
        description,
        specification: description,
        lead_field_lebel,
        discount_upto: discount_upto || null,
        input_params: JSON.stringify(parsedFields),
        modified_on: new Date()
      };

      if (fileName) {
        updateData.img = path + fileName;
      }

      // Update leads
      const updatedLead = await this.db.leads.UpdateData(
        updateData,
        { id: lead_id },
        { validate: true, transaction: t }
      );

      // ------------- UPDATE EXISTING FIELDS ONLY --------------
      if (parsedFields.length > 0) {

        const existingFields = await this.db.leadsDetails.findAll({
          where: {
            lead_header_id: lead_id,
            lead_detail_group: "FormFields",
            status: 1
          },
          order: [['id', 'ASC']],
          transaction: t
        });

        for (let i = 0; i < existingFields.length; i++) {
          if (parsedFields[i]) {

            await this.db.leadsDetails.UpdateData(
              {
                category_id,
                lead_header_label: lead_field_lebel,
                lead_value: JSON.stringify(parsedFields[i]),
                description: `Form Field: ${parsedFields[i].label}`,
                modified_on: new Date()
              },
              { id: existingFields[i].id },
              { transaction: t }
            );
          }
        }
      }
      // ---------------------------------------------------------

      await t.commit();
      return res.status(200).json({
        status: 200,
        message: "Lead updated successfully",
        data: { lead_id: updatedLead }
      });

    } catch (error) {
      await t.rollback();
      console.log("❌ ERROR:", error);
      return res.status(500).json({
        status: 500,
        message: "Failed to update lead"
      });
    }
  }

  // delete lead (not actual just status make 0)
  async deleteLead(req, res) {
    let t = await this.db.sequelize.transaction();

    try {
      const { lead_id } = req.body;

      if (!lead_id) {
        return res.status(400).json({
          status: 400,
          message: "lead_id is required"
        });
      }

      // =============================
      // 1️⃣ Fetch lead for image delete
      // =============================
      const lead = await this.db.leads.findOne({
        where: { id: lead_id, status: 1 }
      });

      if (!lead) {
        return res.status(404).json({
          status: 404,
          message: "Lead not found"
        });
      }

      // =============================
      // 2️⃣ Delete image from server
      // =============================
      if (lead.img) {
        const fs = require('fs');
        const imagePath = lead.img;  // example: uploads/leads/abc.png

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // =============================
      // 3️⃣ Soft delete Lead
      // =============================
      await this.db.leads.UpdateData(
        { status: 0, modified_on: new Date() },
        { id: lead_id },
        { transaction: t }
      );

      // =============================
      // 4️⃣ Soft delete Lead Form Fields
      // =============================
      await this.db.leadsDetails.UpdateData(
        { status: 0, modified_on: new Date() },
        { lead_header_id: lead_id },
        { transaction: t }
      );

      await t.commit();

      return res.status(200).json({
        status: 200,
        message: "Lead deleted successfully"
      });

    } catch (error) {
      await t.rollback();
      console.log("❌ Delete Lead Error:", error);

      return res.status(500).json({
        status: 500,
        message: "Failed to delete lead"
      });
    }
  }


  // Handle user form submissions
  async submitLeadForm(req, res) {
    let t = await this.db.sequelize.transaction();

    try {
      console.log("req.body ", req.body);
      console.log("req.files ", req.files);

      let form_data = req.body.form_data;

      // form_data may come as string from form-data
      if (typeof form_data === "string") {
        try {
          form_data = JSON.parse(form_data);
        } catch (e) {
          return res.status(400).json({
            status: 400,
            message: "Invalid form_data JSON"
          });
        }
      }

      const { lead_id, user_id, category_id, description } = req.body;

      if (!lead_id || !form_data) {
        return res.status(400).json({
          status: 400,
          message: "Lead ID and form data are required"
        });
      }

      // ============================
      // 1. Insert into user form header
      // ============================
      const userFormData = {
        user_id: user_id || null,
        lead_id,
        category_id,
        description: description || "Lead form submission",
        status: 1,
        created_on: new Date()
      };

      const newUserForm = await this.db.userForm.insertData(userFormData, {
        transaction: t,
        logging: sql => logger.info(sql),
      });

      console.log("newUserForm", newUserForm);

      // ============================
      // 2. Insert TEXT FIELDS from form_data
      // ============================
      if (form_data && Object.keys(form_data).length > 0) {
        for (const [fieldName, fieldValue] of Object.entries(form_data)) {
          const fieldDetail = {
            user_form_id: newUserForm.id,
            field_header: fieldName,
            field_value: fieldValue.toString(),
            status: 1,
            created_on: new Date(),
            data_type: typeof fieldValue,
          };

          console.log("fieldDetail", fieldDetail);

          await this.db.userFormDetails.insertData(fieldDetail, {
            transaction: t,
            logging: sql => logger.info(sql),
          });
        }
      }

      // ============================
      // 3. Insert FILE FIELDS (IMPORTANT)
      // ============================
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileDetail = {
            user_form_id: newUserForm.id,
            field_header: file.fieldname, // e.g. img, aadhaar_front
            field_value: file.path,       // uploads/leads/2/file.png
            status: 1,
            created_on: new Date(),
            data_type: "file",
          };

          console.log("fileDetail", fileDetail);

          await this.db.userFormDetails.insertData(fileDetail, {
            transaction: t,
            logging: sql => logger.info(sql),
          });
        }
      }

      // ============================
      // 4. Insert in leads user action
      // ============================
      const userActionData = {
        user_id: user_id || null,
        category_id,
        lead_id,
        action: "submitted",
        status: 1,
        created_on: new Date(),
        distributed_amount: 0
      };

      await this.db.leadsUserAction.insertData(userActionData, {
        transaction: t,
        logging: sql => logger.info(sql),
      });

      // ============================
      // 5. Insert tracking entry
      // ============================
      const trackData = {
        user_id: user_id || null,
        status: 1,
        created_on: new Date(),
        created_by: user_id || null
      };

      await this.db.lead_user_track.insertData(trackData, {
        transaction: t,
        logging: sql => logger.info(sql),
      });

      // Commit the transaction
      await t.commit();

      // FINAL RESPONSE
      return res.status(201).json({
        status: 201,
        message: "Lead form submitted successfully",
        data: {
          id: newUserForm.id,
          user_id: userFormData.user_id,
          lead_id: userFormData.lead_id,
          category_id: userFormData.category_id,
          description: userFormData.description,
          status: userFormData.status,
          created_on: userFormData.created_on,
          form_data: form_data
        }
      });

    } catch (error) {
      await t.rollback();
      logger.error(`Error in lead form submission: ${error}`);

      return res.status(500).json({
        status: 500,
        message: "Failed to submit lead form",
        error: error.message
      });
    }
  }

  // Get lead reports for admin
  async getLeadReports(req, res) {
    try {
      const { category_id } = req.body;

      // Filter leads
      let whereCondition = { status: 1 };
      if (category_id) whereCondition.category_id = category_id;

      // Get leads
      const leads = await this.db.leads.getAllData(whereCondition);

      const leadReports = await Promise.all(
        leads.map(async (lead) => {

          // Get all user forms count
          const userForms = await this.db.userForm.getAllData({
            lead_id: lead.id,
            status: 1
          });

          const totalLeads = userForms.length;

          // Get status-wise counts
          const openCount = await this.db.leadsUserAction.getAllCount({ lead_id: lead.id, status: 1 });
          const closeCount = await this.db.leadsUserAction.getAllCount({ lead_id: lead.id, status: 2 });
          const pendingCount = await this.db.leadsUserAction.getAllCount({ lead_id: lead.id, status: 3 });
          const reviewCount = await this.db.leadsUserAction.getAllCount({ lead_id: lead.id, status: 4 });
          const transferCount = await this.db.leadsUserAction.getAllCount({ lead_id: lead.id, status: 5 });

          // Latest action → Lead Status
          const latestAction = await this.db.leadsUserAction.getDataWithClause(lead.id);

          let leadStatus = "open";
          if (latestAction && latestAction.length > 0) {
            const st = latestAction[0].status;
            leadStatus =
              st === 1 ? "open" :
                st === 2 ? "close" :
                  st === 3 ? "pending" :
                    st === 4 ? "review" :
                      st === 5 ? "transfer" : "open";
          }

          return {
            sr_no: lead.id,
            lead_at_date: lead.created_on,
            lead_name: lead.lead_name,

            // **Button only → not full data**
            lead_details: {
              button: true,
              lead_id: lead.id
            },

            total_lead: totalLeads,
            open_lead: {
              open: openCount,
              close: closeCount,
              pending: pendingCount,
              review: reviewCount,
              transfer: transferCount
            },

            action: leadStatus
          };
        })
      );

      return res.status(200).json({
        status: 200,
        message: "Lead reports fetched successfully",
        data: leadReports
      });

    } catch (error) {
      console.log(error);
      return res.status(500).json({
        status: 500,
        message: "Failed to fetch lead reports"
      });
    }
  }


  // Controller method: get all submissions for a specific lead
  async getLeadSubmissionsByLeadId(req, res) {
    try {

      console.log("📌 API Called: getLeadSubmissionsByLeadId()");
      console.log("📥 Incoming Request Body:", req.body);

      const { lead_id } = req.body;

      if (!lead_id) {
        console.log("❌ Error: lead_id missing");
        return res.status(400).json({ status: 400, message: 'Lead ID is required' });
      }

      console.log("🔎 Fetching Lead Info for Lead ID:", lead_id);

      // Get lead information
      const lead = await this.db.leads.getDataById(lead_id);

      console.log("📤 Lead Response:", lead);

      if (!lead) {
        console.log("❌ Lead not found for ID:", lead_id);
        return res.status(404).json({ status: 404, message: 'Lead not found' });
      }

      // Get form field definitions
      console.log("📝 Parsing input_params for form fields");
      const formFields = lead.input_params ? JSON.parse(lead.input_params) : [];
      console.log("📋 Form Fields:", formFields);

      // Get all user form submissions by lead ID
      console.log("🔎 Fetching user form submissions for lead ID:", lead_id);

      const userForms = await this.db.userForm.getDataWithClause({ lead_id });

      console.log("📤 User Forms Found:", userForms.length);
      console.log("🧾 Full User Forms:", userForms);

      // Process each user form
      const submissions = await Promise.all(userForms.map(async (form, index) => {

        console.log(`\n➡️ Processing Submission #${index + 1}`);
        console.log("🧍 User Form:", form);

        const formDetails = await this.db.userFormDetails.getDataWithClause({
          user_form_id: form.id
        });

        console.log(`🧩 Field Values for user_form_id ${form.id}:`, formDetails);

        // Map form definitions with values
        const formData = formFields.map(field => {
          const userValue = formDetails.find(detail => detail.field_header === field.name);

          console.log(`🔗 Field Mapping -> Field: ${field.name}, UserValue:`, userValue);

          return {
            field_name: field.name,
            field_label: field.label,
            field_type: field.type,
            user_value: userValue ? userValue.field_value : 'Not provided'
          };
        });

        console.log("📦 Final Mapped Field Data:", formData);

        return {
          user_form_id: form.id,
          user_id: form.user_id,
          username: form.username || '',
          created_at: form.created_at,
          status: form.status,
          form_data: formData
        };
      }));

      console.log("\n✅ FINAL SUBMISSION RESULT:", submissions);

      return res.status(200).json({
        status: 200,
        message: 'Lead submissions fetched successfully',
        data: {
          lead_info: lead,
          form_fields: formFields,
          submissions
        }
      });

    } catch (error) {
      console.error("🔥 Error in getLeadSubmissionsByLeadId:", error);
      return res.status(500).json({ status: 500, message: 'Failed to fetch lead submissions' });
    }
  }

  // Update lead status (open, close, pending, review, transfer)
  async updateLeadStatus(req, res) {
    let t = await this.db.sequelize.transaction();

    const { lead_id, user_action_id, status, remarks, distributed_amount } = req.body;

    try {
      if (!user_action_id || !status) {
        return res.status(400).json({ status: 400, message: 'User Action ID and status are required' });
      }

      // Map status string to numeric status
      const statusMap = {
        'open': 1,
        'close': 2,
        'pending': 3,
        'review': 4,
        'transfer': 5
      };

      const numericStatus = statusMap[status] || 1;

      const updateData = {
        status: numericStatus,
        modified_on: new Date()
      };

      if (remarks) updateData.remarks = remarks;
      if (distributed_amount) updateData.distributed_amount = distributed_amount;

      const updatedAction = await this.db.leadsUserAction.UpdateData(
        updateData,
        { id: user_action_id },
        { transaction: t }
      );

      // Add remarks if provided
      if (remarks) {
        const remarkData = {
          user_id: updatedAction.user_id,
          lead_id: lead_id,
          category_id: updatedAction.category_id,
          remarks: remarks,
          status: 1,
          created_on: new Date()
        };

        await this.db.LeadRemarks.insert(remarkData, {
          transaction: t,
          logging: sql => logger.info(sql),
        });
      }

      // Track status update
      const trackData = {
        user_id: updatedAction.user_id,
        status: `status_updated_to_${status}`,
        created_on: new Date(),
        created_by: req.user?.id || null // Assuming you have user info in request
      };

      await this.db.lead_user_track.insertData(trackData, {
        transaction: t,
        logging: sql => logger.info(sql),
      });

      await t.commit();
      return res.status(200).json({
        status: 200,
        message: 'Lead status updated successfully',
        data: updatedAction
      });

    } catch (error) {
      await t.rollback();
      logger.error(`Error in updating lead status: ${error}`);
      return res.status(500).json({ status: 500, message: 'Failed to update lead status' });
    }
  }

  // Get lead form fields for user side
  async getLeadFormFields(req, res) {
    try {
      const { lead_id } = req.body;

      if (!lead_id) {
        return res.status(400).json({ status: 400, message: 'Lead ID is required' });
      }

      const lead = await this.db.leads.getDataById(lead_id);

      if (!lead) {
        return res.status(404).json({ status: 404, message: 'Lead not found' });
      }

      // Get form fields from input_params (JSON stored in lead table)
      const formFields = lead.input_params ? JSON.parse(lead.input_params) : [];

      // Alternative: Get from leadsDetails table with group 'FormFields'
      // const formFieldsDetails = await this.db.leadsDetails.getDataWithClause({
      //   lead_header_id: lead_id,
      //   lead_detail_group: 'FormFields'
      // });

      return res.status(200).json({
        status: 200,
        message: 'Lead form fields fetched successfully',
        data: {
          lead_name: lead.lead_name,
          description: lead.description,
          discount_upto: lead.discount_upto,
          form_fields: formFields
        }
      });

    } catch (error) {
      logger.error(`Error in getting lead form fields: ${error}`);
      return res.status(500).json({ status: 500, message: 'Failed to fetch lead form fields' });
    }
  }

  async getLeadReport(req, res) {

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
      const result = await this.db.leads.getAllData(whereCondition);

      const leadResult = [];

      for (const item of result) {

        const categoryData = await this.db.leadsCategory.getData(['category_name'], { id: item.category_id });

        leadResult.push({
          category_name: categoryData ? categoryData.category_name : '',

          ...item.dataValues,
          img: baseurl + item.img,
          created_on: utility.formatDateTimeDMY(item.created_on)
        });
      }

      const report = {
        total_count: await this.db.leads.count({ where: { ...whereCondition } }, 'id'),
        total_active: await this.db.leads.count({ where: { ...whereCondition, status: `1` } }),
        total_inactive: await this.db.leads.count({ where: { ...whereCondition, status: `0` } }),

      }


      return res.status(200).json({ status: 200, message: 'success', data: leadResult, report });


    } catch (error) {
      logger.error(`Unable to find user: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: error, data: [] });
    }

  }
}




module.exports = new Lead();