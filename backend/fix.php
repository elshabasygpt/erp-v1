<?php

$path = 'app/Presentation/Controllers/API/Purchases/ProcurementController.php';
$content = file_get_contents($path);

// Fix $request->query('limit'
$content = str_replace("\$request->query('limit', 15)", "\$request->input('limit', 15)", $content);

// Fix orderBy('created_at', 'desc')
$content = str_replace("orderBy('created_at', 'desc')", "latest()", $content);

// Fix where('tenant_id', $tenantId)
$content = str_replace("where('tenant_id', \$tenantId)", "where(['tenant_id' => \$tenantId])", $content);
$content = preg_replace("/where\('tenant_id', \\\$this->getTenantId\(\\\$request\)\)/", "where(['tenant_id' => \$this->getTenantId(\$request)])", $content);

// Fix other specific where clauses that were causing warnings
$content = str_replace("where('status', \$request->query('status'))", "where(['status' => \$request->query('status')])", $content);
$content = str_replace("where('department', \$request->query('department'))", "where(['department' => \$request->query('department')])", $content);
$content = str_replace("where('supplier_id', \$request->query('supplier_id'))", "where(['supplier_id' => \$request->query('supplier_id')])", $content);

$content = str_replace("where('id', \$validated['purchase_request_id'])", "where(['id' => \$validated['purchase_request_id']])", $content);

// Fix Model::where to Model::query()->where
$content = str_replace("PurchaseRequestModel::where", "PurchaseRequestModel::query()->where", $content);
$content = str_replace("PurchaseOrderModel::where", "PurchaseOrderModel::query()->where", $content);
$content = str_replace("RFQModel::where", "RFQModel::query()->where", $content);

file_put_contents($path, $content);

echo "Done\n";
