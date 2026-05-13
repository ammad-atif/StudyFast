"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContextMiddleware = void 0;
const uuid_1 = require("uuid");
const requestContextMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
};
exports.requestContextMiddleware = requestContextMiddleware;
