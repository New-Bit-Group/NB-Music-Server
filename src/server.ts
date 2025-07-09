import { gunzipSync } from 'zlib';
import { response } from './utils';
import { ConfigLoader } from "./utils/config-loader";
import { ClientResourceNotFoundError, handlingError } from "./utils/error";
import { HandledError } from "./utils/interfaces";

import Logger from "./utils/logger";
import SpeedLimit from "./middleware/speed-limit";
import Storage from "./utils/storage";
import Auth from "./middleware/auth";

import fs from "fs";
import path from "path";
import express from "express";

function handlingErrorMessage(e: HandledError) {
    if (e.resource != null) {
        Logger.info(`请求资源: ${e.resource}`);
    }

    if (e.params != null) {
        Logger.info(`错误参数: ${Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

    if (e.error.stack != null) {
        Logger.debug(e.error.stack);
    }
}

process.on("uncaughtException", (err) => {
    const e = handlingError(err);

    Logger.error("服务器运行时发生错误");
    Logger.error(e.error.name + ": " + e.error.message);

    handlingErrorMessage(e);

    process.exit(1);
});

class Server {
    private server : express.Express = express();

    constructor() {
        this.welcome();

        this.initializeComponents();
        this.initializeMiddlewares();
        this.initializeRoutes();

        this.run();
    }

    welcome() {
        const logo =
            "H4sIAAAAAAAAA62QQRLAMARF907hBr2QGRdx+FbyJZHKqrUwyMMPVhh329Ko8A7BFS11nUzizQNGimxWPPe" +
            "OAUlzS4uqDL6ok3hVum+DMOQKgQDEGxIkKXsGmk4+1dsirjalPwEw7zhtwomk2IQpxOWmeZjUcPqT+R47UF0" +
            "DhSLpfhEYRw8gRRvUAl02vShiKDL4ITCOO4EUJchiXuh5U8R/2Ji3iPtsN3PS4kJ5AwAA";

        const version : string = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "..", "package.json"),
                "utf-8"
            )
        ).version;

        console.log("\x1Bc");
        console.log(gunzipSync(Buffer.from(logo, "base64")).toString());
        Logger.info(`NB Music 后端服务器 V${version}`);
    }

    initializeComponents() {
        //初始化配置
        ConfigLoader.initialize();
        this.server.set("trust proxy", ConfigLoader.getConfig().trustProxy);

        // 初始化速率控制
        SpeedLimit.initialize();

        // 初始化数据库连接
        Storage.initialize();
    }

    initializeMiddlewares() {
        this.server.use(Auth.getMiddleware());
        this.server.use(SpeedLimit.getMiddleware());
        this.server.use(express.json());
    }

    initializeRoutes() {
        // 挂载路由
        this.server.use('/v2/auth', require('./routes/auth'));
        this.server.use('/v2/tag', require('./routes/tag'));

        this.server.all("/v1/{*splat}", (_req : any, res : any) => {
            res.status(503).send({
                "success": false,
                "error": {
                    "code": 503,
                    "message": "当前客户端版本过低，请更新至最新版本"
                }
            });
        });

        // 没有匹配到路由时返回404
        this.server.all("/{*splat}", (req : any, res : any) => {
            res.status(404).send(response(null, "资源不存在", -6));
            throw new ClientResourceNotFoundError("资源不存在", req.originalUrl);
        });
    }

    run() {
        this.server.use((err : any, _req : any, _res : any, _next : any) => {
            const e = handlingError(err);

            Logger.warning("服务器运行时发生错误");
            Logger.warning(e.error.name + ": " + e.error.message);

            handlingErrorMessage(e);
        });

        const port = ConfigLoader.getConfig().port;
        this.server.listen(port, (error) => {
            if (error) {
                Logger.error("服务器启动失败");
                Logger.error(error.message);
                process.exit(1);
            } else {
                Logger.notice(`服务器启动，监听端口 ${port}`);
            }
        });
    }
}

new Server();