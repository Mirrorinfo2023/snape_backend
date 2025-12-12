const cron = require('node-cron');
const cronJobAddMoney = require('./add_money/AddMoney.cron.js');
const cronJobidslevel = require('./referral/idslevel.cron.js');
const cronWhatsapp = require('./whatsapp/whatsapp.cron.js');
const cronJobNotifocation = require('./notification/fcm_notification.cron.js');
const cronJobRoyality = require('./referral/royality.cron.js');
const cronJobPrimeRoyality = require('./referral/PrimeRoyality.cron.js');
const cycleIncomeCronJob = require('./referral/cycleIncome.cron.js');
const cycleIncomeCronJobsss = require('./referral/cycleIncome2.cron.js');
const cronJobPortfolio = require('./referral/portfolio.cron.js');
const cronJobRechargePanel = require('./recharge/recharge.cron.js');
const cronleadUserAction = require('./leads/leads_user_action.cron.js');
const cronMessaging = require('./notification/messaging_service.cron');
const cronJobShopping = require('./orders/order.cron.js');

class CronJobHandler {
    constructor() {
        // Schedule the cron job in the constructor
        
    /************************************ADD MONEY JOB**************************************************/
        //HDFC UPI
        //cron.schedule('* 6-23 * * *', cronJobAddMoney.WalletJob.bind(cronJobAddMoney));
        
        //CCAvenue Payment gateway
       // cron.schedule('* 6-23 * * *', cronJobAddMoney.WalletJobCCAvenue.bind(cronJobAddMoney));
        
        
     /************************************REFER ID JOB**************************************************/   
        // cron.schedule('* 5-23 * * *', cronJobidslevel.ReferIDJob.bind(cronJobidslevel));
        
       
     /************************************REFERRAL JOB**************************************************/
       cron.schedule('05 06 * * 1-5', cycleIncomeCronJob.hybridCycle.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });

      
  cron.schedule('11 4 * * 1-5', cycleIncomeCronJob.BonusReferralIncome3.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });

       cron.schedule('02 0 * * 1-5', cycleIncomeCronJob.BonusReferralIncome.bind(cycleIncomeCronJob) );


      cron.schedule('50 08 * * 1-5', cycleIncomeCronJob.BonusReferralIncome8.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });

/*
  	   cron.schedule('15 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome2.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });
 	 
	   cron.schedule('17 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome4.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });
	   cron.schedule('18 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome5.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });
	  cron.schedule('19 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome1.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });
		 cron.schedule('27 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome6.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });
 cron.schedule('21 8 * * 1-5', cycleIncomeCronJob.BonusReferralIncome7.bind(cycleIncomeCronJob), {
          timezone: 'Asia/Kolkata' 
        });

 		
*/





/*

 cron.schedule('05 22 * * 1-5', cycleIncomeCronJobsss.BonusReferralIncome.bind(cycleIncomeCronJobsss));

  	   cron.schedule('50 11 * * *', cycleIncomeCronJobsss.BonusReferralIncome2.bind(cycleIncomeCronJobsss));
 	   cron.schedule('0 12 * * *', cycleIncomeCronJobsss.BonusReferralIncome3.bind(cycleIncomeCronJobsss));
	   cron.schedule('10 13 * * *', cycleIncomeCronJobsss.BonusReferralIncome4.bind(cycleIncomeCronJobsss));
	   cron.schedule('20 13 * * *', cycleIncomeCronJob.BonusReferralIncome5.bind(cycleIncomeCronJob));
	  cron.schedule('30 13 * * *', cycleIncomeCronJobsss.BonusReferralIncome1.bind(cycleIncomeCronJobsss));
		 cron.schedule('40 13 * * *', cycleIncomeCronJobsss.BonusReferralIncome6.bind(cycleIncomeCronJobsss));
 cron.schedule('50 13 * * *', cycleIncomeCronJobsss.BonusReferralIncome7.bind(cycleIncomeCronJobsss));
 cron.schedule('0 14 * * *', cycleIncomeCronJobsss.BonusReferralIncome8.bind(cycleIncomeCronJobsss));


  */	

	  


        //cron.schedule('40 23 * * *', cronJobPortfolio.CompanyportfolioJob.bind(cronJobPortfolio));
       
      
       
       // cron.schedule('45 0 * * *', cronJobRoyality.ActiveRoyalityUser.bind(cronJobRoyality));
        
        //cron.schedule('25 1 2-30/2 * *', cronJobRoyality.Royality.bind(cronJobRoyality));
        //cron.schedule('36 23 2-30/2 * *', cronJobPrimeRoyality.PrimeRoyality.bind(cronJobPrimeRoyality));
          
        
     /***************************************END REFERRAL JOB***********************************************/
        
        
         /***************************************START ROYALITY JOB***********************************************/
        
        
                  /*  cron.schedule('10 4 * * *', cronJobRoyality.SilverRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('20 4 * * *', cronJobRoyality.GoldRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('30 4 * * *', cronJobRoyality.CarFundRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('40 4 * * *', cronJobRoyality.PlatinumRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('50 4 * * *', cronJobRoyality.DiamondRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('0 5 * * *', cronJobRoyality.MobileFundRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('10 5 * * *', cronJobRoyality.HouseFundRankRoyalityCategory.bind(cronJobRoyality));
                    cron.schedule('20 5 * * *', cronJobRoyality.TravelFundRankRoyalityCategory.bind(cronJobRoyality));*/
        
        
         /***************************************END ROYALITY JOB***********************************************/
        
       
       // Run the job every 10 minutes, between 6 AM and midnight
        //cron.schedule('*/10 6-23 * * *', cronJobRechargePanel.priorityJob.bind(cronJobRechargePanel));

        
    //  cron.schedule('* 6-23 * * *', cronleadUserAction.LeadsRepurchaseJob.bind(cronleadUserAction));
        
        
     // cron.schedule('* 6-23 * * *', cronJobNotifocation.NotificationJob.bind(cronJobNotifocation));
     // cron.schedule('* 6-23 * * *', cronJobNotifocation.NotificationJobAdmin.bind(cronJobNotifocation));
       
     //  cron.schedule('* 6-23 * * *', cronMessaging.shootMessages.bind(cronMessaging));
       
       
      // cron.schedule('*/1 6-23 * * *', cronJobShopping.OrderRepurchaseJob.bind(cronJobShopping));
       
       
       /* cron.schedule('* * * * *', cronWhatsapp.LoginWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.RegisterWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.ForgotPasswordWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.RechargeWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AddMoneyRequestPendingWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AddMoneyRequestApprovedWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AddMoneyRequestRejectWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.InsuranceRequestWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.SendmoneyWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.KycApproveWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.KycRequestWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.KycRejectWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AddMoneyWhatappJob.bind(cronWhatsapp));
        //cron.schedule('* * * * *', cronWhatsapp.AddmoneyFailWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.RedeemRequestWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.RedeemRejectWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.RedeemApproveWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.FeedbackWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AdminIncomeWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.PrimePurchaseWhatappJob.bind(cronWhatsapp));
        cron.schedule('* * * * *', cronWhatsapp.AutoIdBlockWhatappJob.bind(cronWhatsapp)); */





    }


}

// Export an instance of the class to be used in other files
module.exports = new CronJobHandler();
