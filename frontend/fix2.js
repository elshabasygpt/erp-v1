const fs = require('fs');
let f2 = fs.readFileSync('src/components/customers/CustomerInsightsTab.tsx', 'utf8');
f2 = f2.replace(/pieData\.map\(\(entry, index\) => \(/g, 'pieData.map((entry: any, index: number) => (');
fs.writeFileSync('src/components/customers/CustomerInsightsTab.tsx', f2);
