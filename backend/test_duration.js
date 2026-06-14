const http = require('http');

function req(method, path, body, token, tenantId) {
    return new Promise((resolve) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost', port: 3000, path, method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(tenantId ? { 'X-Tenant-ID': tenantId } : {})
            }
        };
        const r = http.request(options, (res) => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
                catch(e) { resolve({ status: res.statusCode, body: b }); }
            });
        });
        r.on('error', (e) => resolve({ status: 0, error: e.message }));
        if (data) r.write(data);
        r.end();
    });
}

async function runTest() {
    console.log('Testing System Partnerships API...');
    
    // 1. Auth Login
    const login = await req('POST', '/api/auth/login', { email: 'admin@company.com', password: 'password' });
    if (login.status !== 200) {
        console.error('Login Failed', login.status, login.body);
        return;
    }
    const token = login.body.data.token;
    const tenantId = login.body.data.tenant_id;
    console.log('✅ Logged in successfully');

    // 2. Fetch Initial Partners
    const partnersBefore = await req('GET', '/api/partnerships/partners', null, token, tenantId);
    console.log(`✅ Fetched initial partners. Count: ${partnersBefore.body.data?.length}`);

    // 3. Create a Partner with duration
    const payload = {
        name: 'شريك تجريبي ' + Date.now(),
        capital_amount: 10000,
        profit_share_percentage: 10,
        duration_type: 'months',
        duration_value: 6
    };
    
    const create = await req('POST', '/api/partnerships/partners', payload, token, tenantId);
    if (create.status === 201 || create.status === 200) {
        console.log('✅ Partner with 6 months duration created successfully!');
        console.log('   Response ID:', create.body.data.id);
        
        // Let's verify the duration fields were saved!
        const getPartner = await req('GET', `/api/partnerships/partners/${create.body.data.id}`, null, token, tenantId);
        if (getPartner.status === 200 && getPartner.body.data.duration_type === 'months' && getPartner.body.data.duration_value === 6) {
           console.log('✅ Verified Partner duration fields returned correctly in GET request!');
        } else {
           console.log('❌ Failed to verify partner duration fields!', getPartner.body);
        }

    } else {
        console.error('❌ Failed to create partner', create.status, create.body);
    }
}

runTest();
