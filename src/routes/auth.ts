import { Router } from 'express';
import { response } from '../utils';
import Storage from '../utils/storage';
import axios from "axios";
import {
    ClientResourceNotFoundError,
    ServerDBError,
    ServerExternalServiceError
} from "../utils/error";

const router = Router();

router.post('/login', (req, res) => {
    const biliCookies = req.headers.cookie;

    if (!biliCookies) {
        res.status(400).send(response(null, '请求参数错误', -2));
        return;
    }

    axios.get('https://api.bilibili.com/x/web-interface/nav', {
        headers: {
            Cookie: biliCookies,
            Referer: 'https://www.bilibili.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
        }
    }).then(r => {
        const data = r.data;

        if (data.code === -101) {
            res.status(404).send(response(null, '用户不存在', -3));
            throw new ClientResourceNotFoundError('用户不存在', req.originalUrl);
        }

        if (data.code !== 0) {
            res.status(500).send(response(null, '连接B站API失败: ' + data.message, -1));
            throw new ServerExternalServiceError('连接B站API失败', req.originalUrl, 'api.bilibili.com/x/web-interface/nav')
        }

        const sessionId = Math.random().toString(36).slice(2) + '.' + Math.random().toString(16).slice(2);
        const expiresIn = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

        Storage
            .getCacheDatabaseAction()
            .table('nb_music_session')
            .name(sessionId)
            .save(JSON.stringify({
                userId: data.data.mid,
                expiresIn: expiresIn
            })).then(() => {
                res.status(200).send(response({
                    sessionId: sessionId,
                    expiresIn: expiresIn
                }));
            }).catch(error => {
                res.status(500).send(response(null, '连接数据库失败: ' + error.message, -1));
                throw new ServerDBError('新增账户信息失败：' + error.message, req.originalUrl, sessionId + '@nb_music_session');
            });
    }).catch(error => {
        let errorMessage: string;
        if (error.response) {
            errorMessage = error.response.data.message;
        } else {
            errorMessage = error.message;
        }

        res.status(500).send(response(null, '连接B站API失败: ' + errorMessage, -1));
        throw new ServerExternalServiceError('连接B站API失败：' + errorMessage, req.originalUrl, 'api.bilibili.com/x/web-interface/nav');
    });
});

router.get('/renewal', async (req : any, res) => {
    req.mustLogin();

    let needRenewal = false;

    // 判断是否将在两天内过期
    if (req.session.expiresIn <= Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60) {
        needRenewal = true;
    }

    res.status(200).send(response({
        needRenewal: needRenewal,
        expiresIn: req.session.expiresIn
    }));
});

router.post('/renewal', async (req : any, res) => {
    req.mustLogin();

    const expiresIn = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

    Storage
        .getCacheDatabaseAction()
        .table('nb_music_session')
        .name(req.session.id)
        .save(JSON.stringify({
            userId: req.session.userId,
            expiresIn: expiresIn
        })).then(() => {
            res.status(200).send(response({
                expiresIn: expiresIn
            }));
        }).catch(error => {
            res.status(500).send(response(null, '连接数据库失败: ' + error.message, -1));
            throw new ServerDBError('获取账户信息失败：' + error.message, req.originalUrl, req.session.id + '@nb_music_session');
        });
});

router.post('/logout', async (req : any, res) => {
    req.mustLogin();

    Storage
        .getCacheDatabaseAction()
        .table('nb_music_session')
        .name(req.session.id)
        .delete()
        .then(() => {
            res.status(200).send(response());
        }).catch(error => {
            res.status(500).send(response(null, '连接数据库失败: ' + error.message, -1));
            throw new ServerDBError('获取账户信息失败：' + error.message, req.originalUrl, req.session.id + '@nb_music_session');
        });
});

module.exports = router;