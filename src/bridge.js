import SockJS from 'sockjs'
import Redis from 'redis'
import nodes from '../config/nodes'

class Bridge {

  constructor(options) {
    this.clients = {}
    this.options = options
  }

  processIncomingData(socket, data) {
    try {
      const message = JSON.parse(data)
      console.log(`Message received from node ${socket.nodeID}: ${data}`)

      switch (message.type) {

        case 'auth':
          this.processAuth(socket, message)
          break

        case 'data':
          this.processMessage(socket, message)
          break

        case 'subscribe':
          this.processSubscribe(socket, message)
          break

        case 'unsubscribe':
          this.processUnsubscribe(socket, message)
          break

      }
    } catch (error) {
      console.log(`Error processing incoming message: ${error}`)
    }
  }

  processAuth(socket, message) {
    if (nodes[message.nodeID] != true) {
      console.log(`Rejected unauthorized node ${message.nodeID}`)
      return
    }

    socket.nodeID = message.nodeID
    this.clients[message.nodeID] = socket
    console.log(`Accepted authorized node ${message.nodeID}`)

    this.processOutbox(message.nodeID)
  }

  processOutbox(nodeID) {
    const consumeQueue = () => {
      this.redis.lrange(`outbox_${nodeID}`, 0, 0, (error, data) => {
        if (data != '') {
          if (!this.clients.hasOwnProperty(nodeID)) return

          this.clients[nodeID].write(data)
          this.redis.lpop(`outbox_${nodeID}`)
          console.log(`Sent data to ${nodeID}: ${data}`)

          consumeQueue()
        }
      })
    }

    consumeQueue()
  }

  processMessage(socket, message) {
    if (!socket.nodeID) return
    if (!message.topic) return
    if (!message.payload) return

    this.redis.smembers(`topic_${message.topic}`, (error, nodes) => {
      if (!nodes) nodes = []

      for (let node of nodes) {
        this.redis.rpush(
          `outbox_${node}`,
          JSON.stringify(message),
          () => { this.processOutbox(node) }
        )
      }
    })
  }

  processSubscribe(socket, message) {
    if (!socket.nodeID) return
    if (!message.topic) return

    this.redis.sadd(`topic_${message.topic}`, socket.nodeID)
    this.redis.sadd(`subscription_${socket.nodeID}`, message.topic)

    console.log(`Node ${socket.nodeID} subscribed to ${message.topic}`)
  }

  processUnsubscribe(socket, message) {
    if (!socket.nodeID) return
    if (!message.topic) return

    this.redis.srem(`topic_${message.topic}`, socket.nodeID)
    this.redis.srem(`subscription_${socket.nodeID}`, message.topic)

    console.log(`Node ${socket.nodeID} unsubscribed from ${message.topic}`)
  }

  handleClientDisconnection(socket) {
    if (!this.clients.hasOwnProperty(socket.nodeID)) return

    delete this.clients[socket.nodeID]
    console.log(`Node ${socket.nodeID} disconnected`)
  }

  createWebSocketServer() {
    const ws = SockJS.createServer({
      sockjs_url: 'https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.0.3/sockjs.min.js'
    })

    ws.on('connection', (socket) => {

      socket.on('data', (data) => {
        this.processIncomingData(socket, data)
      })

      socket.on('close', () => {
        this.handleClientDisconnection(socket)
      })

    })

    ws.installHandlers(this.options.server, {
      prefix: '/bridge'
    })
  }

  connectToRedis() {
    const redis = Redis.createClient(
      this.options.redis.port,
      this.options.redis.address
    )

    redis.on('ready', () => {
      console.log(`Connected to Redis server`)
    })

    redis.on('reconnecting', (attempt) => {
      console.log(`Reconnecting to Redis server`)
    })

    redis.on('error', (error) => {
      console.log(`Error connecting to Redis server`)
    })

    this.redis = redis
  }

  start() {
    this.createWebSocketServer()
    this.connectToRedis()
  }

}

export default Bridge
