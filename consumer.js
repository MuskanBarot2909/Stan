console.log('Consumer script started');

const redis = require('redis');
const amqp = require('amqplib');

// Create Redis client
const redisClient = redis.createClient();

// Handle Redis client errors
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

// Create a Redis test client
const testClient = redis.createClient();

// Set a test key and get its value
testClient.set('testKey', 'testValue', (err, reply) => {
  if (err) {
    console.error('Error setting key:', err);
  } else {
    console.log('Key set successfully');
    testClient.get('testKey', (err, reply) => {
      if (err) {
        console.error('Error getting key:', err);
      } else {
        console.log('Value:', reply);
      }
    });
  }
});

// Connect to RabbitMQ server
console.log('Attempting to connect to RabbitMQ...');
amqp.connect('amqp://localhost')
  .then(async (connection) => {
    console.log('Connected to RabbitMQ');
    
    // Create a channel
    const channel = await connection.createChannel();
    console.log('Channel created');

    // Declare a queue
    const queueName = 'update_queue';
    await channel.assertQueue(queueName, { durable: true });
    console.log('Queue declared');

    // Listen for messages from the queue
    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        console.log('Received message from queue');
        simulateRaceCondition();
        channel.ack(msg);
      }
    });

    // Keep the application running indefinitely
    console.log('Waiting for messages...');
  })
  .catch((err) => {
    console.error('Error connecting to RabbitMQ:', err);
  });

// Function to simulate race condition
const simulateRaceCondition = () => {
  // Acquire lock
  redisClient.setnx('lock', '1', (err, result) => {
    if (err) {
      console.error('Error acquiring lock:', err);
      return;
    }

    if (result === 1) {
      // Lock acquired
      redisClient.get('counter', (err, counter) => {
        if (err) {
          console.error('Error getting counter:', err);
          return;
        }

        const updatedCounter = parseInt(counter) + 1;

        // Simulate delay for race condition
        setTimeout(() => {
          // Update counter value in Redis
          redisClient.set('counter', updatedCounter, (err) => {
            if (err) {
              console.error('Error updating counter:', err);
              return;
            }
            console.log(`Counter updated to ${updatedCounter}`);
            // Release lock
            redisClient.del('lock');
          });
        }, Math.random() * 1000);
      });
    } else {
      // Lock not acquired, retry after delay
      setTimeout(simulateRaceCondition, 100);
    }
  });
};
