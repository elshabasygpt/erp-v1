const fs = require('fs');

let f1 = fs.readFileSync('src/components/purchases/hooks/usePurchaseForm.ts', 'utf8');
f1 = f1.replace(/status: 'completed', warehouse_id/g, "status: 'completed', notes: warehouse_id");
fs.writeFileSync('src/components/purchases/hooks/usePurchaseForm.ts', f1);

let f2 = fs.readFileSync('src/components/customers/CustomerInsightsTab.tsx', 'utf8');
f2 = f2.replace(/\{channelData\.map\(\(entry, index\) => \(/g, '{channelData.map((entry: any, index: number) => (');
fs.writeFileSync('src/components/customers/CustomerInsightsTab.tsx', f2);
