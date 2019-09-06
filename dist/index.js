"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Redis = require("ioredis");
const uuid = require("uuid");
class MemoizeRedis {
    constructor({ argsResolver, ttl, redisOptions }, key) {
        this.argsResolver = argsResolver || ((...args) => JSON.stringify(args));
        this.ttl = ttl || 600;
        this.redisOptions = redisOptions || {};
        this.redis = new Redis(this.redisOptions);
        this.hash = uuid.v4();
        this.key=key;
    }
    memoize(key) {
        const self = this;
        if(this.key !== undefined){
            key=this.key;
        }
        return (klass, methodName, desc) => {
            const origMethod = desc.value;
            desc.value = async function (...args) {
                const key = key
                    + klass.constructor.name + '.'
                    + methodName + '.'
                    + self.argsResolver(...args) + '.'
                    + self.hash;
                const cached = await self.redis.get(key);
                if (cached) {
                    return JSON.parse(cached);
                }
                const resp = await origMethod.apply(this, args);
                self.redis.set(key, JSON.stringify(resp));
                self.redis.expire(key, self.ttl);
                return resp;
            };
            return desc;
        };
    }
}
exports.MemoizeRedis = MemoizeRedis;
