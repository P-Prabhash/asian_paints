const { pool } = require("../config/database");

async function withTransaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Database transaction rollback failed:", rollbackError);
            if (error instanceof Error) {
                error.rollbackError = rollbackError;
            }
        }
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = withTransaction;
