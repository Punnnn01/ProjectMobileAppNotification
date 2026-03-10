// ทดสอบส่ง Push Notification
// วิธีใช้: node test-send-push.js

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';

async function testSendPush() {
  console.log('🔔 Testing Push Notification...\n');

  try {
    const response = await axios.post(`${BACKEND_URL}/api/notifications/send`, {
      title: 'ทดสอบการแจ้งเตือน',
      body: 'Hello from Backend! 🎉',
      targetGroup: 'all'
    });

    console.log('✅ Response:', response.data);
    console.log('\nResults:');
    console.log(`  - Sent: ${response.data.sentCount}`);
    console.log(`  - Failed: ${response.data.failedCount}`);
    console.log(`  - Total Tokens: ${response.data.totalTokens}`);

    if (response.data.sentCount === 0) {
      console.log('\n⚠️ No tokens found!');
      console.log('   Make sure:');
      console.log('   1. Users are logged in with new APK');
      console.log('   2. Tokens are saved in Firestore');
      console.log('   3. tokenType is "expo"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run
testSendPush();
