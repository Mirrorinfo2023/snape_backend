// Define the Countries model
module.exports = (sequelize, DataTypes, Model) => {

  class affiliateLinkCategories extends Model {

    static async getCategory() {
      try {
        const categories = await this.findAll({
          raw: true
        });


        const grouped = {};

        categories.forEach(row => {
          if (!grouped[row.category_name]) {
            grouped[row.category_name] = {
              id: row.id,
              category_name: row.category_name,
              status: row.status,
              created_on: row.created_on,
              discount_amount: row.discount_amount,
              subcategories: []
            };
          }

          if (row.sub_category) {
            grouped[row.category_name].subcategories.push(row.sub_category);
          }
        });

        return Object.values(grouped);
      } catch (err) {
        logger.error(`Unable to find Category: ${err}`);
        throw err;
      }
    }



    static async getById(id) {
      try {
        return await this.findOne({
          where: { id }
        });
      } catch (error) {
        console.error("Error fetching category by ID:", error);
        throw error;
      }
    }


    static async getCategoryWithCategoryId(category_id) {
      try {
        const category = await this.findOne({

          where: {
            id: category_id
          },
          order: [['id', 'DESC']],
        });
        return category;
      } catch (err) {
        logger.error(`Unable to find Category: ${err}`);
      }

    }


    static async insertData(data) {
      try {
        const result = await this.create(data);
        return result;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }

    static async getDataWithClause(whereClause) {
      try {
        const result = await this.findAll({
          where: { status: 1, category_name: whereClause },
          order: [['created_on', 'ASC']],
        });
        return result;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }



    // static async updateData(data,id) {
    //   try {
    //     // console.log(data);
    //     const result = await this.update(data, {
    //       where: { id :id }
    //     });
    //       return result;
    //   } catch (error) {
    //       console.error('Error:', error);
    //       throw error;
    //   }
    // }

    static async updateData(data, whereClause) {
      try {
        const updateInsuarnce = await this.update(data, {
          where: whereClause
        });
        if (updateInsuarnce) {
          return { error: 0, message: 'Updated', result: updateInsuarnce.id };
        } else {
          return { error: 1, message: 'Not update', result: '' };
        }

      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }


  }




  affiliateLinkCategories.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sub_category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_on: {
      type: DataTypes.DATE,
      allowNull: true
    },
    discount_amount: {
      type: DataTypes.DOUBLE,
      allowNull: true
    }



  },
    {
      sequelize,
      modelName: ' affiliateLinkCategories',
      tableName: 'mst_affiliate_category', // specify table name here
      timestamps: false
    });

  return affiliateLinkCategories;
}


