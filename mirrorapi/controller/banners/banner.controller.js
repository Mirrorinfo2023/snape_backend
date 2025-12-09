const { connect,baseurl } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes,Sequelize, Model, DataTypes,Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const utility = require('../../utility/utility');
const pino = require('pino');
const logger = pino({ level: 'info' }, process.stdout);
const axios = require('axios');

const path = require('path');
require('dotenv').config();
// const baseUrl = process.env.API_BASE_URL;
class Banner {

    db = {};

    constructor() {
        this.db = connect();
        
    }
	
    async getBannerOld(req,res) {
	  
        try {
           
            let bannerCategories = await this.db.bannerCategory.getBannerCategory();
          
            let bannersByCategory = {};
          
            for (const category of bannerCategories) {
              
              
                const categoryId = category.id;
                const categoryName = category.category_name;
                let bannerList=[];
               
                let banners = await this.db.banner.getBanner(categoryId);
            
                bannersByCategory[categoryName] = banners.map((bannerItem) => ({
                    id: bannerItem.id,
                    title: bannerItem.title,
                    img: baseurl+bannerItem.img,
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
    			  return res.status(500).json({ status: 500,errors: validationErrors });
    			}
    			 return res.status(500).json({ status: 500,token:'', message: err,data: []  });
            }
	
        }



         async getBanner(req,res) {
	  
                const decryptedObject = utility.DataDecrypt(req.encReq);
                const {categoryId} = decryptedObject;

                const requiredKeys = Object.keys({ categoryId });
                
                  if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
                      return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
                  }

                try {
             
                let banners = await this.db.banner.getBanner(categoryId);
              
                 const result = banners.map((bannerItem) => ({
                      id: bannerItem.id,
                      title: bannerItem.title,
                      img: baseurl+bannerItem.img,
                      type_id: bannerItem.type_id,
                      banner_for: bannerItem.banner_for,
                    }));
                
                
                if(result) {
                    return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Banners Found', data: result })));
                } else {
                    return res.status(401).json(utility.DataEncrypt(JSON.stringify({ status: 401, token: '', message: 'Banners Not Found', data: [] })));
                }
                
              
            }
          catch (err) {
                  logger.error(`Unable to find Banner: ${err}`);
            if (err.name === 'SequelizeValidationError') {
              const validationErrors = err.errors.map((err) => err.message);
              return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
            }
             return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,token:'', message: err,data: []  })));
              }
    
          }



      async getBannerReport(req,res) {
	  
          const { from_date, to_date} = req;
      
        try {


          let whereCondition ;

          const startDate =new Date(from_date);
          const endDate =new Date(to_date);
          endDate.setHours(23, 59, 59);

          whereCondition = {
               'status': {
                [Op.or]: [1, 2],
              },

              'created_on': {
                [Op.between]: [startDate, endDate]
              },
          }
                 
                  let banners = await this.db.view_banner.getBannerAll(whereCondition);
              
                  const bannerResult= banners.map((bannerItem) => ({

                      id: bannerItem.id,
                      title: bannerItem.title,
                      img: baseurl+bannerItem.img,
                      type_id: bannerItem.type_id,
                      banner_for: bannerItem.banner_for,
                      category: bannerItem.category_name,
                      created_on:bannerItem.banner_date,
                      status:bannerItem.status,
                      app_name:bannerItem.app_name,
                      app_id: bannerItem.app_id,
                      
                    }));
        
                const report={
                      total_count : await this.db.view_banner.count({ where: {...whereCondition} }, 'id' ),
                      total_active : await this.db.view_banner.count({ where:{...whereCondition, status:`1` }}),
                      total_inactive : await this.db.view_banner.count({ where:{ ...whereCondition, status:`2` }}),
                      total_deleted : await this.db.view_banner.count({ where:{ ...whereCondition, status:`0` }}),
                  }
              
                if (bannerResult.length > 0) {
                  return res.status(200).json({ status: 200, message: 'Banners Found', data: bannerResult, report });
                } else {
                  return res.status(401).json({ status: 401, token: '', message: 'Banners Not Found', data: [] });
                }
                
              
            }
          catch (err) {
                  logger.error(`Unable to find Banner: ${err}`);
            if (err.name === 'SequelizeValidationError') {
              const validationErrors = err.errors.map((err) => err.message);
              return res.status(500).json({ status: 500,errors: validationErrors });
            }
             return res.status(500).json({ status: 500,token:'', message: err,data: []  });
              }
    
          }


            
          
        async updateBannerStatus(req, res) {
          const {id,action,status} = req;

          
          const requiredKeys = Object.keys({ id,action,status});
                
          if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
            return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
          }

          let t;

          try {
           
           

              const currentDate = new Date();
              const modified_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      
              const updatedStatus = await this.db.banner.UpdateData(
                  {
                    // rejection_reason:note,
                    status,
                    modified_on:modified_on
                  },
                  
                  {id:id}
                  
                );
                  
                if (updatedStatus > 0) {
                  return res.status(200).json({ status: 200, message: 'Banner Status Updated Successful.'});
                } else {
                  return res.status(500).json({ status: 500, message: 'Failed to Update data', data: [] });
                }
              
          } catch (error) {
              logger.error(`Unable to find Banner: ${error}`);
              if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map((err) => err.message);
                return res.status(500).json({ status: 500,errors: validationErrors });
              }
            
              return res.status(500).json({ status: 500,  message: error ,data:[]});
          }
        }
            

        async getBannerCategory(req,res) {
	  
          try {
             
                let bannersCategory = await this.db.bannerCategory.getBannerCategory();
                const notificationApp= await this.db.notificationAppType.getAllData();
              
                if(bannersCategory && notificationApp){
                  return res.status(200).json({ status: 200, message: 'Category Found', data:{bannersCategory,notificationApp} });
                } else {
                  return res.status(401).json({ status: 401, token: '', message: 'Category Not Found', data: [] });
                }
                
            }
          catch (err) {
                  logger.error(`Unable to find Category: ${err}`);
            if (err.name === 'SequelizeValidationError') {
              const validationErrors = err.errors.map((err) => err.message);
              return res.status(500).json({ status: 500,errors: validationErrors });
            }
             return res.status(500).json({ status: 500,token:'', message: err,data: []  });
              }
    
          }


          async addBanner(fileName, req, res) {
            const {title,categoryId,app_id} = req;
  
            
            const requiredKeys = Object.keys({ title,categoryId});
                  
            if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
              return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
            }
  
            let t;
  
            try {
             
                // console.log(fileName);
                const filePath = `uploads/banners/`+fileName;
                const currentDate = new Date();
                const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        
                const result = await this.db.banner.insertData(
                    {
                      type_id:categoryId,
                      title,
                      app_id,
                      img:filePath,
                      banner_for:'App',
                      created_on:created_on
                    },
                    
                 
                    
                  );
                    
                  if (result) {
                    return res.status(200).json({ status: 200, message: 'Banner Add Successful.'});
                  } else {
                    return res.status(500).json({ status: 500, message: 'Failed to Save data', data: [] });
                  }
                
            } catch (error) {
                logger.error(`Unable to find Banner: ${error}`);
                if (error.name === 'SequelizeValidationError') {
                  const validationErrors = error.errors.map((err) => err.message);
                  return res.status(500).json({ status: 500,errors: validationErrors });
                }
              
                return res.status(500).json({ status: 500,  message: error ,data:[]});
            }
          }
              



}




module.exports = new Banner();