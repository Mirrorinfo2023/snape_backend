// Define the Policy model
module.exports = (sequelize, DataTypes, Model) => {

    class Policy extends Model {

        static async getAllPolicies(filters = {}, page = 1, limit = 10) {
            try {
                const offset = (page - 1) * limit;
                let whereClause = {};

                // Build where clause based on filters
                if (filters.searchTerm) {
                    whereClause = {
                        ...whereClause,
                        content: { [sequelize.Op.like]: `%${filters.searchTerm}%` }
                    };
                }

                if (filters.category_id) {
                    whereClause = {
                        ...whereClause,
                        category_id: filters.category_id
                    };
                }

                if (filters.status) {
                    whereClause = {
                        ...whereClause,
                        status: filters.status
                    };
                }

                const { count, rows } = await this.findAndCountAll({
                    where: whereClause,
                    include: [{
                        model: sequelize.models.PolicyCategory,
                        as: 'category',
                        attributes: ['id', 'category_name', 'status']
                    }],
                    order: [['created_on', 'DESC']],
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                });

                return {
                    data: rows,
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                };
            } catch (err) {
                console.error(`Unable to find Policies: ${err}`);
                throw err;
            }
        }

        static async getPolicyById(id) {
            try {
                const policy = await this.findByPk(id, {
                    include: [{
                        model: sequelize.models.PolicyCategory,
                        as: 'category',
                        attributes: ['id', 'category_name', 'status']
                    }]
                });
                return policy;
            } catch (err) {
                console.error(`Unable to find Policy: ${err}`);
                throw err;
            }
        }

        static async getActivePolicyByCategory(categoryId) {
            try {
                const policy = await this.findOne({
                    where: {
                        category_id: categoryId,
                        status: 1
                    },
                    include: [{
                        model: sequelize.models.PolicyCategory,
                        as: 'category',
                        attributes: ['id', 'category_name']
                    }],
                    order: [['updated_on', 'DESC'], ['created_on', 'DESC']],
                });
                return policy;
            } catch (err) {
                console.error(`Unable to find Active Policy: ${err}`);
                throw err;
            }
        }

        static async getPolicyByCategoryName(categoryName) {
            try {
                const policy = await this.findOne({
                    include: [{
                        model: sequelize.models.PolicyCategory,
                        as: 'category',
                        where: {
                            [sequelize.Op.or]: [
                                { category_name: { [sequelize.Op.like]: categoryName } },
                                {
                                    category_name: {
                                        [sequelize.Op.like]: categoryName.replace(/_/g, ' ')
                                    }
                                }
                            ],
                            status: 1
                        },
                        attributes: ['id', 'category_name']
                    }],
                    where: {
                        status: 1
                    },
                    order: [['updated_on', 'DESC'], ['created_on', 'DESC']],
                });
                return policy;
            } catch (err) {
                console.error(`Unable to find Policy by Category Name: ${err}`);
                throw err;
            }
        }

        static async createPolicy(data) {
            try {
                const result = await this.create(data);
                return result;
            } catch (error) {
                console.error('Error creating Policy:', error);
                throw error;
            }
        }

        static async updatePolicy(data, whereClause) {
            try {
                data.updated_on = new Date();
                const result = await this.update(data, {
                    where: whereClause
                });
                return result;
            } catch (error) {
                console.error('Error updating Policy:', error);
                throw error;
            }
        }

        static async updatePolicyStatus(id, status) {
            try {
                const result = await this.update(
                    {
                        status: status,
                        updated_on: new Date()
                    },
                    { where: { id: id } }
                );
                return result;
            } catch (error) {
                console.error('Error updating Policy status:', error);
                throw error;
            }
        }

        static async deletePolicy(id) {
            try {
                const result = await this.destroy({
                    where: { id: id }
                });
                return result;
            } catch (error) {
                console.error('Error deleting Policy:', error);
                throw error;
            }
        }

        static async getPolicyStats() {
            try {
                const result = await this.findAll({
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count'],
                        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 1 THEN 1 ELSE 0 END")), 'total_active'],
                        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 2 THEN 1 ELSE 0 END")), 'total_inactive']
                    ],
                    raw: true
                });
                return result[0] || { total_count: 0, total_active: 0, total_inactive: 0 };
            } catch (error) {
                console.error('Error getting policy stats:', error);
                throw error;
            }
        }
    }

    Policy.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tbl_policy_categories',
                key: 'id'
            }
        },
        content: {
            type: DataTypes.TEXT('long'),
            allowNull: false
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 1,
            comment: '1=active,2=inactive'
        },
        created_on: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated_on: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
        {
            sequelize,
            modelName: 'Policy',
            tableName: 'tbl_policies',
            timestamps: false
        });

    return Policy;
}