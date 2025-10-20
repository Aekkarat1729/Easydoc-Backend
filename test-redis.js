require('dotenv').config();
const redis = require('redis');

async function testRedisConnection() {
  console.log('🔍 Testing Redis Cloud connection...\n');
  
  const client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          return new Error('Max retries reached');
        }
        return retries * 1000;
      }
    },
    password: process.env.REDIS_PASSWORD
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
  });

  try {
    console.log(`📡 Connecting to: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    await client.connect();
    console.log('✅ Connected to Redis Cloud successfully!\n');

    // ทดสอบ PING
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}`);

    // ทดสอบ SET/GET
    await client.set('test_key', 'Hello Redis Cloud!');
    const value = await client.get('test_key');
    console.log(`✅ Test SET/GET: ${value}`);

    // ทดสอบ DELETE
    await client.del('test_key');
    console.log('✅ Test DELETE: success\n');

    // แสดงข้อมูล Server
    const info = await client.info('server');
    const version = info.match(/redis_version:(.*)/)?.[1];
    console.log(`📊 Redis Version: ${version}`);
    
    console.log('\n🎉 All tests passed! Redis Cloud is ready to use.');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\n💡 Please check:');
    console.error('   1. REDIS_HOST is correct');
    console.error('   2. REDIS_PORT is correct');
    console.error('   3. REDIS_PASSWORD is correct');
    console.error('   4. Your IP is whitelisted in Redis Cloud');
  } finally {
    await client.quit();
    console.log('\n👋 Connection closed.');
  }
}

testRedisConnection();
