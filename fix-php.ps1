$content = Get-Content -Path 'C:\Program Files\PHP\current\php.ini'
$content = $content -replace ';extension=fileinfo', 'extension=fileinfo'
Set-Content -Path 'C:\Program Files\PHP\current\php.ini' -Value $content
