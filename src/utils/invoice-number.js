function formatDocumentNumber(prefix, sequenceNumber, minLength = 4) {
    const padded = String(sequenceNumber).padStart(minLength, "0");
    return `${prefix}${padded}`;
}

async function getNextSequenceNumber(connection, key, defaultPrefix, defaultStart = 1001) {
    const [rows] = await connection.query(
        "SELECT `setting_value` FROM `settings` WHERE `setting_key` = ? FOR UPDATE",
        [key]
    );

    let nextVal = defaultStart;
    if (rows.length > 0 && rows[0].setting_value) {
        nextVal = parseInt(rows[0].setting_value, 10);
        if (isNaN(nextVal)) nextVal = defaultStart;
    } else {
        await connection.query(
            "INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)",
            [key, String(nextVal)]
        );
    }

    const prefixKey = key.replace("_next_number", "_prefix");
    const [prefixRows] = await connection.query(
        "SELECT `setting_value` FROM `settings` WHERE `setting_key` = ?",
        [prefixKey]
    );
    const prefix = prefixRows.length > 0 && prefixRows[0].setting_value ? prefixRows[0].setting_value : defaultPrefix;

    const formatted = formatDocumentNumber(prefix, nextVal);

    await connection.query(
        "UPDATE `settings` SET `setting_value` = ? WHERE `setting_key` = ?",
        [String(nextVal + 1), key]
    );

    return formatted;
}

module.exports = {
    formatDocumentNumber,
    getNextSequenceNumber
};
