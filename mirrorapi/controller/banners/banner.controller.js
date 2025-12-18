const { connect, baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes, Sequelize, Model, DataTypes, Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const utility = require('../../utility/utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');
const moment = require('moment'); // install moment or dayjs
const uploadFileToB2 = require('../../utility/b2Upload.utility'); // new B2 uploader
const path = require('path');
require('dotenv').config();
// const baseUrl = process.env.API_BASE_URL;
class Banner {

  db = {};

  constructor() {
    this.db = connect();

  }

  async getBannerOld(req, res) {

    try {

      let bannerCategories = await this.db.bannerCategory.getBannerCategory();

      let bannersByCategory = {};

      for (const category of bannerCategories) {


        const categoryId = category.id;
        const categoryName = category.category_name;
        let bannerList = [];

        let banners = await this.db.banner.getBanner(categoryId);

        bannersByCategory[categoryName] = banners.map((bannerItem) => ({
          id: bannerItem.id,
          title: bannerItem.title,
          img: baseurl + bannerItem.img,
          type_id: bannerItem.type_id,
          banner_for: bannerItem.banner_for,
        }));

      }

      const banner_data = Object.keys(bannersByCategory).reduce((result, categoryName) => {
        result[categoryName] = bannersByCategory[categoryName];
        return result;
      }, {});

      if (Object.keys(banner_data).length > 0) {
        return res.status(200).json({ status: 200, message: 'Banners Found', data: banner_data });
      } else {
        return res.status(401).json({ status: 401, token: '', message: 'Banners Not Found', data: [] });
      }


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



  async getBanner(req, res) {

    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { categoryId } = decryptedObject;

    const requiredKeys = Object.keys({ categoryId });

    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined)) {
      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {

      let banners = await this.db.banner.getBanner(categoryId);

      const result = banners.map((bannerItem) => ({
        id: bannerItem.id,
        title: bannerItem.title,
        img: bannerItem.img,
        type_id: bannerItem.type_id,
        banner_for: bannerItem.banner_for,
      }));


      if (result) {
        return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Banners Found', data: result })));
      } else {
        return res.status(401).json(utility.DataEncrypt(JSON.stringify({ status: 401, token: '', message: 'Banners Not Found', data: [] })));
      }


    }
    catch (err) {
      logger.error(`Unable to find Banner: ${err}`);
      if (err.name === 'SequelizeValidationError') {
        const validationErrors = err.errors.map((err) => err.message);
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
      }
      return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, token: '', message: err, data: [] })));
    }

  }

  async getBannerReport(req, res) {
    try {
      // 🔓 Step 1: Decrypt incoming data
      const encrypted = req.body?.data;
      if (!encrypted) {
        return res.status(400).json({
          status: 400,
          message: "Missing encrypted data field",
        });
      }

      // Decrypt the data
      const decryptedData = utility.DataDecrypt(encrypted);
      const decrypted = typeof decryptedData === "string" ? JSON.parse(decryptedData) : decryptedData;

      const { from_date, to_date } = decrypted;

      const startDate = moment(from_date).startOf("day").toDate();
      const endDate = moment(to_date).endOf("day").toDate();

      const whereCondition = {
        status: { [Op.or]: [1, 2] },
        created_on: { [Op.between]: [startDate, endDate] },
      };

      // ✅ Fetch banners with all fields including address
      const banners = await this.db.banner.findAll({
        where: whereCondition,
        order: [["created_on", "DESC"]],
      });

      // Format banner results with address information
      const bannerResult = banners.map((bannerItem) => {
        // Create a full address string from components
        let fullAddress = "";
        if (bannerItem.address) {
          fullAddress = bannerItem.address;
        } else if (bannerItem.post_office_name || bannerItem.city || bannerItem.state) {
          const parts = [];
          if (bannerItem.post_office_name) parts.push(bannerItem.post_office_name);
          if (bannerItem.city) parts.push(bannerItem.city);
          if (bannerItem.state) parts.push(bannerItem.state);
          if (bannerItem.pincode) parts.push(`Pincode: ${bannerItem.pincode}`);
          fullAddress = parts.join(", ");
        }

        return {
          id: bannerItem.id,
          title: bannerItem.title,
          img: bannerItem.img,
          type_id: bannerItem.type_id,
          banner_for: bannerItem.banner_for,
          created_on: bannerItem.created_on,
          status: bannerItem.status,
          app_id: bannerItem.app_id,

          // Address fields - individual components
          address: bannerItem.address,
          pincode: bannerItem.pincode,
          state: bannerItem.state,
          city: bannerItem.city,
          post_office_name: bannerItem.post_office_name,
          circle: bannerItem.circle,
          district: bannerItem.district,
          division: bannerItem.division,
          region: bannerItem.region,

          // Full formatted address for display
          full_address: fullAddress || null,

          // Status text for display
          status_text: bannerItem.status === 1 ? "Active" :
            bannerItem.status === 2 ? "Inactive" :
              "Deleted"
        };
      });

      const report = {
        total_count: await this.db.banner.count({ where: whereCondition }),
        total_active: await this.db.banner.count({
          where: { ...whereCondition, status: 1 },
        }),
        total_inactive: await this.db.banner.count({
          where: { ...whereCondition, status: 2 },
        }),
        total_deleted: await this.db.banner.count({
          where: { ...whereCondition, status: 0 },
        }),

        // Optional: Address statistics
        with_address: await this.db.banner.count({
          where: {
            ...whereCondition,
            [Op.or]: [
              { pincode: { [Op.ne]: null } },
              { state: { [Op.ne]: null } },
              { city: { [Op.ne]: null } },
              { address: { [Op.ne]: null } }
            ]
          },
        }),
        without_address: await this.db.banner.count({
          where: {
            ...whereCondition,
            pincode: null,
            state: null,
            city: null,
            address: null
          },
        })
      };

      // ✅ Encrypt final response
      const responseData = {
        status: 200,
        message: bannerResult.length > 0 ? "Banners Found" : "Banners Not Found",
        data: bannerResult,
        report,
        // Optional: Address summary
        address_summary: {
          banners_with_address: bannerResult.filter(b => b.pincode || b.state || b.city || b.address).length,
          banners_without_address: bannerResult.filter(b => !b.pincode && !b.state && !b.city && !b.address).length
        }
      };

      const encryptedResponse = utility.DataEncrypt(JSON.stringify(responseData));

      return res.status(200).json({ data: encryptedResponse });

    } catch (err) {
      console.error("❌ Banner Report Error:", err);

      // Send encrypted error response
      const errorResponse = utility.DataEncrypt(JSON.stringify({
        status: 500,
        message: err.message || "Internal server error",
        data: []
      }));

      return res.status(500).json({ data: errorResponse });
    }
  }

  // async getBannerReportbycategory(req, res) {
  //   try {
  //     const { type_id } = req.body;

  //     // Build where condition
  //     const whereCondition = {
  //       status: { [Op.or]: [1, 2] },
  //     };

  //     // Add type_id filter if provided
  //     if (type_id) {
  //       whereCondition.type_id = type_id;
  //     }

  //     // Fetch banners
  //     const banners = await this.db.banner.findAll({
  //       where: whereCondition,
  //       order: [["created_on", "DESC"]],
  //     });

  //     const bannerResult = banners.map((bannerItem) => ({
  //       id: bannerItem.id,
  //       title: bannerItem.title,
  //       img: bannerItem.img,
  //       type_id: bannerItem.type_id,
  //       banner_for: bannerItem.banner_for,
  //       created_on: bannerItem.created_on,
  //       status: bannerItem.status,
  //       app_id: bannerItem.app_id,
  //     }));

  //     const report = {
  //       total_count: await this.db.banner.count({ where: whereCondition }),
  //       total_active: await this.db.banner.count({
  //         where: { ...whereCondition, status: 1 },
  //       }),
  //       total_inactive: await this.db.banner.count({
  //         where: { ...whereCondition, status: 2 },
  //       }),
  //       total_deleted: await this.db.banner.count({
  //         where: { ...whereCondition, status: 0 },
  //       }),
  //     };

  //     return res.status(200).json({
  //       status: 200,
  //       message: bannerResult.length > 0 ? "Banners Found" : "Banners Not Found",
  //       data: bannerResult,
  //       report,
  //     });
  //   } catch (err) {
  //     logger.error(`Unable to find Banner: ${err}`);
  //     if (err.name === "SequelizeValidationError") {
  //       const validationErrors = err.errors.map((e) => e.message);
  //       return res.status(500).json({ status: 500, errors: validationErrors });
  //     }
  //     return res
  //       .status(500)
  //       .json({ status: 500, message: err.message || err, data: [] });
  //   }
  // }


  async getBannerReportbycategory(req, res) {
    try {
      const { category_name } = req.body;

      if (!category_name) {
        return res.status(400).json({
          status: 400,
          message: "category_name is required",
        });
      }

      // Step 1: Find category using category_name
      const category = await this.db.bannerCategory.findOne({
        where: { category_name: category_name }
      });

      if (!category) {
        return res.status(404).json({
          status: 404,
          message: "Category not found",
        });
      }

      const type_id = category.id; // <-- Reverse mapping
      console.log("Found Category:", category_name, " => type_id:", type_id);

      // Step 2: Build where condition using type_id
      const whereCondition = {
        status: { [Op.or]: [1, 2] },
        type_id: type_id
      };

      // Step 3: Fetch banners
      const banners = await this.db.banner.findAll({
        where: whereCondition,
        order: [["created_on", "DESC"]],
      });

      // Step 4: Add category_name in response
      const bannerResult = banners.map((bannerItem) => ({
        id: bannerItem.id,
        title: bannerItem.title,
        img: bannerItem.img,
        type_id: bannerItem.type_id,
        banner_for: bannerItem.banner_for,
        created_on: bannerItem.created_on,
        status: bannerItem.status,
        app_id: bannerItem.app_id,
        category_name: category_name // return received name
      }));

      // Step 5: Report section
      const report = {
        total_count: await this.db.banner.count({ where: whereCondition }),
        total_active: await this.db.banner.count({
          where: { ...whereCondition, status: 1 },
        }),
        total_inactive: await this.db.banner.count({
          where: { ...whereCondition, status: 2 },
        }),
        total_deleted: await this.db.banner.count({
          where: { ...whereCondition, status: 0 },
        }),
      };

      return res.status(200).json({
        status: 200,
        message: bannerResult.length > 0 ? "Banners Found" : "Banners Not Found",
        data: bannerResult,
        report,
      });

    } catch (err) {
      logger.error(`Unable to find Banner: ${err}`);
      return res
        .status(500)
        .json({ status: 500, message: err.message || err, data: [] });
    }
  }

  // Add this method to your bannerController.js

  async getBannersByLocation(req, res) {
    try {
      const { location, location_type = "pincode" } = req.body;

      if (!location) {
        return res.status(400).json({
          status: 400,
          message: "Location parameter is required",
          data: []
        });
      }

      // Build where condition based on location type
      let whereCondition = {
        status: 1
      };

      switch (location_type.toLowerCase()) {
        case "pincode":
          whereCondition.pincode = location;
          break;

        case "city":
          whereCondition.city = { [Op.like]: `%${location}%` };
          break;

        case "state":
          whereCondition.state = { [Op.like]: `%${location}%` };
          break;

        case "district":
          whereCondition.district = { [Op.like]: `%${location}%` };
          break;

        case "all":
          whereCondition = {
            status: 1,
            [Op.or]: [
              { pincode: location },
              { state: { [Op.like]: `%${location}%` } },
              { city: { [Op.like]: `%${location}%` } },
              { district: { [Op.like]: `%${location}%` } },
              { post_office_name: { [Op.like]: `%${location}%` } },
              { address: { [Op.like]: `%${location}%` } }
            ]
          };
          break;

        default:
          whereCondition.pincode = location;
      }

      // Fetch banners
      const banners = await this.db.banner.findAll({
        where: whereCondition,
        order: [["created_on", "DESC"]]
      });

      // Format response
      const bannerResult = banners.map((banner) => {
        let fullAddress = banner.address || [
          banner.post_office_name,
          banner.city,
          banner.state,
          banner.pincode ? `Pincode: ${banner.pincode}` : null
        ].filter(Boolean).join(", ");

        return {
          id: banner.id,
          title: banner.title,
          img: banner.img,
          type_id: banner.type_id,
          banner_for: banner.banner_for,
          created_on: banner.created_on,
          status: banner.status,
          app_id: banner.app_id,

          address: banner.address,
          pincode: banner.pincode,
          state: banner.state,
          city: banner.city,
          post_office_name: banner.post_office_name,
          circle: banner.circle,
          district: banner.district,
          division: banner.division,
          region: banner.region,

          full_address: fullAddress || null,
          status_text:
            banner.status === 1 ? "Active" :
              banner.status === 2 ? "Inactive" : "Deleted",

          location_match_score: 100
        };
      });

      const totalInLocation = bannerResult.length;
      const totalBanners = await this.db.banner.count({ where: { status: 1 } });

      return res.status(200).json({
        status: 200,
        message: bannerResult.length
          ? "Banners found for location"
          : "No banners found for the specified location",
        data: bannerResult,
        location_info: {
          search_location: location,
          search_type: location_type,
          total_banners_in_location: totalInLocation,
          total_banners_overall: totalBanners,
          percentage:
            totalBanners > 0
              ? Math.round((totalInLocation / totalBanners) * 100)
              : 0
        },
        filters: {
          by_pincode: await this.db.banner.count({
            where: { status: 1, pincode: location }
          }),
          by_city: await this.db.banner.count({
            where: { status: 1, city: { [Op.like]: `%${location}%` } }
          }),
          by_state: await this.db.banner.count({
            where: { status: 1, state: { [Op.like]: `%${location}%` } }
          })
        }
      });

    } catch (err) {
      console.error("❌ Get Banners by Location Error:", err);

      return res.status(500).json({
        status: 500,
        message: err.message || "Internal server error",
        data: []
      });
    }
  }



  async updateBannerStatus(req, res) {
    try {

      // 🔓 Step 1: Decrypt request
      const encrypted = req.body?.data;
      if (!encrypted) {
        return res.status(400).json({
          status: 400,
          message: "Missing encrypted data field",
        });
      }

      const decryptedData = utility.DataDecrypt(encrypted);
      const decrypted = typeof decryptedData === "string" ? JSON.parse(decryptedData) : decryptedData;

      const { id, action, status } = decrypted;

      if (!id || status === undefined || !action) {
        return res.status(400).json({
          status: 400,
          message: "Required input data is missing or empty",
        });
      }

      const currentDate = new Date();
      const modified_on = currentDate.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

      // ✅ Update DB
      const updatedStatus = await this.db.banner.UpdateData(
        {
          status,
          modified_on,
        },
        { id }
      );

      let responseData;
      if (updatedStatus > 0) {
        responseData = { status: 200, message: "Banner Status Updated Successfully." };
      } else {
        responseData = { status: 500, message: "Failed to update data", data: [] };
      }

      // 🔒 Step 2: Encrypt response before sending
      const encryptedResponse = utility.DataEncrypt(JSON.stringify(responseData));

      return res.status(200).json({ data: encryptedResponse });

    } catch (error) {
      console.error("❌ Update Banner Error:", error);
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => err.message);
        return res.status(500).json({
          status: 500,
          errors: validationErrors,
        });
      }

      const encryptedError = utility.DataEncrypt(
        JSON.stringify({ status: 500, message: error.message || error, data: [] })
      );

      return res.status(500).json({ data: encryptedError });
    }
  }


  async getBannerCategory(req, res) {
    try {
      // 🧠 Fetch data from DB
      const bannersCategory = await this.db.bannerCategory.getBannerCategory();
      const notificationApp = await this.db.notificationAppType.getAllData();

      // ✅ Success response
      if (bannersCategory && notificationApp) {
        const responsePayload = {
          status: 200,
          message: 'Category Found',
          data: { bannersCategory, notificationApp }
        };

        // 🔐 Encrypt before sending
        const encryptedData = utility.DataEncrypt(JSON.stringify(responsePayload));

        return res.status(200).json({ data: encryptedData });
      }
      // ❌ If not found
      else {
        const errorPayload = {
          status: 401,
          message: 'Category Not Found',
          data: []
        };
        const encryptedError = utility.DataEncrypt(JSON.stringify(errorPayload));
        return res.status(401).json({ data: encryptedError });
      }

    } catch (err) {
      logger.error(`Unable to find Category: ${err}`);

      const errorPayload = {
        status: 500,
        message: err.message || 'Internal Server Error',
        data: []
      };
      const encryptedError = utility.DataEncrypt(JSON.stringify(errorPayload));
      return res.status(500).json({ data: encryptedError });
    }
  }


  // this is for uploading on the blackbenz
  async addBanner(req, res) {
    try {
      // 🔓 Decrypt incoming encrypted form field
      const decrypted = utility.DataDecrypt(req.body.data);
      console.log("decrypted ", decrypted)
      const {
        title,
        categoryId,
        app_id,
        pincode,
        state,
        city,
        address,
        postOfficeName,
        circle,
        district,
        division,
        region
      } = decrypted;

      if (!title || !categoryId) {
        const encryptedResp = utility.DataEncrypt(
          JSON.stringify({
            status: 400,
            message: "Required input data is missing",
          })
        );
        return res.status(400).json({ data: encryptedResp });
      }

      // ⬆ File available here: req.file

      // Upload file to B2
      const bannerUpload = await uploadFileToB2.uploadBanner(req.file);

      // Generate signed URL
      const signedUrl = await uploadFileToB2.getPrivateFileUrl(
        { fileName: bannerUpload.fileName },
        7 * 24 * 60 * 60
      );

      const result = await this.db.banner.insertData({
        type_id: categoryId,
        title,
        app_id,
        img: signedUrl,
        banner_for: "App",
        created_on: new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
        pincode,
        state,
        city,
        address,
        post_office_name: postOfficeName,
        circle,
        district,
        division,
        region
      });

      if (result) {
        const encryptedResp = utility.DataEncrypt(
          JSON.stringify({
            status: 200,
            message: "Banner uploaded successfully",
            url: signedUrl,
          })
        );
        return res.status(200).json({ data: encryptedResp });
      } else {
        const encryptedResp = utility.DataEncrypt(
          JSON.stringify({
            status: 500,
            message: "Failed to save data",
          })
        );
        return res.status(500).json({ data: encryptedResp });
      }
    } catch (error) {
      const encryptedResp = utility.DataEncrypt(
        JSON.stringify({
          status: 500,
          message: error.message,
        })
      );
      return res.status(500).json({ data: encryptedResp });
    }
  }


  async getAllBannerImages(req, res) {
    try {
      const images = await uploadFileToB2.listOfBannerImg();
      return res.status(200).json({
        status: 200,
        message: "Banner images fetched successfully",
        data: images,
      });
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Failed to fetch banner images",
        error: error.message,
      });
    }
  }


  async addBannerCategory(req, res) {
    try {
      // ✅ 1. Check encrypted field
      if (!req.body?.data) {
        const encrypted = utility.DataEncrypt({
          status: 400,
          message: "Missing encrypted data field"
        });
        return res.status(400).json({ data: encrypted });
      }

      // ✅ 2. Decrypt request
      const decrypted = utility.DataDecrypt(req.body.data);
      const { category_name } = decrypted;

      if (!category_name) {
        const encrypted = utility.DataEncrypt(JSON.stringify({
          status: 400,
          message: "Category name is required"
        }));
        return res.status(400).json({ data: encrypted });
      }

      // Check Existing
      const existingCategory = await this.db.bannerCategory.findOne({
        where: { category_name: category_name.trim() }
      });

      if (existingCategory) {
        const encrypted = utility.DataEncrypt(JSON.stringify({
          status: 409,
          message: "Category already exists",
          data: existingCategory
        }));
        return res.status(409).json({ data: encrypted });
      }

      // Insert
      const data = {
        category_name,
        status: 1,
        created_on: new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")
      };

      const result = await this.db.bannerCategory.create(data);

      const encrypted = utility.DataEncrypt(JSON.stringify({
        status: 200,
        message: "Banner category added successfully",
        data: result
      }));

      return res.status(200).json({ data: encrypted });

    } catch (error) {
      const encrypted = utility.DataEncrypt(JSON.stringify({
        status: 500,
        message: error.message
      }));
      return res.status(500).json({ data: encrypted });
    }
  }

  async addAppType(req, res) {
    try {
      // Check encrypted field
      if (!req.body?.data) {
        const encrypted = utility.DataEncrypt({
          status: 400,
          message: "Missing encrypted data field"
        });
        return res.status(400).json({ data: encrypted });
      }

      // Decode request
      const decrypted = (utility.DataDecrypt(req.body.data));
      const { app_name } = decrypted;

      if (!app_name) {
        const encrypted = utility.DataEncrypt(JSON.stringify({
          status: 400,
          message: "App name is required"
        }));
        return res.status(400).json({ data: encrypted });
      }

      // Check if exists
      const exists = await this.db.notificationAppType.findOne({
        where: { app_name }
      });

      if (exists) {
        const encrypted = utility.DataEncrypt(JSON.stringify({
          status: 400,
          message: "App type already exists"
        }));
        return res.status(400).json({ data: encrypted });
      }

      // Insert
      const data = {
        app_name,
        status: 1,
        created_on: new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")
      };

      const result = await this.db.notificationAppType.create(data);

      const encrypted = utility.DataEncrypt(JSON.stringify({
        status: 200,
        message: "App type added successfully",
        data: result
      }));

      return res.status(200).json({ data: encrypted });

    } catch (error) {
      const encrypted = utility.DataEncrypt(JSON.stringify({
        status: 500,
        message: error.message
      }));
      return res.status(500).json({ data: encrypted });
    }
  }


  async uploadWallpaper(req, res) {
    try {
      const { user_id } = req.params;
      const filename = req.file?.filename;

      if (!user_id) {
        return res.status(400).json({
          status: 400,
          message: "user_id required",
          data: []
        });
      }

      if (!filename) {
        return res.status(400).json({
          status: 400,
          message: "Image not uploaded",
          data: []
        });
      }

      const wallpaperPath = `/uploads/userwallpapers/${user_id}/${filename}`;

      // ✅ Single call (insert or update)
      await this.db.userWallpaperBanner.upsertBanner({
        user_id,
        wallpaper_img: wallpaperPath
      });

      return res.status(200).json({
        status: 200,
        message: "Wallpaper banner uploaded successfully",
        data: {
          user_id,
          wallpaper_img: wallpaperPath
        }
      });

    } catch (err) {
      console.error("❌ uploadWallpaper error:", err);

      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        data: []
      });
    }
  }



  // ✅ GET banner by user
  async getuserwallpaperBanner(req, res) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          status: 400,
          message: "user_id is required",
          data: []
        });
      }

      const banner = await this.db.userWallpaperBanner.getByUserId(user_id);

      if (!banner) {
        return res.status(200).json({
          status: 200,
          message: "No wallpaper banner found",
          data: []
        });
      }

      // Send all fields from the DB record
      return res.status(200).json({
        status: 200,
        message: "Wallpaper banner fetched successfully",
        data: banner // Entire record
      });

    } catch (err) {
      console.error("❌ getuserwallpaperBanner error:", err);

      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        data: []
      });
    }
  }


}




module.exports = new Banner();