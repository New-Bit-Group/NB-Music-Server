import Logger from "./utils/logger";
import { responseFormat } from './utils';
import Storage from './utils/storage';
import config from "./config";
import SpeedLimit from "./modules/speed-limit";

import fs from "fs";
import path from "path";
import { gunzipSync } from 'zlib';
import express from "express";

process.on("uncaughtException", (err) => {
    Logger.error("服务器运行时发生错误");
    Logger.error(err.message);

    if (err.stack != null) {
        Logger.debug(err.stack);
    }

    process.exit(1);
});

class App {
    version : string = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "..", "package.json"),
            "utf-8"
        )
    ).version;

    logo : string =
        "H4sIAAAAAAAAA62QQRLAMARF907hBr2QGRdx+FbyJZHKqrUwyMMPVhh329Ko8A7BFS11nUzizQNGimxWPPe" +
        "OAUlzS4uqDL6ok3hVum+DMOQKgQDEGxIkKXsGmk4+1dsirjalPwEw7zhtwomk2IQpxOWmeZjUcPqT+R47UF0" +
        "DhSLpfhEYRw8gRRvUAl02vShiKDL4ITCOO4EUJchiXuh5U8R/2Ji3iPtsN3PS4kJ5AwAA";

    constructor() {
        this.welcome();

        Storage.init()
        this.startServer();
    }

    welcome() : void {
        console.log("\x1Bc");
        console.log(gunzipSync(Buffer.from(this.logo, "base64")).toString());
        Logger.info(`NB Music 后端服务器 V${this.version}`);
    }

    startServer() : void {
        const server = express();

        server.use(SpeedLimit.middleware);
        server.use(express.json());

        // 挂载路由
        server.use('/auth', require('./routes/auth'));
        server.use('/tag', require('./routes/tag'));

        if (config.webhook) {
            server.use('/webhook', require('./modules/webhook'));
            Logger.notice("Webhook 已启用");
            Logger.info(`Webhook 地址: http://localhost:${config.port}/webhook`);
        }

        // 没有匹配到路由时返回404
        server.all("/{*splat}", (_req : any, res : any) => {
            res.status(404).send(responseFormat(null, "资源不存在", -6));
        });

        server.use((err : any, _req : any, _res : any, _next : any) => {
            Logger.warning("服务器运行时发生错误");
            Logger.warning(err.message);
            Logger.debug(err.stack);
        });

        server.listen(config.port, (error) => {
            if (error) {
                Logger.error("服务器启动失败");
                Logger.error(error.message);
                process.exit(1);
            } else {
                Logger.notice(`服务器启动，监听端口 ${config.port}`);
            }
        });
    }
}

new App();