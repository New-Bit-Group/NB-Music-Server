import { Config } from "./utils/interfaces"
import Logger from "./utils/logger";
import { responseFormat } from './utils';
import Storage from './utils/storage';
import WebhookRouter from "./utils/webhook";

import AuthRouter from "./routes/auth";
import TagRouter from "./routes/tag";

import fs from "fs";
import path from "path";
import { gunzipSync } from 'zlib';
import { Ajv, ErrorObject } from "ajv";
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
    config : Config | undefined;
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

        this.loadConfig();
        Logger.notice("配置文件加载完成");

        if (this.config) {
            Storage.connect(this.config);
        }

        this.startServer();
    }

    welcome() : void {
        console.log("\x1Bc");
        console.log(gunzipSync(Buffer.from(this.logo, "base64")).toString());
        Logger.info(`NB Music 后端服务器 V${this.version}`);
    }

    loadConfig() : void {
        try {
            Logger.notice("开始加载配置文件");

            const configPath = path.join(__dirname, "..", "config.json");
            if (fs.existsSync(configPath)) {
                let config;
                try {
                    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                } catch (e) {
                    Logger.error("配置文件加载失败");
                    // @ts-ignore
                    Logger.error(e.message);
                    process.exit(1);
                }

                if (config) {
                    this.config = this.checkConfig(config);
                }
            } else {
                Logger.warning("配置文件不存在，将使用默认配置");
                // 强制将其视为Config
                this.config = this.checkConfig(<Config>{});
            }
        } catch (e) {
            Logger.error("配置文件加载失败");
            // @ts-ignore
            Logger.error(e.message);

            // @ts-ignore
            if (e.stack) {
                // @ts-ignore
                Logger.debug(e.stack);
            }

            process.exit(1);
        }
    }

    checkConfig(config : Config) : Config | never {
        try {
            const ajv = new Ajv({ useDefaults: true, strict: false });

            const validate = ajv.compile(
                JSON.parse(
                    fs.readFileSync(
                        path.join(__dirname, "..", "config.schema.json"),
                        "utf-8"
                    )
                )
            );

            const valid = validate(config);
            if (valid) {
                if (config.administrators === true) {
                    Logger.warning("！！！配置文件中 administrators 字段被设置为了 true！！！");
                    Logger.warning("！！！这将允许任何人访问 管理员 API 接口，应仅在开发环境下使用！！！");
                }

                return config;
            } else {
                Logger.error("配置文件加载失败");
                validate.errors?.forEach((error :ErrorObject) => {
                    if (!error.message) {
                        error.message = "未知错误";
                    }

                    error.instancePath = error.instancePath.replace(/\//g, ".");
                    Logger.error(`[config${error.instancePath}] ${error.message}`);
                });

                process.exit(1);
            }
        } catch (e) {
            Logger.error("配置文件加载失败");
            // @ts-ignore
            Logger.error(e.message);

            // @ts-ignore
            if (e.stack) {
                // @ts-ignore
                Logger.debug(e.stack);
            }

            process.exit(1);
        }
    }

    startServer() : void {
        const app = express();

        app.use(express.json());

        // 挂载路由
        app.use('/auth', new AuthRouter().router);

        if (this.config) {
            app.use('/tag', new TagRouter(this.config).router)
        }

        if (this.config?.webhook) {
            app.use('/webhook', new WebhookRouter(this.config).router);
            Logger.notice("Webhook 已启用");
            Logger.info(`Webhook 地址: http://localhost:${this.config?.port}/webhook`);
        }

        // 没有匹配到路由时返回404
        app.all("/{*splat}", (_req : any, res : any) => {
            res.status(404).send(responseFormat(null, "资源不存在", -6));
        });

        app.use((err : any, _req : any, _res : any, _next : any) => {
            Logger.warning("服务器运行时发生错误");
            Logger.warning(err.message);
            Logger.debug(err.stack);
        });

        app.listen(this.config?.port, (error) => {
            if (error) {
                Logger.error("服务器启动失败");
                Logger.error(error.message);
                process.exit(1);
            } else {
                Logger.notice(`服务器启动，监听端口 ${this.config?.port}`);
            }
        });
    }
}

new App();