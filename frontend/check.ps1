$output = @()

$output += "=== File counts ==="
$output += "Sales: " + (Get-ChildItem -Path "src\components\sales" -File).Count
$output += "POS: " + (Get-ChildItem -Path "src\components\pos" -File).Count
$output += "Purchases: " + (Get-ChildItem -Path "src\components\purchases" -File).Count
$output += "Inventory: " + (Get-ChildItem -Path "src\components\inventory" -File).Count

$output += "`n=== Lines in Orchestrators ==="
$output += "SalesContent.tsx: " + (Get-Content "src\components\sales\SalesContent.tsx" | Measure-Object).Count
$output += "PosScreenContent.tsx: " + (Get-Content "src\components\pos\PosScreenContent.tsx" | Measure-Object).Count
$output += "PurchasesContent.tsx: " + (Get-Content "src\components\purchases\PurchasesContent.tsx" | Measure-Object).Count
$output += "InventoryContent.tsx: " + (Get-Content "src\components\inventory\InventoryContent.tsx" | Measure-Object).Count

$output += "`n=== React.memo checks ==="
Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx" |
    Where-Object { $_.FullName -match "sales|pos|purchases|inventory" -and $_.Name -notmatch "Content\.tsx" } |
    ForEach-Object { 
        $hasMemo = (Select-String -Path $_.FullName -Pattern "memo\(" -Quiet)
        $output += "$($_.Name) has memo: $hasMemo"
    }

$output += "`n=== useCallback checks ==="
Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx", "*.ts" |
    Where-Object { $_.FullName -match "sales|pos|purchases|inventory" } |
    ForEach-Object {
        $count = (Select-String -Path $_.FullName -Pattern "useCallback").Count
        if ($count -gt 0) { $output += "$($_.Name) useCallback count: $count" }
    }

$output += "`n=== useMemo checks ==="
Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx", "*.ts" |
    Where-Object { $_.FullName -match "sales|pos|purchases|inventory" } |
    ForEach-Object {
        $count = (Select-String -Path $_.FullName -Pattern "useMemo").Count
        if ($count -gt 0) { $output += "$($_.Name) useMemo count: $count" }
    }

$output += "`n=== Bad API calls in sub-components ==="
Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx" |
    Where-Object { $_.Name -notmatch "Content\.tsx|Modals?\.tsx" -and $_.FullName -match "sales|pos|purchases|inventory" } |
    ForEach-Object {
        $res = Select-String -Path $_.FullName -Pattern "fetch\(|axios|api\."
        if ($res) { $output += "$($_.Name) has API call!" }
    }

$output += "`n=== Console.log checks ==="
Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx", "*.ts" |
    Where-Object { $_.FullName -match "sales|pos|purchases|inventory" } |
    ForEach-Object {
        $res = Select-String -Path $_.FullName -Pattern "console\.log"
        if ($res) { $output += "$($_.Name) has console.log!" }
    }

$output | Out-String
