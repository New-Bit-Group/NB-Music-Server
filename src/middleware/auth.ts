import { response } from "../utils";
import Storage from "../utils/storage";
import getConfig from "../utils/config-loader";
import {
    ClientNoPermissionError,
    ClientNotLoginError,
    ClientParamsError,
    ServerDBError
} from "../utils/error";

class Auth {
    static getMiddleware() {
        return (req : any, res : any, next : any) => {
            const sessionId = req.headers.authorization?.split(' ')[1];

            req.session = null;
            let status : number = 0;
            let isAdministrator : boolean = false;

            req.mustLogin = () => {
                switch (status) {
                    case -2:
                        res.status(400).send(response(null, '请求参数有误', -2));
                        throw new ClientParamsError('请求参数有误', req.originalUrl);
                    case -4:
                        res.status(401).send(response(null, '未登录', -4));
                        throw new ClientNotLoginError('未登录', req.originalUrl);
                }
            };

            req.mustIsAdministrator = () => {
                req.mustLogin();

                if (!isAdministrator) {
                    res.status(403).send(response(null, '无权限访问', -7));
                    throw new ClientNoPermissionError(
                        '无权限访问',
                        req.originalUrl,
                        req.session.userId
                    );
                }
            };


            if (!sessionId) {
                status = -2;

                next();
                return;
            }

            const database =
                Storage
                    .getCacheDatabaseAction()
                    .table('nb_music_session')
                    .name(sessionId);

            database.get().then(d => {
                if (d.length === 0) {
                    status = -4;

                    next();
                    return;
                } else {
                    let data : {
                        userId: number,
                        expiresIn: number
                    } = JSON.parse(d);

                    if (data.expiresIn < Math.floor(Date.now() / 1000)) {
                        // 删除过期的session
                        database.delete().catch(error => {
                            throw new ServerDBError(
                                '删除账户数据失败: ' + error.message,
                                req.originalUrl,
                                sessionId + '@nb_music_session'
                            );
                        });

                        status = -4;

                        next();
                        return;
                    } else {
                        const config = getConfig();

                        isAdministrator =
                            config.administrators === true ||
                            Array.isArray(config.administrators) &&
                            config.administrators.includes(String(data.userId));

                        req.session = Object.assign(data, {
                            id: sessionId,
                            isAdministrator
                        });

                        next();
                    }
                }
            });
        };
    }
}

export default Auth;