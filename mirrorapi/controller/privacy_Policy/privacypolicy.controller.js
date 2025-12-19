const { connect } = require('../../config/db.config');
const { DataEncrypt, DataDecrypt } = require('../../utility/utility');

class Policy {
    db = {};

    constructor() {
        this.db = connect();
    }

    // Get all policy categories
    async getPolicyCategories(req, res) {
        try {
            const decryptedObject = req.body.encReq ? DataDecrypt(req.body.encReq) : req.query;
            const { searchTerm = '', page = 1, limit = 10 } = decryptedObject;

            const pages = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pages - 1) * pageSize;

            let whereClause = {};
            if (searchTerm) {
                whereClause = {
                    category_name: { [this.db.Sequelize.Op.like]: `%${searchTerm}%` }
                };
            }

            const { count, rows } = await this.db.PolicyCategory.findAndCountAll({
                where: whereClause,
                order: [['created_on', 'DESC']],
                limit: pageSize,
                offset: offset
            });

            const response = {
                status: 200,
                message: 'Policy categories fetched successfully',
                data: rows,
                pagination: {
                    page: pages,
                    limit: pageSize,
                    total: count,
                    totalPages: Math.ceil(count / pageSize)
                }
            };

            const encryptedResponse = DataEncrypt(JSON.stringify(response));
            res.json({ data: encryptedResponse });
        } catch (error) {
            console.error('Error fetching policy categories:', error);
            if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map((err) => err.message);
                return res.status(500).json(DataEncrypt(JSON.stringify({
                    status: 500,
                    errors: 'Internal Server Error',
                    data: validationErrors
                })));
            }
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Get active policy categories for dropdowns
    async getActivePolicyCategories(req, res) {
        try {
            const categories = await this.db.PolicyCategory.findAll({
                where: {
                    status: 1
                },
                order: [['category_name', 'ASC']],
            });

            if (categories) {
                const response = {
                    status: 200,
                    message: 'Active policy categories fetched successfully',
                    data: categories
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'No active categories found',
                    data: []
                })));
            }
        } catch (error) {
            console.error('Error fetching active categories:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Get policy category by ID
    async getPolicyCategoryById(req, res) {
        try {
            const decryptedObject = req.encReq ? DataDecrypt(req.encReq) : req.params;
            const { id } = decryptedObject;

            const category = await this.db.PolicyCategory.findOne({
                where: { id: id }
            });

            if (category) {
                const response = {
                    status: 200,
                    message: 'Policy category fetched successfully',
                    data: category
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy category not found',
                    data: []
                })));
            }
        } catch (error) {
            console.error('Error fetching policy category:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Create policy category
    async createPolicyCategory(req, res) {
        try {
            const decryptedObject = DataDecrypt(req.encReq);
            const { category_name, status = 1 } = decryptedObject;

            let t = await this.db.sequelize.transaction();

            try {
                const categoryData = {
                    category_name,
                    status,
                    created_on: new Date()
                };

                const result = await this.db.PolicyCategory.create(categoryData, { transaction: t });

                if (result) {
                    await t.commit();
                    const response = {
                        status: 201,
                        message: 'Policy category created successfully',
                        data: result
                    };
                    const encryptedResponse = DataEncrypt(JSON.stringify(response));
                    return res.status(201).json({ data: encryptedResponse });
                } else {
                    await t.rollback();
                    return res.status(500).json(DataEncrypt(JSON.stringify({
                        status: 500,
                        error: 'Failed to create policy category'
                    })));
                }
            } catch (error) {
                await t.rollback();
                if (error.name === 'SequelizeValidationError') {
                    const validationErrors = error.errors.map((err) => err.message);
                    return res.status(500).json(DataEncrypt(JSON.stringify({
                        status: 500,
                        errors: validationErrors
                    })));
                }
                throw error;
            }
        } catch (error) {
            console.error('Error creating policy category:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Update policy category
    async updatePolicyCategory(req, res) {
        try {
            const decryptedObject = DataDecrypt(req.encReq);
            const { id, category_name, status } = decryptedObject;

            let t = await this.db.sequelize.transaction();

            try {
                const categoryData = {
                    category_name,
                    status
                };

                const whereClause = {
                    id: id
                };

                const [updatedRows] = await this.db.PolicyCategory.update(categoryData, {
                    where: whereClause,
                    transaction: t
                });

                if (updatedRows > 0) {
                    await t.commit();

                    const updatedCategory = await this.db.PolicyCategory.findOne({
                        where: { id: id }
                    });

                    const response = {
                        status: 200,
                        message: 'Policy category updated successfully',
                        data: updatedCategory
                    };
                    const encryptedResponse = DataEncrypt(JSON.stringify(response));
                    return res.status(200).json({ data: encryptedResponse });
                } else {
                    await t.rollback();
                    return res.status(404).json(DataEncrypt(JSON.stringify({
                        status: 404,
                        error: 'Policy category not found'
                    })));
                }
            } catch (error) {
                await t.rollback();
                if (error.name === 'SequelizeValidationError') {
                    const validationErrors = error.errors.map((err) => err.message);
                    return res.status(500).json(DataEncrypt(JSON.stringify({
                        status: 500,
                        errors: validationErrors
                    })));
                }
                throw error;
            }
        } catch (error) {
            console.error('Error updating policy category:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Update category status
    async updateCategoryStatus(req, res) {
        try {
            const decryptedObject = DataDecrypt(req.encReq);
            const { id, status } = decryptedObject;

            if (![1, 2].includes(parseInt(status))) {
                return res.status(400).json(DataEncrypt(JSON.stringify({
                    status: 400,
                    message: 'Invalid status value'
                })));
            }

            const [updatedRows] = await this.db.PolicyCategory.update(
                { status: status },
                { where: { id: id } }
            );

            if (updatedRows > 0) {
                const response = {
                    status: 200,
                    message: `Policy category ${status === 1 ? 'activated' : 'deactivated'} successfully`
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                return res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy category not found'
                })));
            }
        } catch (error) {
            console.error('Error updating category status:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Get all policies with categories
    async getAllPolicies(req, res) {
        try {
            const {
                searchTerm = '',
                category_id = '',
                status = '',
                page = 1,
                limit = 10
            } = req.query;

            const pages = parseInt(page, 10) || 1;
            const pageSize = parseInt(limit, 10) || 10;
            const offset = (pages - 1) * pageSize;

            let whereClause = {};

            if (searchTerm) {
                whereClause.content = {
                    [this.db.Sequelize.Op.like]: `%${searchTerm}%`
                };
            }

            if (category_id) {
                whereClause.category_id = category_id;
            }

            if (status !== '') {
                whereClause.status = status;
            }

            const { count, rows } = await this.db.Policy.findAndCountAll({
                where: whereClause,
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name', 'status'],
                    required: false
                }],
                order: [['created_on', 'DESC']],
                limit: pageSize,
                offset
            });

            // Convert Sequelize rows → plain objects
            const policies = rows.map(row => {
                const p = row.get({ plain: true });
                return {
                    id: p.id,
                    category_id: p.category_id,
                    category_name: p.category?.category_name || null,
                    content: p.content,
                    status: p.status,
                    created_on: p.created_on,
                    updated_on: p.updated_on
                };
            });

            return res.status(200).json({
                status: 200,
                message: 'Policies fetched successfully',
                data: policies,
                pagination: {
                    page: pages,
                    limit: pageSize,
                    total: count,
                    totalPages: Math.ceil(count / pageSize)
                },
                report: {
                    total_count: await this.db.Policy.count(),
                    total_active: await this.db.Policy.count({ where: { status: 1 } }),
                    total_inactive: await this.db.Policy.count({ where: { status: 2 } })
                }
            });

        } catch (error) {
            console.error('Error fetching policies:', error);
            return res.status(500).json({
                status: 500,
                message: error.message || 'Internal Server Error',
                data: []
            });
        }
    }



    // Get policy by ID
    async getPolicyById(req, res) {
        try {
            // const decryptedObject = req.body.encReq ? DataDecrypt(req.body.encReq) : req.params;
            const decryptedObject = req.body;
            console.log("decryptedObject ", decryptedObject)
            const { id } = decryptedObject;

            const policy = await this.db.Policy.findOne({
                where: { id: id },
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name', 'status']
                }]
            });

            if (policy) {
                const response = {
                    status: 200,
                    message: 'Policy fetched successfully',
                    data: policy
                };
                const encryptedResponse = (response);
                res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy not found',
                    data: []
                })));
            }
        } catch (error) {
            console.error('Error fetching policy:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Create policy
    async createPolicy(req, res) {
        let t;
        try {
            const { category_id, content, status = 1 } = req.body;

            t = await this.db.sequelize.transaction();

            const policyData = {
                category_id,
                content,
                status,
                created_on: new Date()
            };

            const result = await this.db.Policy.create(policyData, { transaction: t });

            if (!result) {
                await t.rollback();
                return res.status(500).json({ status: 500, message: 'Failed to create policy' });
            }

            await t.commit();

            const newPolicy = await this.db.Policy.findOne({
                where: { id: result.id },
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name', 'status']
                }]
            });

            return res.status(201).json({ status: 201, message: 'Policy created successfully', data: newPolicy });

        } catch (error) {
            if (t) await t.rollback();
            console.error('Error creating policy:', error);
            return res.status(500).json({ status: 500, message: error.message, data: [] });
        }
    }

    // Update policy
    async updatePolicy(req, res) {
        let t;
        try {
            const { category_id, content, status } = req.body;
            const policyId = req.params.id;

            if (!policyId) {
                return res.status(400).json({ status: 400, message: 'Policy ID is required' });
            }

            t = await this.db.sequelize.transaction();

            const policyData = {
                category_id,
                content,
                status,
                updated_on: new Date()
            };

            const [updatedRows] = await this.db.Policy.update(policyData, {
                where: { id: policyId },
                transaction: t
            });

            if (updatedRows === 0) {
                await t.rollback();
                return res.status(404).json({ status: 404, message: 'Policy not found' });
            }

            await t.commit();

            const updatedPolicy = await this.db.Policy.findOne({
                where: { id: policyId },
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name', 'status']
                }]
            });

            return res.status(200).json({ status: 200, message: 'Policy updated successfully', data: updatedPolicy });

        } catch (error) {
            if (t) await t.rollback();
            console.error('Error updating policy:', error);
            return res.status(500).json({ status: 500, message: error.message, data: [] });
        }
    }

    // Update policy status
    async updatePolicyStatus(req, res) {
        try {
            // Decrypt the incoming payload
            const decryptedObject = DataDecrypt(req.body.data); // <- frontend sends { data: encryptedData }
            console.log("update ststus: ", decryptedObject)
            const { status } = decryptedObject;
            const id = req.params.id; // get id from URL param

            if (![1, 2].includes(parseInt(status))) {
                return res.status(400).json(DataEncrypt(JSON.stringify({
                    status: 400,
                    message: 'Invalid status value'
                })));
            }

            const [updatedRows] = await this.db.Policy.update(
                {
                    status: parseInt(status),
                    updated_on: new Date()
                },
                { where: { id } }
            );

            if (updatedRows > 0) {
                const response = {
                    status: 200,
                    message: `Policy ${status === 1 ? 'activated' : 'deactivated'} successfully`
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                return res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy not found'
                })));
            }
        } catch (error) {
            console.error('Error updating policy status:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Delete policy
    async deletePolicy(req, res) {
        try {
            const decryptedObject = req.encReq ? DataDecrypt(req.encReq) : req.params;
            const { id } = decryptedObject;

            const deletedRows = await this.db.Policy.destroy({
                where: { id: id }
            });

            if (deletedRows > 0) {
                const response = {
                    status: 200,
                    message: 'Policy deleted successfully'
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                return res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy not found'
                })));
            }
        } catch (error) {
            console.error('Error deleting policy:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Get active policy by category (for public display)
    async getActivePolicyByCategory(req, res) {
        try {
            // const decryptedObject = req.body.encReq ? DataDecrypt(req.body.encReq) : req.params;
            const decryptedObject = req.body;
            const { category } = decryptedObject;

            // Find category by name
            const categoryRecord = await this.db.PolicyCategory.findOne({
                where: {
                    [this.db.Sequelize.Op.or]: [
                        {
                            category_name: {
                                [this.db.Sequelize.Op.like]: category.replace(/_/g, ' ')
                            }
                        },
                        {
                            category_name: {
                                [this.db.Sequelize.Op.like]: category
                            }
                        }
                    ],
                    status: 1
                }
            });

            if (!categoryRecord) {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'Policy category not found',
                    data: []
                })));
            }

            const policy = await this.db.Policy.findOne({
                where: {
                    category_id: categoryRecord.id,
                    status: 1
                },
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name']
                }],
                order: [['updated_on', 'DESC'], ['created_on', 'DESC']]
            });

            if (policy) {
                const response = {
                    status: 200,
                    message: 'Policy fetched successfully',
                    data: policy
                };
                const encryptedResponse = DataEncrypt(JSON.stringify(response));
                res.json({ data: encryptedResponse });
            } else {
                return res.status(404).json(DataEncrypt(JSON.stringify({
                    status: 404,
                    message: 'No active policy found for this category',
                    data: []
                })));
            }
        } catch (error) {
            console.error('Error fetching active policy:', error);
            return res.status(500).json(DataEncrypt(JSON.stringify({
                status: 500,
                message: error.message,
                data: []
            })));
        }
    }

    // Get all policies without encryption (for admin panel)
    async getPolicyList(req, res) {
        try {
            const { searchTerm = '', category_id = '', status = '', page = 1, limit = 10 } = req.query;

            const pages = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pages - 1) * pageSize;

            let whereClause = {};

            if (searchTerm) {
                whereClause.content = { [this.db.Sequelize.Op.like]: `%${searchTerm}%` };
            }

            if (category_id) {
                whereClause.category_id = category_id;
            }

            if (status) {
                whereClause.status = status;
            }

            const { count, rows } = await this.db.Policy.findAndCountAll({
                where: whereClause,
                include: [{
                    model: this.db.PolicyCategory,
                    as: 'category',
                    attributes: ['id', 'category_name', 'status']
                }],
                order: [['created_on', 'DESC']],
                limit: pageSize,
                offset: offset
            });

            if (rows) {
                return res.status(200).json({
                    status: 200,
                    message: 'Policies fetched successfully',
                    data: rows,
                    pagination: {
                        page: pages,
                        limit: pageSize,
                        total: count,
                        totalPages: Math.ceil(count / pageSize)
                    }
                });
            } else {
                return res.status(404).json({
                    status: 404,
                    message: 'No policies found',
                    data: []
                });
            }
        } catch (error) {
            console.error('Error fetching policies list:', error);
            if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map((err) => err.message);
                return res.status(500).json({
                    status: 500,
                    errors: 'Internal Server Error',
                    data: validationErrors
                });
            }
            return res.status(500).json({
                status: 500,
                message: error.message,
                data: []
            });
        }
    }
}

module.exports = new Policy();