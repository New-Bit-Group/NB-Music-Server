import Logger from "./logger";
import path from "path";
import fs from "fs";
import { Config } from "./interfaces";
import { Ajv, ErrorObject } from "ajv";

class ConfigLoader {
    private static config: Config = <Config>{};

    static initialize() {
        ConfigLoader.config = ConfigLoader.loadConfig();
    }

    private static loadConfig() : Config | never {
        try {
            Logger.notice("开始加载配置文件");

            const configPath = path.join(__dirname, "..", "..", "config.json");
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
                    return ConfigLoader.checkConfig(config);
                } else {
                    Logger.error("配置文件加载失败");
                    // @ts-ignore
                    Logger.error(e.message);
                    process.exit(1);
                }
            } else {
                Logger.warning("配置文件不存在，将使用默认配置");
                // 强制将其视为Config
                return ConfigLoader.checkConfig(<Config>{});
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

    private static checkConfig(config : Config) : Config | never {
        try {
            const ajv = new Ajv({ useDefaults: true, strict: false });

            const validate = ajv.compile(
                JSON.parse(
                    fs.readFileSync(
                        path.join(__dirname, "..", "..", "config.schema.json"),
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

                Logger.notice("配置文件加载完成");
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

    static getConfig() : Config {
        return ConfigLoader.config;
    }
}

export default function getConfig() : Config {
    return ConfigLoader.getConfig();
};

export { ConfigLoader };