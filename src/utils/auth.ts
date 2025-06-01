import Storage from "./storage";
import Logger from "./logger";
import { responseFormat } from "./index";
import { Config } from "./interfaces";

function getUser(req: any, res: any, returnNull : boolean = false) {
    return new Promise<{
        userId: string;
        expiresIn: number;
        sessionId: string;
    } | null>((resolve) => {
        const sessionId = req.headers.authorization?.split(' ')[1];

        if (!sessionId) {
            if (!returnNull) {
                res.status(400).send(responseFormat(null, '请求参数错误', -2));
            }

            resolve(null);
            return;
        }

        const database = Storage.getCacheDatabaseAction().table('nb_music_session').name(sessionId);

        database.get().then(data => {
            if (data.length === 0) {
                if (!returnNull) {
                    res.status(401).send(responseFormat(null, '未登录', -4));
                }

                resolve(null);
            } else {
                if (JSON.parse(data).expiresIn < Math.floor(Date.now() / 1000)) {
                    // 删除过期的session
                    database.delete().catch(error => {
                        Logger.error('删除CacheDatabase数据失败: ' + error.message);
                    });

                    if (!returnNull) {
                        res.status(401).send(responseFormat(null, '未登录', -4));
                    }
                    resolve(null);
                } else {
                    resolve(Object.assign(JSON.parse(data), {
                        sessionId: sessionId
                    }));
                }
            }
        })
    });
}

function isAdmin(userId : string, config : Config) {
    return config.administrators === true ||
        Array.isArray(config.administrators) &&
        config.administrators.includes(userId)
}

export {
    getUser,
    isAdmin
};