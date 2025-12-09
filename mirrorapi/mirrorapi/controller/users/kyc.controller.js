const { connect ,baseurl} = require('../../config/db.config');
const logger = require('../../logger/api.logger');
const { secretKey } = require('../../middleware/config'); 
const { QueryTypes,Sequelize, Model, DataTypes,Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
//const helper = require('../utility/helper'); 
const pino = require('pino');
// const logger = pino({ level: 'info' }, process.stdout);
require('dotenv').config();
// const baseUrl = process.env.API_BASE_URL ;
const utility = require('../../utility/utility');

class Kyc {

    db = {};

    constructor() {
        this.db = connect();
        
    }
    
    async uploadKyc(panImage,aadharImage,aadharBackImage, checkbookImage, req, res) {
        
        let t;
        
        const {user_id, pan_number, aadhar_number,account_number ,account_holder,bank_name,ifsc_code,nominee_name,nominee_relation,full_address} = req;
        
          const requiredKeys = Object.keys({user_id, pan_number, aadhar_number,account_number ,account_holder,bank_name,ifsc_code,nominee_name,nominee_relation,full_address});
                
          if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
            return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
          }
        
        try {
            const userId = user_id;
            const filePath1 = panImage;
            const filePath2 = aadharImage;
            const filePath3 = checkbookImage;
            const filePath4 = aadharBackImage;
            
            const path ='/uploads/kyc/';
            t = await this.db.sequelize.transaction();
            
            const existingKyc = await this.db.kyc.findOne({ where: { user_id: userId, status: 1 } });
            if (!existingKyc) {
              const kycData = {
                user_id:userId,
                pan_number,
                aadhar_number,
                account_number,
                account_holder,
                bank_name,
                ifsc_code,
                nominee_name,
                nominee_relation,
                panImage:path+filePath1,
                aadharImage:path+filePath2,
                aadharBackImage:path+filePath4,
                checkbookImage:path+filePath3,
                created_by:userId,
                status: 0,
                address:full_address
              };
        
              const newKyc = await this.db.kyc.insertData(kycData, {
                validate: true,
                transaction: t,
                logging: sql => logger.info(sql),
              });
        
              await t.commit();
                //  return res.status(500).json({ status: 200, message: 'KYC done successfully', data: newKyc });
                return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'KYC done successfully', data: newKyc })));
              } else {
                await t.rollback();
                // return res.status(500).json({ status: 500, error: 'Already Exist' });
                return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, error: 'Already Exist' })));
              }
          } catch (error) {
                if (t) {
                  await t.rollback();
                }
      
              logger.error(`Error in upload KYC: ${error}`);
      
              if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map((err) => err.message);
                //return res.status(500).json({ status: 500, errors: validationErrors });
                return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
              }
              //return res.status(500).json({ status: 500, message: 'Failed to create', data: [] });
            return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Failed to create', data: [] })));

            }
      
       
	
    }
    
    
    
    
    async getKyc( req, res) {

      let t;
      const decryptedObject = utility.DataDecrypt(req.encReq);
	    const {user_id} = decryptedObject;
    
      try {
         
        const userId = user_id;
        const existingKyc = await this.db.kyc.getKycData({ user_id: userId });
         
            if (existingKyc) {
                // return res.status(200).json({ status: 200, message: 'Get KYC successfully', data: existingKyc });
                return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Get KYC successfully', data: existingKyc })));
            } else {
                // return res.status(200).json({ status: 200, error: 'KYC Not Done' });
                return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, error: 'KYC Not Done' })));
            }
        } catch (error) {
        
            logger.error(`Error in upload KYC: ${error}`);
    
            if (error.name === 'SequelizeValidationError') {
              const validationErrors = error.errors.map((err) => err.message);
              return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, errors: validationErrors })));
            }
            
            return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500, message: 'Failed to create', data: [] })));

          }
  
  }
     
     
     
            
            async getKycReport_old( req, res) {
            
                let t;
                
                try {
                   
                  
                      const existingKyc = await this.db.kyc.getAllData();
                   
                      if (existingKyc) {
            
                        const kycResult = await Promise.all(existingKyc.map(async item => {
            
                          const userdata = await this.db.user.getDataExistingUser(['first_name','last_name','mlm_id','mobile'], {id:item.user_id})
                        
                          return {
                           
                            name:userdata.first_name+' '+userdata.last_name,
                            mlm_id:userdata.mlm_id,
                            mobile:userdata.mobile,
                            ...item.dataValues,
                            panImage : item.panImage == null ? '' : baseurl +  item.panImage,
                            aadharImage : item.aadharImage == null ? '' : baseurl + item.aadharImage,
                            aadharBackImage : item.aadharBackImage == null ? '' : baseurl + item.aadharBackImage,
                            checkbookImage : item.checkbookImage == null ? '' : baseurl  + item.checkbookImage,
            
                          };
                        }));
                        
                        
                        
                        return res.status(200).json({ status: 200, message: 'Get KYC successfully', data: kycResult });
                      } else {
                        return res.status(200).json({ status: 200, error: 'KYC Not Done' });
                      }
                  } catch (error) {
                  
                      logger.error(`Error in upload KYC: ${error}`);
              
                      if (error.name === 'SequelizeValidationError') {
                        const validationErrors = error.errors.map((err) => err.message);
                        return res.status(500).json({ status: 500, errors: validationErrors });
                      }
              
                      return res.status(500).json({ status: 500, message: 'Failed to create', data: [] });
                    }
            
            }
            
            
  async getKycReport( req, res) {

    let t;
    const { from_date, to_date} = req; 
    
    try {
       
          let whereCondition ;
          
          
          const startDate =new Date(from_date);
          const endDate =new Date(to_date);
          endDate.setHours(23, 59, 59);

        
          whereCondition = {
              'created_on': {
                [Op.between]: [startDate, endDate]
              },
          }
          const existingKyc = await this.db.kyc.getAllData(whereCondition);
       
          if (existingKyc) {

            const kycResult = await Promise.all(existingKyc.map(async item => {

              const userdata = await this.db.user.getDataExistingUser(['first_name','last_name','mlm_id','mobile'], {id:item.user_id})
            
              return {
               
                name:userdata.first_name+' '+userdata.last_name,
                mlm_id:userdata.mlm_id,
                mobile:userdata.mobile,
                ...item.dataValues,

                 panImage : item.panImage === null ? '' : baseurl +  item.panImage,
                 aadharImage : item.aadharImage === null ? '' : baseurl + item.aadharImage,
                 aadharBackImage : item.aadharBackImage === null ? '' : baseurl + item.aadharBackImage,
                 checkbookImage : item.checkbookImage === null ? '' : baseurl + item.checkbookImage,
              
              };
            }));
            
            const report={
                 totalKyc:await this.db.kyc.count(),
                 totalPendingKyc:await this.db.kyc.count({ where:{ status:0 } }),
                 totalApprovedKyc:await this.db.kyc.count({ where:{ status:1 } }),
                 totalRejectedKyc:await this.db.kyc.count({ where:{ status:2 } }),
    
              }
                          
            return res.status(200).json({ status: 200, message: 'Get KYC successfully', data: kycResult, report });
          } else {
            return res.status(200).json({ status: 200, error: 'KYC Not Done' });
          }
      } catch (error) {
      
          logger.error(`Error in upload KYC: ${error}`);
  
          if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map((err) => err.message);
            return res.status(500).json({ status: 500, errors: validationErrors });
          }
  
          return res.status(500).json({ status: 500, message: 'Failed to create', data: [] });
        }

}




async updateKycStatus(req, res) {
            
            
  const {id,action,note,status} = req;

  
  const requiredKeys = Object.keys({ id,action,note,status});
        
  if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
    return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
  }

  let t;

  try {
      let rejection_reason = '';
 
        if (action === 'Reject') {
            rejection_reason = note;
        }else{
            rejection_reason='Approve';
        }
         
          const currentDate = new Date();
          const created_on = currentDate.getTime();
          
         const updatedMoneyStatus = await this.db.kyc.updateData(
                                                              {
                                                                rejection_reason:rejection_reason,
                                                                status,
                                                                modified_on:created_on
                                                              },
                                                              
                                                              {id:id}
                                                              
                                                            );
          
        if (updatedMoneyStatus) {
          return res.status(200).json({ status: 200, message: 'KYC Updated Successful.'});
        } else {
          return res.status(500).json({ status: 500, message: 'Failed to Update data', data: [] });
        }
          
      } catch (error) {
          logger.error(`Unable to find Kyc: ${error}`);
          if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map((err) => err.message);
            return res.status(500).json({ status: 500,errors: validationErrors });
          }
        
          return res.status(500).json({ status: 500,  message: error.message ,data:[]});
      }
    }
    
    
    
                
        
        async updateKyc(req, res) {
            
          const {kyc_id,user_id,pan,aadhar_number,account_number,account_holder,ifsc_code,nominee_name,nominee_relation,address,bank_name,status} = req;
        
          const requiredKeys = Object.keys({ kyc_id,user_id,pan,aadhar_number,account_number,account_holder,ifsc_code,nominee_name,nominee_relation,address});
                
          if (!requiredKeys.every(key => key in req && req[key] !== '' && req[key] !== undefined) ) {
            return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
          }
        
          let t;
        
          try {
        
              const currentDate = new Date();
              const created_on = currentDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
              
                 const updatedMoneyStatus = await this.db.kyc.UpdateData(
                          {
                            pan_number: pan,
                            aadhar_number,
                            account_number,
                            account_holder,
                            ifsc_code,
                            nominee_name,
                            nominee_relation,
                            address,
                            bank_name,
                            status,
                            modified_on:created_on
                          },
                          {user_id:user_id,id:kyc_id}
                          
                        );
                          
                        if (updatedMoneyStatus) {
                          return res.status(200).json({ status: 200, message: 'KYC Updated Successful.'});
                        } else {
                          return res.status(500).json({ status: 500, message: 'Failed to Update data', data: [] });
                        }
                      
                  } catch (error) {
                      logger.error(`Unable to find Kyc: ${error}`);
                      if (error.name === 'SequelizeValidationError') {
                        const validationErrors = error.errors.map((err) => err.message);
                        return res.status(500).json({ status: 500,errors: validationErrors });
                      }
                    
                      return res.status(500).json({ status: 500,  message: error.message ,data:[]});
                  }
                }
                            
        

    }

   

module.exports = new Kyc();