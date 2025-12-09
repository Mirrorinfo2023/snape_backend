const { connect,config } = require('../../config/db.config');
const { QueryTypes,Sequelize, Model, DataTypes,Op } = require('sequelize');
const utility = require('../../utility/utility'); 
const pino = require('pino');

class UserAction {
  db = {};

  constructor() {
    this.db = connect();
  }





 async user_log(req, res) {
   

    try {
      
          const insertData={user_id:req.user_id,request_type:req.request_type,task_id:req.task_id};
        
           const response = await this.db.userTask.insertData(insertData);
        
         return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Log Updated', data: [] })));

        
        
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
         
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        }
		
		return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
       
    }
  }
  
  
  async TaskHistory(req, res) {
   

    try {
                                const decryptedObject = utility.DataDecrypt(req.encReq);
                                const { user_id,log_date} = decryptedObject;
                               
                                
                                const currentDate = new Date(log_date);
                                const year = currentDate.getFullYear();
                                const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
                                const day = String(currentDate.getDate()).padStart(2, '0');
                                const todayDate = `${year}-${month}-${day}`;
                
                                const response  = await this.db.sequelize.query(`
                                SELECT m.task, m.target_count, COALESCE(subq.task_count, 0) AS task_count,
                                CASE WHEN COALESCE(subq.task_count, 0)>=m.target_count then 'Completed' else 'Pending' end as task_status
                                FROM mst_task m
                                LEFT JOIN (
                                SELECT task_id,COUNT(user_id) AS task_count
                                FROM log_user_task
                                WHERE user_id = '${user_id}' AND CAST(task_date AS DATE) = '${todayDate}'
                                 GROUP BY task_id
                                ) AS subq ON m.id = subq.task_id
                                ORDER BY m.task
                                
                               
                                   
                                
                                `, {
                                raw: false,
                                type: this.db.sequelize.QueryTypes.SELECT,
                                });
                                
                               
                                        
                                        
                               
                                        
                               
                                        
                                        
                    
        
        
             return res.status(200).json( utility.DataEncrypt( JSON.stringify({ status: 200, message: 'Log Updated', data: response })));

        
        
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
         
          return res.status(500).json(  utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        }
		
		return res.status(500).json(  utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
       
    }
  }
  
   async user_todayHistory(req, res) {
   

    try {
                                const decryptedObject = utility.DataDecrypt(req.encReq);
                                const { user_id} = decryptedObject;
                               
                                
                                const currentDate = new Date();
                                const year = currentDate.getFullYear();
                                const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
                                const day = String(currentDate.getDate()).padStart(2, '0');
                                const todayDate = `${year}-${month}-${day}`;
                
                                const response  = await this.db.sequelize.query(`
                                SELECT m.task, m.target_count, COALESCE(subq.task_count, 0) AS task_count,
                                CASE WHEN COALESCE(subq.task_count, 0)>=m.target_count then 'Completed' else 'Pending' end as task_status
                                FROM mst_task m
                                LEFT JOIN (
                                SELECT task_id, COUNT(user_id) AS task_count
                                FROM log_user_task
                                WHERE user_id = '${user_id}' AND CAST(task_date AS DATE) = '${todayDate}'
                                GROUP BY task_id
                                ) AS subq ON m.id = subq.task_id
                                ORDER BY 
                                    CASE 
                                        WHEN task_status = 'Completed' THEN 0
                                        ELSE 1
                                    END
                                
                                `, {
                                raw: false,
                                type: this.db.sequelize.QueryTypes.SELECT,
                                });
                                
                                const totalresponse  = await this.db.sequelize.query(`
                                SELECT count(m.task) as total
                                FROM mst_task m where status=1
                                `, {
                                raw: false,
                                type: this.db.sequelize.QueryTypes.SELECT,
                                });
                                        
                                        
                                let totalTaskdone=0;
                        
                                let primecount  = await this.db.sequelize.query(`
                                                    SELECT COUNT(lut.user_id) FROM log_user_task AS lut 
                                                    JOIN (select p.user_id from tbl_referral_idslevel l join tbl_plan_purchase p on l.user_id=p.user_id
                                                    
                                                     where l.ref_userid = '${user_id}' AND l.level = 2 AND DATE(p.created_on) = '${todayDate}'
                                                     
                                                    ) AS trp ON lut.user_id = trp.user_id 
                                                    WHERE lut.task_id = 1 
                                                    AND DATE(lut.task_date) = '${todayDate}' 
                                                   
                                                    `, {
                                                    raw: false,
                                                    type: this.db.sequelize.QueryTypes.SELECT,
                                                    });
                                        
                                        
                                if(primecount>0){
                                    totalTaskdone=100;
                                }else{
                                
                                
                                        totalTaskdone  = await this.db.sequelize.query(`
                                                        SELECT 
                                                        CASE 
                                                        WHEN total_tasks >= 3 THEN 100 
                                                        ELSE LEAST((total_tasks / 3.0) * 100, 100)
                                                        END AS percentage
                                                        FROM (
                                                        SELECT 
                                                        SUM(CASE WHEN task_count >= subquery.target_count THEN 1 ELSE 0 END) AS total_tasks
                                                        FROM (
                                                        SELECT  
                                                        COUNT(*) AS task_count,target_count
                                                        FROM 
                                                        log_user_task t 
                                                        JOIN 
                                                        mst_task m ON m.id = t.task_id
                                                        WHERE 
                                                        t.task_id > 1 
                                                        and   user_id = '${user_id}' AND CAST(task_date AS DATE) = '${todayDate}'
                                                        GROUP BY 
                                                        t.task_id
                                                        ) AS subquery
                                                        ) AS total_tasks_subquery
                                                    `, {
                                                    raw: false,
                                                    type: this.db.sequelize.QueryTypes.SELECT,
                                                    });
                                }
                                        
                                        
                    
        
        
             return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Log Updated', data: response , totalTaskdone,activetask:totalresponse})));

        
        
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
         
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        }
		
		return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
       
    }
  }
  


    async addReferralTask(filename, req, res) {
          
            const { title, description,user_id,meeting_date,task_type } = req;
          
            try {
                
              const filePath = `uploads/referral/task/`+filename;
            
             
                const categoryData = {
                  user_id,
                  description,
                  image:filePath,
                  title,
                  meeting_date,
                  task_type
                };
          
                const newCategory = await this.db.royality_task.insertData(categoryData);
                
                    return res.status(201).json({ status: 201, message: 'Category added successfully', data: newCategory });
               
            } catch (error) {
               
                if (error.name === 'SequelizeValidationError') {
                    const validationErrors = error.errors.map((err) => err.message);
                    return res.status(500).json({ status: 500, errors: validationErrors });
                }
                return res.status(500).json({ status: 500, message: error.message, data: [] });
            }
               
        } 
  async user_action_log(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id, refer_link, follow_up, grafix, income_screenshot, direct, prime_level} = decryptedObject;

    const requiredKeys = Object.keys({ user_id, refer_link, follow_up, grafix, income_screenshot, direct, prime_level });
            
    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
        //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

        const getData = await this.db.userAction.findOne({
            where:{
                user_id:user_id,
                status:1,
                created_on: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['id', 'DESC']]
        });
        
        if(getData!=null)
        {
            const updateData = {
                refer_link_count: refer_link > 0 ? getData.refer_link_count+1 : getData.refer_link_count,
                follow_up_count: follow_up > 0 ? getData.follow_up_count+1 : getData.follow_up_count,
                grafix_count: grafix > 0 ? getData.grafix_count+1 : getData.grafix_count,
                income_screenshot_count: income_screenshot > 0 ? getData.income_screenshot_count+1: getData.income_screenshot_count,
                direct_count: direct > 0 ? getData.direct_count+1 : getData.direct_count,
                prime_level_count: prime_level > 0 ? getData.prime_level_count+1 : getData.prime_level_count
            }
            

            await this.db.userAction.update(
                updateData,
                { where: { id:getData.id } }
            );

            //return res.status(200).json({ status: 200, message: 'Data Updated', data: [] });
            return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Updated', data: [] })));
        }else{
            const insertData = {
                refer_link_count: refer_link > 0 ? 1 : 0,
                follow_up_count: follow_up > 0 ? 1 : 0,
                grafix_count: grafix > 0 ? 1 : 0,
                income_screenshot_count: income_screenshot > 0 ? 1: 0,
                direct_count: direct > 0 ? 1 : 0,
                prime_level_count: prime_level > 0 ? 1 : 0,
                user_id:user_id
            }
            const response = await this.db.userAction.insertData(insertData);
            return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Updated', data: response })));
            //return res.status(200).json({ status: 200, message: 'Data Updated', data: response });
        }

        
        
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
          //return res.status(500).json({ status: 500,errors: validationErrors });
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors: validationErrors })));
        }
		
		return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error ,data:[]})));
        //return res.status(500).json({ status: 500,  message: error ,data:[]});
    }
  }
  
  async user_adds_log(req, res) {
 const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id, action_page } = decryptedObject;

    const requiredKeys = Object.keys({ user_id, action_page });
            
    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
        //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {

        const insertData = {user_id, add_page: action_page};
        const response = await this.db.userAdds.insertData(insertData);
        
        if(response)
        {
            const whereClause = {'user_id': user_id, 'add_page': action_page, 'status':1}
            let attributes = ['user_id',
            'add_page'];

            const result = await this.db.userAdds.getDataCount(attributes, whereClause);
            let show_add = true;
            if(result>5)
            {
                show_add = false;
            }

            const addShow = {
                'AddShow': show_add
            }

            //return res.status(200).json({ status: 200, message: 'Data Found', data: addShow });
            return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Found', data: addShow })));
      
        } else {
            //return res.status(400).json({ status: 400, message: 'Data Not Found', data: [] });
            return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Data Not Found', data: [] })));
        }
    } catch (error) {
        //logger.error(`Unable to find user: ${error}`);
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors:'Internal Server Error', data:validationErrors })));
          //return res.status(500).json({ status: 500,errors:'Internal Server Error', data:validationErrors });
        }
	    
	    return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error.message ,data:[]})));
        //return res.status(500).json({ status: 500,  message: error.message ,data:[]});
    }
  }
  
  
  async user_data_notification(req, res) {
    const decryptedObject = utility.DataDecrypt(req.encReq);
    const { user_id } = decryptedObject;

    const requiredKeys = Object.keys({ user_id });
            
    if (!requiredKeys.every(key => key in decryptedObject && decryptedObject[key] !== '' && decryptedObject[key] !== undefined) ) {
        //return res.status(400).json({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys });
        return res.status(400).json(utility.DataEncrypt(JSON.stringify({ status: 400, message: 'Required input data is missing or empty', columns: requiredKeys })));
    }

    try {
        let date = new Date();
        let crdate = utility.formatDate(date);
        let is_gender = 0;
        let is_profile = 0;
        let is_interest = 0;

        const result = await this.db.userDataNotification.getData({
            user_id: user_id,
            entry_date: crdate
        });

        
        if(result==null)
        {
            // const categories = ['is_gender', 'is_profile', 'is_interest'];
            // const randomIndex = Math.floor(Math.random() * categories.length);
            // const randomValue =  categories[randomIndex];
           
            const where = { id: user_id };
            const Attr = ['first_name', 'last_name', 'mlm_id','mobile', 'gender', 'profile_pic', 'created_on'];
            const userData = await this.db.user.getData(Attr, where);
            
            if(new Date(userData.created_on) <= date.setDate(date.getDate() - 1))
            {
                
                if (userData && (userData.gender === null || userData.gender === '' || userData.gender === undefined))
                {  
                    is_gender = 1;
                }else{
                    if(userData && (userData.profile_pic===null || userData.profile_pic==='' || userData.profile_pic === undefined))
                    {
                        
                        is_profile = 1;
                    }else{
                        const instData = await this.db.userIntrest.getData(['id'], {mobile: userData.mobile});
                        if(instData===null)
                        {
                            is_interest = 1;
                        }
                    }
                }
    
                
                await this.db.userDataNotification.insertData({
                    user_id,
                    is_gender,
                    is_profile,
                    is_interest,
                    entry_date:crdate
                });
            }

        }

        const returnData = {
            'is_gender': is_gender,
            'is_profile': is_profile,
            'is_interest': is_interest
        }

        // return res.status(200).json({ status: 200, message: 'Data Found', data: returnData });
      return res.status(200).json(utility.DataEncrypt(JSON.stringify({ status: 200, message: 'Data Found', data: returnData })));

    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const validationErrors = error.errors.map((err) => err.message);
          return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,errors:'Internal Server Error', data:validationErrors })));
        //   return res.status(500).json({ status: 500,errors:'Internal Server Error', data:validationErrors });
        }
			
        // return res.status(500).json({ status: 500,  message: error.message ,data:[]});
        return res.status(500).json(utility.DataEncrypt(JSON.stringify({ status: 500,  message: error.message ,data:[]})));
    }
  }

  
}

module.exports = new UserAction();