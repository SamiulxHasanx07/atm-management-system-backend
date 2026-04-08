const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  // Test 1: Health Check
  console.log('1️⃣  Health Check');
  const health = await request('GET', '/health');
  console.log(`   Status: ${health.status}`);
  console.log(`   Success: ${health.data.success}\n`);

  // Test 2: Swagger UI
  console.log('2️⃣  Swagger UI');
  const swagger = await request('GET', '/api-docs');
  console.log(`   Status: ${swagger.status}\n`);

  // Test 3: Create Account
  console.log('3️⃣  Create Account');
  const timestamp = Date.now();
  const createAccount = await request('POST', '/api/accounts', {
    name: 'Test User',
    phone_number: `017${timestamp % 1000000}`,
    email: `test${timestamp}@example.com`,
    gender: 'Male',
    profession: 'Developer',
    nationality: 'Bangladeshi',
    nid: `${timestamp}${timestamp % 10000}`,
    address: '123 Test Street, Dhaka',
    initial_deposit: 1000,
  });
  console.log(`   Status: ${createAccount.status}`);
  console.log(`   Success: ${createAccount.data.success}`);
  if (createAccount.data.success) {
    console.log(`   Account Number: ${createAccount.data.data.account.account_number}`);
    console.log(`   Card Number: ${createAccount.data.data.account.card_number}`);
    console.log(`   PIN: ${createAccount.data.data.pin}`);
    console.log(`   Balance: ${createAccount.data.data.account.balance} TK\n`);
  } else {
    console.log(`   Error: ${createAccount.data.message}\n`);
  }

  // Test 4: Login with created card
  console.log('4️⃣  Login');
  const cardNumber = createAccount.data.data.account.card_number;
  const pin = createAccount.data.data.pin;
  const login = await request('POST', '/api/accounts/login', {
    card_number: cardNumber,
    pin: pin,
  });
  console.log(`   Status: ${login.status}`);
  console.log(`   Success: ${login.data.success}`);
  let token = null;
  if (login.data.success) {
    token = login.data.data.token;
    console.log(`   Token: ${token.substring(0, 20)}...\n`);
  } else {
    console.log(`   Error: ${login.data.message}\n`);
  }

  // Test 5: Get Balance (with auth)
  console.log('5️⃣  Get Balance');
  const balance = await request('GET', `/api/accounts/${cardNumber}/balance`, null, token);
  console.log(`   Status: ${balance.status}`);
  if (balance.data.success) {
    console.log(`   Balance: ${balance.data.data.balance} TK\n`);
  } else {
    console.log(`   Error: ${balance.data.message}\n`);
  }

  // Test 6: Deposit
  console.log('6️⃣  Deposit');
  const deposit = await request('POST', `/api/transactions/${cardNumber}/deposit`, {
    amount: 5000,
  }, token);
  console.log(`   Status: ${deposit.status}`);
  if (deposit.data.success) {
    console.log(`   Deposited: ${deposit.data.data.transaction.amount} TK`);
    console.log(`   New Balance: ${deposit.data.data.balance} TK\n`);
  } else {
    console.log(`   Error: ${deposit.data.message}\n`);
  }

  // Test 7: Withdraw
  console.log('7️⃣  Withdraw');
  const withdraw = await request('POST', `/api/transactions/${cardNumber}/withdraw`, {
    amount: 2000,
  }, token);
  console.log(`   Status: ${withdraw.status}`);
  if (withdraw.data.success) {
    console.log(`   Withdrawn: ${withdraw.data.data.transaction.amount} TK`);
    console.log(`   New Balance: ${withdraw.data.data.balance} TK\n`);
  } else {
    console.log(`   Error: ${withdraw.data.message}\n`);
  }

  // Test 8: Get Transactions
  console.log('8️⃣  Get Transactions');
  const transactions = await request('GET', `/api/transactions/${cardNumber}`, null, token);
  console.log(`   Status: ${transactions.status}`);
  if (transactions.data.success) {
    console.log(`   Transaction Count: ${transactions.data.data.length}\n`);
  } else {
    console.log(`   Error: ${transactions.data.message}\n`);
  }

  // Test 9: Invalid PIN (should fail)
  console.log('9️⃣  Invalid PIN Test');
  const invalidPin = await request('POST', '/api/accounts/login', {
    card_number: cardNumber,
    pin: '0000',
  });
  console.log(`   Status: ${invalidPin.status}`);
  console.log(`   Success: ${invalidPin.data.success}\n`);

  // Test 10: Validation Error (deposit too small)
  console.log('🔟  Validation Test');
  const invalidDeposit = await request('POST', `/api/transactions/${cardNumber}/deposit`, {
    amount: 100,
  }, token);
  console.log(`   Status: ${invalidDeposit.status}`);
  console.log(`   Success: ${invalidDeposit.data.success}\n`);

  console.log('✅ Tests Complete!\n');
}

runTests().catch(console.error);
