// models/deviceInfo.js
module.exports = (sequelize, DataTypes, Model, Op) => {

    class deviceinfo extends Model {

        // Build OR condition for search
        static buildSearchObjectWithOR(SearchOBJ) {
            const conditions = Object.keys(SearchOBJ).map((key) => ({
                [key]: SearchOBJ[key],
            }));
            return { [Op.or]: conditions };
        }

        // Build LIKE condition for search
        static buildSearchObjectWithLike(SearchOBJ) {
            const conditions = Object.keys(SearchOBJ).map((key) => ({
                [key]: { [Op.like]: `%${SearchOBJ[key]}%` },
            }));
            return { [Op.or]: conditions };
        }

        // Search single device with LIKE
        static async getDeviceSearchByData(SearchOBJ) {
            try {
                const device = await this.findOne({
                    where: {
                        [Op.and]: [
                            this.buildSearchObjectWithLike(SearchOBJ),
                            { status: 1 },
                        ],
                    },
                });
                return device;
            } catch (error) {
                throw error;
            }
        }

        // Search single device with OR
        static async getDeviceSearchByDataWithOR(SearchOBJ) {
            try {
                const device = await this.findOne({
                    where: {
                        [Op.and]: [
                            this.buildSearchObjectWithOR(SearchOBJ),
                            { status: 1 },
                        ],
                    },
                });
                return device;
            } catch (error) {
                throw error;
            }
        }

        // Insert new device info
        static async insertData(data) {
            try {
                const result = await this.create(data);
                return result;
            } catch (error) {
                console.error('Error inserting device info:', error);
                throw error;
            }
        }

        // Update device info by ID
        static async updateData(data, id) {
            try {
                const result = await this.update(data, { where: { id } });
                return result;
            } catch (error) {
                console.error('Error updating device info:', error);
                throw error;
            }
        }

        // Get single device data
        static async getData(attributes, whereClause) {
            try {
                const fixedCondition = { status: 1 };
                const result = await this.findOne({
                    attributes,
                    where: { ...fixedCondition, ...whereClause },
                });
                return result;
            } catch (error) {
                console.error('Error fetching device info:', error);
                throw error;
            }
        }

        // Check if device exists
        static async deviceExists(device_id, imei) {
            try {
                const count = await this.count({
                    where: {
                        [Op.or]: [
                            { device_id },
                            { imei }
                        ],
                        status: 1
                    }
                });
                return count > 0;
            } catch (error) {
                console.error('Error checking device existence:', error);
                throw error;
            }
        }

        // Get all devices
        static async getAllDevices() {
            try {
                const devices = await this.findAll({ where: { status: 1 } });
                return devices;
            } catch (error) {
                console.error('Error fetching all devices:', error);
                throw error;
            }
        }
    }

    deviceinfo.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        device_name: { type: DataTypes.STRING, allowNull: true },
        device_model: { type: DataTypes.STRING, allowNull: true },
        os: { type: DataTypes.STRING, allowNull: true },
        os_version: { type: DataTypes.STRING, allowNull: true },
        device_id: { type: DataTypes.STRING, allowNull: true, unique: true },
        imei: { type: DataTypes.STRING, allowNull: true, unique: true },
        fcm_token: { type: DataTypes.STRING, allowNull: true },
        ip_address: { type: DataTypes.STRING, allowNull: true },
        last_login: { type: DataTypes.DATE, allowNull: true },
        created_on: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        modified_on: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
    }, {
        sequelize,
        modelName: 'deviceinfo',
        tableName: 'tbl_device_info',
        timestamps: false
    });

    return deviceinfo;
};
