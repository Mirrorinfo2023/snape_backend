module.exports = (sequelize, DataTypes, Model) => {

    class mobileplan extends Model {

        // =========================
        // GET ALL DATA
        // =========================
        static async getData() {
            try {
                const result = await this.findAll({
                    order: [['id', 'DESC']],
                });
                return result;
            } catch (error) {
                console.error("Error:", error);
                throw error;
            }
        }

        // =========================
        // INSERT DATA
        // =========================
        static async insertData(data) {
            try {
                const result = await this.create(data);
                return result;
            } catch (error) {
                console.error("Error:", error);
                throw error;
            }
        }

        // =========================
        // UPDATE DATA
        // =========================
        static async updateData(data, whereClause) {
            try {
                const result = await this.update(data, {
                    where: whereClause
                });
                return result;
            } catch (error) {
                console.error("Error:", error);
                throw error;
            }
        }

        // =========================
        // GET ONE ROW
        // =========================
        static async getOne(whereClause) {
            try {
                const result = await this.findOne({
                    where: whereClause
                });
                return result;
            } catch (error) {
                console.error("Error:", error);
                throw error;
            }
        }
    }



    // =========================
    // MODEL DEFINITION
    // =========================
    mobileplan.init(
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
            },
            operator: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            circle: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            mobile: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            plans: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            last_updated: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_on: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            updated_on: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "mobileplan",   // ✅ MODEL NAME CHANGED
            tableName: "mst_mobile_plans", // Table stays same
            timestamps: false,
        }
    );

    return mobileplan;
};
