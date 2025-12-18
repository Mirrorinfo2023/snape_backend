const { connect } = require('../../config/db.config');
const logger = require('../../logger/api.logger');
const { Op } = require('sequelize');

/**
 * ✅ Fields allowed to be stored in DB
 * Anything else will be ignored automatically
 */
const ALLOWED_DEVICE_FIELDS = [
    'user_id',
    'device_name',
    'manufacturer',
    'device_model',
    'device_code',
    'product',
    'hardware',
    'os',
    'device_id',
    'fcm_token',
    'ip_address',
    'last_login',
    'status'
];

/**
 * ✅ Builds payload dynamically
 * Only inserts fields that actually exist
 */
function buildDynamicPayload(source, allowedFields) {
    const payload = {};
    allowedFields.forEach((field) => {
        if (source[field] !== undefined && source[field] !== null) {
            payload[field] = source[field];
        }
    });
    return payload;
}

class deviceInfo {

    db = {};

    constructor() {
        this.db = connect();
    }

    /**
     * ✅ Add / Register Device Info
     */
    async addDeviceInfo(req, res) {
        try {
            const {
                user_id,
                androidInfo,
                device_id,
                fcm_token
            } = req.body;

            if (!user_id || !device_id) {
                return res.status(400).json({
                    status: 400,
                    message: 'user_id and device_id are required'
                });
            }

            // Collect incoming data (only what comes from device)
            const incomingData = {
                user_id,
                device_name: androidInfo?.brand,
                manufacturer: androidInfo?.manufacturer,
                device_model: androidInfo?.model,
                device_code: androidInfo?.device,
                product: androidInfo?.product,
                hardware: androidInfo?.hardware,
                os: 'Android',
                device_id,
                fcm_token,
                ip_address: req.ip,
                last_login: new Date(),
                status: 1
            };

            // Build dynamic payload
            const payload = buildDynamicPayload(
                incomingData,
                ALLOWED_DEVICE_FIELDS
            );

            /**
             * ✅ OPTIONAL (Recommended):
             * If device already exists → update last_login
             */
            const existingDevice = await this.db.deviceinfo.findOne({
                where: { user_id, device_id }
            });

            let result;
            if (existingDevice) {
                await this.db.deviceinfo.update(payload, {
                    where: { user_id, device_id }
                });

                result = await this.db.deviceinfo.findOne({
                    where: { user_id, device_id }
                });
            } else {
                result = await this.db.deviceinfo.create(payload);
            }

            return res.status(200).json({
                status: 200,
                message: 'Device info saved successfully',
                data: result
            });

        } catch (error) {
            logger.error(`Device insert error: ${error}`);

            return res.status(500).json({
                status: 500,
                message: 'Failed to save device info',
                error: error.message
            });
        }
    }

    /**
     * ✅ Get all devices of a user
     */
    async getUserDevices(req, res) {
        try {
            const { user_id } = req.body;

            const devices = await this.db.deviceinfo.findAll({
                where: {
                    user_id,
                    status: 1
                },
                order: [['last_login', 'DESC']]
            });

            return res.status(200).json({
                status: 200,
                data: devices
            });

        } catch (error) {
            logger.error(`Get device error: ${error}`);

            return res.status(500).json({
                status: 500,
                message: 'Failed to fetch devices'
            });
        }
    }

}

module.exports = new deviceInfo();
