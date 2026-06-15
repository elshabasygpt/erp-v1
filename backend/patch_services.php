<?php
$files = [
    'app/Application/Reports/Services/ReportingService.php',
    'app/Application/Analytics/Services/AnalyticsService.php'
];

foreach ($files as $file) {
    $content = file_get_contents($file);
    $content = preg_replace("/(DB::connection\('tenant'\)->table\('[^']+'\))/", "$1->where('tenant_id', \$this->tenantId)", $content);
    file_put_contents($file, $content);
}
echo "Done\n";
