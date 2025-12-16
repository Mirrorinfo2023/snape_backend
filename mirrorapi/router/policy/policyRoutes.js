const express = require('express');
const policyController = require('../../controller/privacy_Policy/privacypolicy.controller');
const authenticateJWT = require('../../middleware/authMiddleware');
const logMiddleware = require('../../middleware/logMiddleware');

const policy = express.Router();

const endpoints = {
    '/policy/categories': '66a815be731fee133d7ecc8f240447c14e770b83',
    '/policy/category/:id': 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
    '/policy/category': 'b0922bbeca57785f0add2136bca4786594e739cd',
    '/policy/category/:id/status': 'c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9',
    '/policy/list': 'd2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0',
    '/policy/:id': 'e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1',
    '/policy': 'f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2',
    '/policy/:id/status': 'g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3',
    '/public/policy/:category': 'h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4',
    '/policy/categories/active': 'i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5'
};

// Get all policy categories (HASHED)
policy.get(`/66a815be731fee133d7ecc8f240447c14e770b83`, logMiddleware, (req, res) => {
    policyController.getPolicyCategories(req, res)

});


// Get active policy categories (CLEAR)
policy.get('/policy/categories/active', (req, res) => {
    policyController.getActivePolicyCategories(req, res)
        .then(data => res.json(data))
        .catch(error => {
            console.error('Error fetching active policy categories:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// Get policy category by ID (CLEAR)
policy.get('/policy/category/:id', (req, res) => {
    policyController.getPolicyCategoryById(req, res)
        .then(data => res.json(data))
        .catch(error => {
            console.error('Error fetching policy category:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});


// Create policy category (CLEAR)
policy.post('/policy/category', (req, res) => {
    policyController.createPolicyCategory(req, res)
        .then(data => res.json(data))
        .catch(error => {
            console.error('Error creating policy category:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});


// Update policy category (CLEAR)
policy.post('/policy/category/:id', (req, res) => {
    policyController.updatePolicyCategory(req, res)
        .then(data => res.json(data))
        .catch(error => {
            console.error('Error updating policy category:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});


// Get all policies (CLEAR)
policy.get('/d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0', (req, res) => {
    policyController.getAllPolicies(req, res)
});

// Get policy by ID (HASHED)
policy.get(`/${endpoints['/policy/:id']}/:id`, logMiddleware, (req, res) => {
    policyController.getPolicyById(req, res)
        .then(data => res.json(data))
        .catch(error => {
            console.error('Error fetching policy:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// Get policy by ID (CLEAR)
policy.get('/policy-details-byid', (req, res) => {
    policyController.getPolicyById(req, res)
      
});


// Create policy (CLEAR)
policy.post('/add-policy', (req, res) => {
    policyController.createPolicy(req, res)

});


// Update policy (CLEAR)
policy.post('/update-policy/:id', (req, res) => {
    policyController.updatePolicy(req, res);
});



// Update policy status (CLEAR)
policy.post('/update-policy-status/:id', (req, res) => {
    policyController.updatePolicyStatus(req, res)
      
});


// Delete policy (CLEAR)
policy.post('/post-policy/:id', (req, res) => {
    policyController.deletePolicy(req, res)
       
});


// Get active policy by category - PUBLIC (CLEAR)
policy.post('/get-policy-details', (req, res) => {
    policyController.getActivePolicyByCategory(req, res)
        
});

module.exports = policy;