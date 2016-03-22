import http from 'http'
import express from 'express'
import Bridge from './bridge'
import config from '../config/bridge'

const app = express()
const server = http.createServer(app)

const bridge = new Bridge({
  server: server,
  redis: {
    address: config.REDIS_HOST,
    port: config.REDIS_PORT
  },
  gateway: {
    address: config.GATEWAY_HOST,
    port: config.GATEWAY_PORT
  },
  nodeID: config.NODE_ID
})

bridge.start()

server.listen(config.WS_PORT, config.WS_BIND)
