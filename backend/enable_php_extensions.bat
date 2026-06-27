@echo off
echo Enabling PHP extensions...
powershell -Command "$file = 'C:\Program Files\PHP\current\php.ini'; $content = Get-Content -Path $file; $content = $content -replace '(?m)^;extension=openssl', 'extension=openssl' -replace '(?m)^;extension=fileinfo', 'extension=fileinfo' -replace '(?m)^;extension=zip', 'extension=zip' -replace '(?m)^;extension=gd', 'extension=gd'; Set-Content -Path $file $content"
echo Done!
pause
