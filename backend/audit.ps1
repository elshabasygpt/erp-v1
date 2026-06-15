$report = @{}

# 1. Large Controllers
$largeControllers = Get-ChildItem -Path "app\Presentation\Controllers" -Filter "*.php" -Recurse | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        Lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
        Path = $_.FullName
    }
} | Where-Object { $_.Lines -gt 150 } | Sort-Object Lines -Descending | Select-Object Name, Lines

$report['LargeControllers'] = $largeControllers

# 2. Controllers without validate
$controllersWithoutValidate = Get-ChildItem -Path "app\Presentation\Controllers" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content -match "public function store" -or $content -match "public function update") -and ($content -notmatch "validate\(")
} | Select-Object Name

$report['ControllersWithoutValidate'] = $controllersWithoutValidate

# 3. Missing Auth Middleware
$unprotectedRoutes = Get-Content "..\routes\api.php" | Select-String "Route::" | Where-Object { $_.Line -notmatch "middleware" -and $_.Line -notmatch "prefix" -and $_.Line -notmatch "group" } | Select-Object LineNumber, Line

$report['UnprotectedRoutes'] = $unprotectedRoutes

# 4. Missing Authorization (Policies/Gates)
$controllersWithoutAuthz = Get-ChildItem -Path "app\Presentation\Controllers" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -notmatch "authorize\(" -and $content -notmatch "Gate::" -and $content -notmatch "can\("
} | Select-Object Name

$report['ControllersWithoutAuthz'] = $controllersWithoutAuthz

# 5. Raw DB Queries
$rawQueries = Get-ChildItem -Path "app" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "DB::raw" -or $content -match "whereRaw" -or $content -match "selectRaw"
} | Select-Object Name

$report['RawQueries'] = $rawQueries

# 6. Models without fillable/guarded
$modelsWithoutProtection = Get-ChildItem -Path "app\Infrastructure\Eloquent\Models" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -notmatch "fillable" -and $content -notmatch "guarded"
} | Select-Object Name

$report['ModelsWithoutProtection'] = $modelsWithoutProtection

# 7. N+1 Queries (Missing with)
$n1Queries = Get-ChildItem -Path "app\Presentation\Controllers" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "::all\(\)" -or ($content -match "->get\(\)" -and $content -notmatch "->with\(")
} | Select-Object Name

$report['N1Queries'] = $n1Queries

# 8. Migrations without indices
$migrationsWithoutIndexes = Get-ChildItem -Path "database\migrations\tenant" -Filter "*.php" -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content -match "foreignId" -or $content -match "unsignedBigInteger" -or $content -match "uuid") -and ($content -notmatch "index" -and $content -notmatch "unique" -and $content -notmatch "foreign\(")
} | Select-Object Name

$report['MigrationsWithoutIndexes'] = $migrationsWithoutIndexes

# 9. Large Frontend Components
$largeComponents = Get-ChildItem -Path "..\frontend\src" -Filter "*.tsx" -Recurse | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        Lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
    }
} | Where-Object { $_.Lines -gt 300 } | Sort-Object Lines -Descending | Select-Object Name, Lines

$report['LargeComponents'] = $largeComponents

$report | ConvertTo-Json -Depth 4 | Out-File "audit_results.json"
