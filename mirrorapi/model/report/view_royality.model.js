module.exports = (sequelize, DataTypes, Model, Op) => {

    class royality_income extends Model {

        static async getAllData(whereCondition) {
            try {
                return await this.findAll({
                    where: whereCondition,
                    order: [['created_on', 'DESC']],
                });
            } catch (error) {
                console.error('Error:', error);
                throw error;
            }
        }
    }

    royality_income.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        royality_date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        created_on: {
            type: DataTypes.DATE,
            allowNull: false
        },
        royality_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        total_income: {
            type: DataTypes.STRING,
            allowNull: false
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        updated_on: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        sequelize,
        modelName: 'royality_income',
        tableName: 'view_royalty_income',
        timestamps: false
    });

    return royality_income;
};
