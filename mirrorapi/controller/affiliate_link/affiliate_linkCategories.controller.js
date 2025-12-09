const { connect, baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
const utility = require('../../utility/utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config();
const whatsappUtility = require('../../utility/whatsapp.utility');

class Insuarnce {

  db = {};

  constructor() {
    this.db = connect();

  }



  async getAffiliateCategory(req, res) {
    try {

      const report = {
        totalAffilatelinkListCount: await this.db.affiliateLinkCategories.count(),
        totalDeleteAffilatelinkList: await this.db.affiliateLinkCategories.count({ where: { status: `0` } }),
        totalActiveAffilatelinkList: await this.db.affiliateLinkCategories.count({ where: { status: `1` } }),
        totalInactiveAffilatelinkList: await this.db.affiliateLinkCategories.count({ where: { status: `2` } }),
      }

      const category = await this.db.affiliateLinkCategories.getCategory();
      if (category) {
        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Category Found successfully', data: category, report })));
        // return res.status(200).json({ status: 200, message: 'Category Found successfully', data: category });
      } else {
        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Category Not Found', data: [] })));
        // return res.status(200).json({ status: 200, message: 'Category Not Found', data: [] });
      }

    }
    catch (err) {
      logger.error(`Unable to find Insuarnce: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
        // return res.status(500).json({ status: 500,errors: validationErrors });
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, token: '', message: err, data: [] })));
      // return res.status(500).json({ status: 500,token:'', message: err,data: []  });
    }

  }


  async addCategory(req, res) {
    let t;

    try {
      const { category_name, sub_category } = req.body;

      // Validate
      if (!category_name || category_name.trim() === "") {
        return res.status(400).json({
          status: 400,
          message: "Category name is required"
        });
      }

      t = await this.db.sequelize.transaction();

      // Check duplicate
      const existingCategory = await this.db.affiliateLinkCategories.getDataWithClause(category_name);

      if (existingCategory.length > 0) {
        await t.rollback();
        return res.status(409).json({
          status: 409,
          message: "Category already exists"
        });
      }

      // Insert
      const categoryData = {
        category_name,
        sub_category: sub_category || null
      };

      const newCategory = await this.db.affiliateLinkCategories.insertData(categoryData, {
        validate: true,
        transaction: t,
      });

      await t.commit();

      return res.status(201).json({
        status: 201,
        message: "Category added successfully",
        data: newCategory
      });

    } catch (error) {
      if (t) await t.rollback();

      console.error("Error in addCategory:", error);

      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map(err => err.message);
        return res.status(500).json({
          status: 500,
          errors: validationErrors
        });
      }

      return res.status(500).json({
        status: 500,
        message: "Failed to create category",
        data: []
      });
    }
  }

  // async updateCategory(req, res) {
  //   let t;

  //   try {
  //     const { id, category_name, status, subcategories } = req.body;

  //     // Validate required fields
  //     if (!id || !category_name || category_name.trim() === "") {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Category ID and name are required"
  //       });
  //     }

  //     t = await this.db.sequelize.transaction();

  //     // Check if category exists
  //     const existingCategory = await this.db.affiliateLinkCategories.getById(id);
  //     if (!existingCategory) {
  //       await t.rollback();
  //       return res.status(404).json({
  //         status: 404,
  //         message: "Category not found"
  //       });
  //     }

  //     console.log(" req.body ", req.body)
  //     const updateData = {
  //       category_name,
  //       status: status || 1,
  //       subcategories: subcategories ? JSON.stringify(subcategories) : null,
  //       modified_on: new Date()
  //     };


  //     console.log("updateData ", updateData)
  //     // Update category
  //     const updatedCategory = await this.db.affiliateLinkCategories.updateData(id, updateData, {
  //       transaction: t,
  //     });
  //     console.log("updatedCategory ", updatedCategory)
  //     await t.commit();

  //     return res.status(200).json({
  //       status: 200,
  //       message: "Category updated successfully",
  //       data: updatedCategory
  //     });

  //   } catch (error) {
  //     if (t) await t.rollback();

  //     console.error("Error in updateCategory:", error);

  //     if (error.name === "SequelizeValidationError") {
  //       const validationErrors = error.errors.map(err => err.message);
  //       return res.status(500).json({
  //         status: 500,
  //         errors: validationErrors
  //       });
  //     }

  //     return res.status(500).json({
  //       status: 500,
  //       message: "Failed to update category",
  //       data: []
  //     });
  //   }
  // }

  async deleteCategory(req, res) {
    let t;

    try {
      console.log("🔥 Incoming deleteCategory request:", req.body);

      const { id, status } = req.body; // status: 0 = delete, 1/2 = change status
      console.log("➡ Extracted values → id:", id, "status:", status);

      if (!id) {
        console.log("❌ Validation failed: Missing ID");
        return res.status(400).json({
          status: 400,
          message: "Category ID is required"
        });
      }

      t = await this.db.sequelize.transaction();
      console.log("🟢 Transaction started");

      // 1️⃣ Check if category exists
      const existingCategory = await this.db.affiliateLinkCategories.getById(id);
      console.log("🔍 Existing category fetched:", existingCategory);

      if (!existingCategory) {
        console.log("❌ Category not found in DB, ID:", id);
        await t.rollback();
        return res.status(404).json({
          status: 404,
          message: "Category not found"
        });
      }

      // 2️⃣ Prepare update data
      const updateData = {
        status: status,
        modified_on: new Date()
      };
      console.log("📝 Prepared updateData:", updateData);

      // 3️⃣ Perform update
      console.log("➡ Calling updateData() with where: { id:", id, "}");
      const updatedCategory = await this.db.affiliateLinkCategories.updateData(
        updateData,
        { id }
      );

      console.log("✅ updatedCategory result:", updatedCategory);

      // 4️⃣ Commit transaction
      await t.commit();
      console.log("🟢 Transaction committed successfully");

      return res.status(200).json({
        status: 200,
        message:
          status === 0
            ? "Category deleted successfully"
            : "Category status updated",
        data: updatedCategory
      });

    } catch (error) {
      if (t) {
        console.log("🔴 Transaction rollback due to error");
        await t.rollback();
      }

      console.error("❌ Error in deleteCategory:", error);

      return res.status(500).json({
        status: 500,
        message: "Failed to update category status",
        error: error.toString()
      });
    }
  }


  async getCategory(req, res) {

    const { id } = req;

    const requiredKeys = Object.keys({ id });
    if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined)) {
      return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
    }

    let t;

    try {
      const whereCondition = {
        'id': id
      }
      const link = await this.db.affiliateLinkCategories.findOne({
        where: whereCondition,
      });

      if (link) {
        return res.status(200).json({ status: 200, message: 'Status Updated Successful.', data: link });
      } else {
        return res.status(500).json({ status: 500, message: 'Failed to Update data', data: [] });
      }

    } catch (error) {
      logger.error(`Unable to find link: ${error}`);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({ status: 500, errors: validationErrors });
      }

      return res.status(500).json({ status: 500, message: error, data: [] });
    }
  }

  async updateCategory(req, res) {
    const { id, category_name, status, subcategories } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Category ID required",
      });
    }

    const t = await this.db.sequelize.transaction();

    try {
      // 1️⃣ Fetch main category row
      const mainCategory = await this.db.affiliateLinkCategories.findOne({
        where: { id },
        transaction: t
      });

      if (!mainCategory) {
        await t.rollback();
        return res.status(404).json({
          status: 404,
          message: "Category not found"
        });
      }

      const oldCategoryName = mainCategory.category_name;

      // 2️⃣ Update main category
      await this.db.affiliateLinkCategories.update(
        {
          category_name,
          status,
          modified_on: new Date(),
          sub_category: null  // main category row always null
        },
        { where: { id }, transaction: t }
      );

      // 3️⃣ Delete all old subcategory rows
      await this.db.affiliateLinkCategories.destroy({
        where: {
          category_name: oldCategoryName,
          sub_category: { [this.db.Sequelize.Op.ne]: null }
        },
        transaction: t
      });

      // 4️⃣ Insert new subcategory rows (each one separate)
      if (Array.isArray(subcategories)) {
        for (let sub of subcategories) {
          await this.db.affiliateLinkCategories.create(
            {
              category_name,
              sub_category: sub,
              status: status,
              created_on: new Date()
            },
            { transaction: t }
          );
        }
      }

      await t.commit();

      return res.status(200).json({
        status: 200,
        message: "Category and subcategories updated successfully",
      });

    } catch (err) {
      await t.rollback();
      console.error("Error updating:", err);

      return res.status(500).json({
        status: 500,
        message: "Server error",
      });
    }
  }





}




module.exports = new Insuarnce();