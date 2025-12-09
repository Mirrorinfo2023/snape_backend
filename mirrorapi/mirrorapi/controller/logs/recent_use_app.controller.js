const { connect,config } = require('../../config/db.config');
//const logger = require('../../logger/api.logger');
const { QueryTypes,Sequelize, Model, DataTypes,Op } = require('sequelize');
//const helper = require('../utility/helper'); 
const utility = require('../../utility/utility'); 
const pino = require('pino');
//const logger = pino({ level: 'info' }, process.stdout);

class RecentAppUse {
  db = {};

  constructor() {
    this.db = connect();
  }

  async RecentAppUseLog(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id, title, image_url, functions} = decryptedObject;

    const requiredKeys = Object.keys({ user_id });
            
    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {
        
         if(!functions)
        {
            const whereClause = {'user_id': user_id}
            let attributes = ['user_id',
            'title',
            'image_url',
            'functions'];
            attributes = [...attributes]

            const result = await this.db.recentAppUse.getData(attributes, whereClause);

            return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Found', data: result })));
        }

        const insertData = {user_id, title, image_url, functions};
        const response = await this.db.recentAppUse.insertData(insertData);
        if(response)
        {
            const whereClause = {'user_id': user_id}
            let attributes = ['user_id',
            'title',
            'image_url',
            'functions'];

            const result = await this.db.recentAppUse.getData(attributes, whereClause);
            return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Found', data: result })));
      
        } else {
            return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Data Not Found', data: [] })));
        }
    } catch (error) {
        //logger.error(`Unable to find user: ${error}`);
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        }
		return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
    }
  }
  
  
   async Test(req, res) {
   

    try {
      
          const insertData={name:req.name,dob:req.dob,country_id:req.country_id,state_id:req.state_id,remarks:req.remarks};
        
           const response = await this.db.test.insertData(insertData);
        
         return res.status(200).json({ status: 200, message: 'Log Updated', data: [] });

        
        
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
         
          return res.status(500).json({ status: 500,errors: validationErrors });
        }
		
		return res.status(500).json({ status: 500,  message: error ,data:[]});
       
    }
  }
  
   async getTestlist(req,res) {
    
	   
        try {
          
                 
                  let statesmst = await this.db.test.findAll({});
                 
                return res.status(200).json(  { status: 200, message: 'success', data: statesmst } );                  
	
        } catch (err) {
                logger.error(`Unable to find : ${err}`);
    			if (err.name === 'SequelizeValidationError') {
    			  const validationErrors = err.errors.map((err) => err.message);
    			  return res.status(500).json({ status: 500,errors: validationErrors });
    			}
    			return res.status(500).json( { status: 500, message: err.message,data: []  });
            }

    }

}

module.exports = new RecentAppUse();