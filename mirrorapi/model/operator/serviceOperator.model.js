const { Sequelize, DataTypes, Model, Op } = require('sequelize');

module.exports = (sequelize) => {

  class serviceOperator extends Model {
    // Insert new operator
    static async insertData(data) {
      try {
        const result = await this.create(data);
        return result;
      } catch (error) {
        console.error('Error inserting operator:', error);
        throw error;
      }
    }

    // Get all operators with status = 1
    static async getAllData() {
      try {
        const result = await this.findAll({
          where: { status: 1 },
          order: [['operator_name', 'ASC']],
        });
        return result;
      } catch (error) {
        console.error('Error fetching all operators:', error);
        throw error;
      }
    }

    // Get operators by category
    static async getDataWithClause(category) {
      try {
        const result = await this.findAll({
          where: { status: 1, category },
          order: [['operator_name', 'ASC']],
        });
        return result;
      } catch (error) {
        console.error('Error fetching operators by category:', error);
        throw error;
      }
    }

    // Get operator by biller_id
    static async getData(biller_id) {
      try {
        const result = await this.findOne({
          where: { status: 1, biller_id },
        });
        return result;
      } catch (error) {
        console.error('Error fetching operator by biller_id:', error);
        throw error;
      }
    }

    // Get distinct categories
    static async getDistinctCategories() {
      try {
        const categories = await this.findAll({
          attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']
          ],
          where: {
            status: 1,
            category: { [Op.ne]: null } // exclude null categories
          },
          order: [['category', 'ASC']]
        });

        // Return array of category names
        return categories.map(c => c.category);
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    }
  }

  serviceOperator.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    operator_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_on: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    modified_on: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    modified_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deleted_on: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    biller_id: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'serviceOperator',
    tableName: 'mst_service_operator',
    timestamps: false
  });

  return serviceOperator;
};
