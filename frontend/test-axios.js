const axios = require('axios');
const FormData = require('form-data');
const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api', headers: { 'Content-Type': 'application/json' } });

async function test() {
    const form = new FormData();
    form.append('model_id', 'a21f122f-8d9a-4d70-8ea5-95deefaf74f8');
    form.append('year_from', '2014');
    form.append('year_to', '2007');
    
    try {
        await api.post('/inventory/vehicles/years', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (e) {
        console.log(e.response.data);
    }
}
test();
