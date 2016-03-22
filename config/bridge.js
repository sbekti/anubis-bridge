const DEFAULT_WS_PORT = 8080
const DEFAULT_WS_BIND = '0.0.0.0'
const DEFAULT_REDIS_HOST = 'localhost'
const DEFAULT_REDIS_PORT = 6379

const config = {
  WS_PORT: process.env.WS_PORT || DEFAULT_WS_PORT,
  WS_BIND: process.env.WS_BIND || DEFAULT_WS_BIND,
  REDIS_HOST: process.env.REDIS_HOST || DEFAULT_REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT || DEFAULT_REDIS_PORT
}

export default config
