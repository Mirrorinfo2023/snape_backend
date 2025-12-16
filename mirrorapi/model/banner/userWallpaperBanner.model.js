module.exports = (sequelize, DataTypes, Model) => {

    class userWallpaperBanner extends Model {

        // ✅ Get active banner by user
        static async getByUserId(user_id) {
            try {
                return await this.findOne({
                    where: {
                        user_id,
                        status: 1
                    }
                });
            } catch (err) {
                console.error("Get Banner Error:", err);
                throw err;
            }
        }

        // ✅ Insert or Update (ONE banner per user)
        static async upsertBanner(data) {
            try {
                const existing = await this.findOne({
                    where: {
                        user_id: data.user_id
                    }
                });

                if (existing) {
                    // 🔁 Update existing banner
                    return await this.update(
                        {
                            wallpaper_img: data.wallpaper_img,
                            modified_on: new Date(),
                            status: 1
                        },
                        {
                            where: { user_id: data.user_id }
                        }
                    );
                }

                // ➕ Insert new banner
                return await this.create({
                    user_id: data.user_id,
                    wallpaper_img: data.wallpaper_img,
                    created_on: new Date(),
                    status: 1
                });

            } catch (err) {
                console.error("Upsert Banner Error:", err);
                throw err;
            }
        }

        // ❌ Soft delete banner
        static async softDelete(user_id) {
            return await this.update(
                {
                    status: 0,
                    modified_on: new Date()
                },
                { where: { user_id } }
            );
        }
    }

    userWallpaperBanner.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true
            },

            wallpaper_img: {
                type: DataTypes.TEXT,
                allowNull: false
            },

            created_on: {
                type: DataTypes.DATE,
                allowNull: false
            },

            modified_on: {
                type: DataTypes.DATE,
                allowNull: true
            },

            status: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            }

        },
        {
            sequelize,
            modelName: "userWallpaperBanner",
            tableName: "tbl_wallpaper_banner",
            timestamps: false
        }
    );

    return userWallpaperBanner;
};
