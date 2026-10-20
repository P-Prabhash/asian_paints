const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const parentDir = path.join(__dirname, '..', '..');
const outputZip = path.join(parentDir, 'Paint_Shop_Backend_Complete.zip');

console.log('Packaging Paint Shop Backend workspace into clean ZIP...');

if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
}

try {
    const psCommand = `
        $staging = Join-Path $env:TEMP "paint_shop_backend_staging";
        if (Test-Path $staging) { Remove-Item $staging -Recurse -Force };
        New-Item -ItemType Directory -Path $staging | Out-Null;

        Get-ChildItem -Path "${backendDir.replace(/\\/g, '/')}" -Exclude "node_modules", ".env", ".git", ".idea", "backups" | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $staging -Recurse -Force
        };

        $rootSql = "${path.join(parentDir, 'database_asian_paints.sql').replace(/\\/g, '/')}";
        if (Test-Path $rootSql) {
            Copy-Item -Path $rootSql -Destination $staging -Force
        }

        Compress-Archive -Path "$staging\\*" -DestinationPath "${outputZip.replace(/\\/g, '/')}" -Force;
        Remove-Item $staging -Recurse -Force;
    `;

    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    console.log(`Backend packaged successfully: ${outputZip}`);
} catch (err) {
    console.error('Failed to package backend ZIP:', err.message);
}
