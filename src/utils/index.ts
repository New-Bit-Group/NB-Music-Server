import Storage from "./storage";
import Logger from "./logger";
import { Config } from "./interfaces";

function responseFormat(
    data : any = null,
    message : string = "Success",
    status : number = 0
) {
    return {
        status: status,
        message: message,
        data: data
    }
}

function randomColor() : string {
    // 计算中间值
    const h = Math.floor(Math.random() * 360);

    // C = (1 - (2 * (l / 100)) - 1) * (s / 100)
    const C = 0.48;

    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));

    // m = (l / 100) - C / 2
    const m = 0.46;

    // 计算色相的三个分段值
    const i = Math.floor(h / 60);
    let R, G, B;

    switch (i) {
        case 0:
            R = C;
            G = X;
            B = 0;
            break;
        case 1:
            R = X;
            G = C;
            B = 0;
            break;
        case 2:
            R = 0;
            G = C;
            B = X;
            break;
        case 3:
            R = 0;
            G = X;
            B = C;
            break;
        case 4:
            R = X;
            G = 0;
            B = C;
            break;
        case 5:
            R = C;
            G = 0;
            B = X;
            break;
        default:
            R = G = B = 0; // 防止i超出范围
    }

    const toHex = (c: number): string => {
        const hex = Math.round((c + m) * 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };

    return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
}

function getUserID(req: any, res: any) {
    return new Promise<{
        userId: string;
        expiresIn: number;
        sessionId: string;
    } | null>((resolve) => {
        const sessionId = req.headers.authorization?.split(' ')[1];

        if (!sessionId) {
            res.status(400).send(responseFormat(null, '请求参数错误', -2));

            resolve(null);
            return;
        }

        const database = Storage.getCacheDatabaseAction().table('nb_music_session').name(sessionId);

        database.get().then(data => {
            if (data.length === 0) {
                res.status(401).send(responseFormat(null, '未登录', -4));

                resolve(null);
            } else {
                if (JSON.parse(data).expiresIn < Math.floor(Date.now() / 1000)) {
                    // 删除过期的session
                    database.delete().catch(error => {
                        Logger.error('删除CacheDatabase数据失败: ' + error.message);
                    });

                    res.status(401).send(responseFormat(null, '未登录', -4));
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

function paging(
    page: number | string,
    limit: number | string,
    data: any[]
) {
    page = Number(page);
    limit = Number(limit);

    // 获取总页数
    const total = data.length;
    const pageTotal = Math.ceil(total / limit);

    if (page > pageTotal) {
        page = pageTotal;
    }

    // 截取数据
    const pageStart = (page - 1) * limit;
    const pageEnd = pageStart + limit;

    data = data.slice(pageStart, pageEnd);

    return {
        data,
        total,
        pageTotal,
        page,
        limit
    }
}

export {
    responseFormat,
    randomColor,
    getUserID,
    isAdmin,
    paging
};
