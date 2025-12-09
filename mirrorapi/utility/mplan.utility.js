const mPlan = require('../config/mplan.config');
const iPayment = require('../config/ipayment.config');
const axios = require('axios');
const mplanConfig = mPlan.plan();
const iPaymentConfig = iPayment.ipayment();


// ==============================
// GET PLAN
// ==============================
function getPlan(operator, circle, mobile) {
    return new Promise((resolve, reject) => {
        let apiUrl = mplanConfig.url;
        const key = mplanConfig.key;

        if (mobile) {
            apiUrl += `plans.php?apikey=${key}&offer=roffer&tel=${mobile}&operator=${operator}`;
        } else {
            apiUrl += `plans.php?apikey=${key}&cricle=${circle}&operator=${operator}`;
        }

        console.log("\n===== GET PLAN REQUEST =====");
        console.log("URL:", apiUrl);

        axios.get(apiUrl)
            .then((response) => {
                console.log("===== GET PLAN RESPONSE =====");
                console.log(response.data);

                resolve({ result: response.data });
            })
            .catch((error) => {
                console.log("===== GET PLAN ERROR =====");

                if (error.response) {
                    console.log("Status:", error.response.status);
                    console.log("Body:", error.response.data);
                } else {
                    console.log(error.message);
                }

                reject(error);
            });
    });
}



// ==============================
// CHECK OPERATOR
// ==============================
function checkOperator(mobile) {
    return new Promise((resolve, reject) => {
        let apiUrl = mplanConfig.operatorurl;
        const key = mplanConfig.key;

        if (mobile) {
            apiUrl += `operatorinfo.php?apikey=${key}&tel=${mobile}`;
        }

        console.log("\n===== CHECK OPERATOR REQUEST =====");
        console.log("URL:", apiUrl);

        axios.get(apiUrl)
            .then((response) => {
                console.log("===== CHECK OPERATOR RESPONSE =====");
                console.log(response.data);

                resolve({ result: response.data });
            })
            .catch((error) => {
                console.log("===== CHECK OPERATOR ERROR =====");

                if (error.response) {
                    console.log("Status:", error.response.status);
                    console.log("Body:", error.response.data);
                } else {
                    console.log(error.message);
                }

                reject(error);
            });
    });
}



// ==============================
// GET IPAYMENT PLAN
// ==============================
function getIpaymentPlan(circle_id, recharge_type_id, operator_id) {
    return new Promise((resolve, reject) => {

        let apiUrl = iPaymentConfig.rechargePlanUrl;
        const username = iPaymentConfig.clientId;
        const password = iPaymentConfig.clientSecret;

        const params = {
            circleId: circle_id,
            rechargeTypeId: recharge_type_id,
            operatorId: operator_id,
        };

        const basicAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

        console.log("\n===== IPAYMENT PLAN REQUEST =====");
        console.log("URL:", apiUrl);
        console.log("Params:", params);
        console.log("Headers:", { Authorization: basicAuth });

        axios.get(apiUrl, {
            params,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': basicAuth,
            },
        })
            .then(response => {
                console.log("===== IPAYMENT PLAN RESPONSE =====");
                console.log(response.data);

                resolve(response.data);
            })
            .catch(error => {
                console.log("===== IPAYMENT PLAN ERROR =====");

                if (error.response) {
                    console.log("Status:", error.response.status);
                    console.log("Body:", error.response.data);
                } else {
                    console.log(error.message);
                }

                reject(error);
            });
    });
}


module.exports = {
    getPlan,
    checkOperator,
    getIpaymentPlan
};
