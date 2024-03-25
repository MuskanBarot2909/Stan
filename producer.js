const amqp = require('amqplib');

amqp.connect('amqp://localhost')
  .then(async (connection) => {
    const channel = await connection.createChannel();
    const queueName = 'update_queue';

    // Send messages to the queue
    setInterval(() => {
      channel.sendToQueue(queueName, Buffer.from('Update counter'));
      console.log('Message sent to the queue');
    }, 1000);
  })
  .catch((err) => {
    console.error('Error:', err);
  });
