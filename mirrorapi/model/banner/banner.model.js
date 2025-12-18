// Define the banner model
module.exports = (sequelize, DataTypes, Model) => {
  class banner extends Model {
    static async getBanner(type_id) {
      try {
        const banner = await this.findAll({
          where: {
            type_id: type_id,
            status: 1
          },
          order: [['id', 'DESC']],
        });
        return banner;
      } catch (err) {
        logger.error(`Unable to find Banner: ${err}`);
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

    static async UpdateData(data, whereClause) {
      try {
        const result = await this.update(data, {
          where: whereClause
        });
        return result;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }
  }

  banner.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    banner_for: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_on: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    modified_on: {
      type: DataTypes.DATE,
      allowNull: true
    },
    modified_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deleted_on: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    app_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Add new address fields
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    post_office_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    circle: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    division: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'banner',
    tableName: 'tbl_banners',
    timestamps: false
  });

  return banner;
};