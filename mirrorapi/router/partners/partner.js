const express = require('express');
const patnerController = require('../../controller/partners/partner.controller');

const partnerRoute = express.Router();



// partnerRoute.post('/get-admin-balance',(req, res) => {
// 	patnerController.getWalletBalance(req.body,res);
// });

partnerRoute.post('/get-partners',(req, res) => {
	patnerController.getPartners(req,res);
});


partnerRoute.post('/get-partner-transactions',(req, res) => {
	patnerController.getTransactionHistory(req,res);
});

partnerRoute.post('/credit-debit-wallet',(req, res) => {
	patnerController.creditDebitToWallet(req.body,res);
});

module.exports = partnerRoute;
