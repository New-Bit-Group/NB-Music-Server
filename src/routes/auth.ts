import { Router } from 'express';
import axios from "axios";
import { responseFormat, getUserID } from '../utils';
import Storage from '../utils/storage';
import Logger from "../utils/logger";

class AuthRouter {
    readonly router : Router = Router();

    constructor() {
        this.router.post('/login', (req, res) => {
            const biliCookies = req.headers.cookie;

            if (!biliCookies) {
                res.status(400).send(responseFormat(null, '请求参数错误', -2));
                return;
            }

            axios.get('https://api.bilibili.com/x/web-interface/nav', {
                headers: {
                    Cookie: biliCookies,
                    Referer: 'https://www.bilibili.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
                }
            }).then(response => {
                const data = response.data;

                if (data.code === -101) {
                    res.status(404).send(responseFormat(null, '用户不存在', -3));
                    return;
                }

                if (data.code !== 0) {
                    res.status(500).send(responseFormat(null, '连接B站API失败: ' + data.message, -1));
                    return;
                }

                const database = Storage.getCacheDatabaseAction();

                const sessionId = Math.random().toString(36).slice(2) + '.' + Math.random().toString(16).slice(2);
                const expiresIn = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

                database.table('nb_music_session').name(sessionId).save(JSON.stringify({
                    userId: data.data.mid,
                    expiresIn: expiresIn
                })).then(() => {
                    res.status(200).send(responseFormat({
                        sessionId: sessionId,
                        expiresIn: expiresIn
                    }));
                }).catch(error => {
                    res.status(500).send(responseFormat(null, '连接数据库失败: ' + error.message, -1));
                });
            }).catch(error => {
                let errorMessage : string;
                if (error.response) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = error.message;
                }

                res.status(500).send(responseFormat(null, '连接B站API失败: ' + errorMessage, -1));
            });
        });

        this.router.get('/renewal', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            let needRenewal = false;

            // 判断是否将在两天内过期
            if (session.expiresIn <= Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60) {
                needRenewal = true;
            }

            res.status(200).send(responseFormat({
                needRenewal: needRenewal,
                expiresIn: session.expiresIn
            }));
        });

        this.router.post('/renewal', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            session.expiresIn = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;
            const database = Storage.getCacheDatabaseAction();

            database.table('nb_music_session').name(session.sessionId).save(JSON.stringify({
                userId: session.userId,
                expiresIn: session.expiresIn
            })).then(() => {
                res.status(200).send(responseFormat({
                    expiresIn: session.expiresIn
                }));
            }).catch(error => {
                res.status(500).send(responseFormat(null, '连接数据库失败: ' + error.message, -1));
            });
        });

        this.router.post('/logout', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            const database = Storage.getCacheDatabaseAction();

            database.table('nb_music_session').name(session.sessionId).delete().then(() => {
                res.status(200).send(responseFormat());
            }).catch(error => {
                res.status(500).send(responseFormat(null, '连接数据库失败: ' + error.message, -1));
            });
        });
    }
}

export default AuthRouter;