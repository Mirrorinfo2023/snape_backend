// Define the PolicyCategory model
module.exports = (sequelize, DataTypes, Model) => {

    class PolicyCategory extends Model {

        static async getActiveCategories() {
            try {
                const categories = await this.findAll({
                    where: {
                        status: 1
                    },
                    order: [['category_name', 'ASC']],
                });
                return categories;
            } catch (err) {
                console.error(`Unable to find Policy Categories: ${err}`);
                throw err;
            }
        }

        static async getAllCategories(searchTerm = '', page = 1, limit = 10) {
            try {
                const offset = (page - 1) * limit;
                let whereClause = {};

                if (searchTerm) {
                    whereClause = {
                        [sequelize.Op.or]: [
                            { category_name: { [sequelize.Op.like]: `%${searchTerm}%` } }
                        ]
                    };
                }

                const { count, rows } = await this.findAndCountAll({
                    where: whereClause,
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
                console.error(`Unable to find Policy Categories: ${err}`);
                throw err;
            }
        }

        static async getCategoryById(id) {
            try {
                const category = await this.findByPk(id);
                return category;
            } catch (err) {
                console.error(`Unable to find Policy Category: ${err}`);
                throw err;
            }
        }

        static async createCategory(data) {
            try {
                const result = await this.create(data);
                return result;
            } catch (error) {
                console.error('Error creating Policy Category:', error);
                throw error;
            }
        }

        static async updateCategory(data, whereClause) {
            try {
                const result = await this.update(data, {
                    where: whereClause
                });
                return result;
            } catch (error) {
                console.error('Error updating Policy Category:', error);
                throw error;
            }
        }

        static async updateCategoryStatus(id, status) {
            try {
                const result = await this.update(
                    { status: status },
                    { where: { id: id } }
                );
                return result;
            } catch (error) {
                console.error('Error updating Policy Category status:', error);
                throw error;
            }
        }

        static async getCategoryStats() {
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
                console.error('Error getting category stats:', error);
                throw error;
            }
        }
    }

    PolicyCategory.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        category_name: {
            type: DataTypes.STRING(100),
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
        }
    },
        {
            sequelize,
            modelName: 'PolicyCategory',
            tableName: 'tbl_policy_categories',
            timestamps: false
        });

    return PolicyCategory;
}