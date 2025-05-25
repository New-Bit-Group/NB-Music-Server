import { Router } from 'express';
import { responseFormat, randomColor, getUserID, isAdmin, paging } from '../utils';
import Storage from '../utils/storage';
import AuthRouter from "./auth";
import { Config } from "../utils/interfaces";

class TagRouter {
    readonly router : Router = Router();

    constructor(config: Config) {
        this.router.get('/', (req, res) => {
            let limit : number | string = 15;
            let page : number | string = 1;
            let search : string = '%';

            if (req.query.limit && typeof req.query.limit === 'string') {
                limit = req.query.limit;
            }

            if (req.query.page && typeof req.query.page === 'string') {
                page = req.query.page;
            }

            if (req.query.search && typeof req.query.search === 'string') {
                search = '%' + req.query.search + '%';
            }

            Storage
                .getDatabaseAction()
                .table('tags')
                .whereLike('name', search)
                .limit(null)
                .select()
                .then((result) => {
                    if (typeof result === 'string') {
                        res.status(500).send(responseFormat(null, '数据格式异常', -1));
                        return;
                    }

                    const pageData = paging(page, limit, result);

                    res.status(200).send(responseFormat({
                        tags: pageData.data,
                        total: pageData.total,
                        pageTotal: pageData.pageTotal,
                        page: pageData.page,
                        limit: pageData.limit
                    }));
                })
                .catch((e) => {
                    res.status(500).send(responseFormat(null, '获取数据失败: ' + e.message, -1));
                });
        });

        this.router.post('/', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            if (!isAdmin(session.userId, config)) {
                res.status(403).send(responseFormat(null, '无权限访问', -7));
                return;
            }

            if (typeof req.body.name !== 'string') {
                res.status(400).send(responseFormat(null, '请求参数错误', -2));
                return;
            }

            let tagColor : string;
            if (
                typeof req.body.color === 'string' &&
                !/^#[0-9A-F]{6}$/i.test(req.body.color)
            ) {
                tagColor = req.body.color;
            } else {
                tagColor = randomColor();
            }

            Storage
                .getDatabaseAction()
                .table('tags')
                .insert({
                    id: Math.random().toString(16).slice(2),
                    name: req.body.name,
                    color: tagColor
                }).then(() => {
                    res.status(200).send(responseFormat());
                }).catch((e) => {
                    res.status(500).send(responseFormat(null, '添加数据失败: ' + e.message, -1));
                });
        });

        this.router.put('/:id', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            if (!isAdmin(session.userId, config)) {
                res.status(403).send(responseFormat(null, '无权限访问', -7));
                return;
            }

            let updateData : {
                name?: string;
                color?: string;
            } = {};

            if (typeof req.body.name === 'string') {
                updateData.name = req.body.name;
            }

            if (
                typeof req.body.color === 'string' &&
                !/^#[0-9A-F]{6}$/i.test(req.body.color)
            ) {
                updateData.color = req.body.color;
            }

            // 没有进行任何修改，判定错误
            if (Object.keys(updateData).length === 0) {
                res.status(400).send(responseFormat(null, '请求参数错误', -2));
                return;
            }

            Storage
                .getDatabaseAction()
                .table('tags')
                .where('id', req.params.id)
                .update(updateData)
                .then(() => {
                    res.status(200).send(responseFormat());
                }).catch((e) => {
                    res.status(500).send(responseFormat(null, '添加数据失败: ' + e.message, -1));
                });
        });

        this.router.delete('/:id', async (req, res) => {
            const session = await getUserID(req, res);
            if (!session) return;

            if (!isAdmin(session.userId, config)) {
                res.status(403).send(responseFormat(null, '无权限访问', -7));
                return;
            }

            Storage
                .getDatabaseAction()
                .table('tags')
                .where('id', req.params.id)
                .delete()
                .then(() => {
                    res.status(200).send(responseFormat());
                }).catch((e) => {
                    res.status(500).send(responseFormat(null, '删除数据失败: ' + e.message, -1));
                });
        });
    }
}

export default TagRouter;