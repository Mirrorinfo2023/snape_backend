module.exports = (sequelize, DataTypes, Model) => {

    class Ebook extends Model {

        // Get all ebooks
        static async getAllData() {
            return await this.findAll({
                order: [['id', 'DESC']]
            });
        }

        // Get ebooks by user
        static async getEbook(user_id) {
            try {
                return await this.findAll({
                    where: {
                        user_id: user_id,
                        status: 1
                    },
                    order: [['id', 'DESC']]
                });
            } catch (err) {
                console.error("Error in getEbook:", err);
            }
        }

        // Insert new ebook
        static async insertData(data) {
            try {
                return await this.create(data);
            } catch (error) {
                console.error("Error in insertData:", error);
                throw error;
            }
        }

        // Update ebook
        static async updateData(data, whereClause) {
            try {
                return await this.update(data, { where: whereClause });
            } catch (error) {
                console.error("Error in updateData:", error);
                throw error;
            }
        }
    }

    Ebook.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        ebook_name: { type: DataTypes.STRING, allowNull: false },
        author: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        images: { type: DataTypes.STRING, allowNull: false },
        price: { type: DataTypes.DOUBLE, allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        discount: { type: DataTypes.DOUBLE, allowNull: false },
        refund: { type: DataTypes.INTEGER, allowNull: true },
        refund_day_limit: { type: DataTypes.INTEGER, allowNull: true },
        status: { type: DataTypes.INTEGER, defaultValue: 0 },
        created_on: { type: DataTypes.DATE, allowNull: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        sale_quantity: { type: DataTypes.INTEGER, allowNull: true },
        category: { type: DataTypes.INTEGER, allowNull: true },
        book_file: { type: DataTypes.STRING, allowNull: true },
    }, {
        sequelize,
        modelName: 'Ebook',
        tableName: 'tbl_ebook_report',
        timestamps: false
    });

    return Ebook;
};
