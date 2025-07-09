import { Router } from 'express';
import { response, randomColor, paging } from '../utils';
import Storage from '../utils/storage';
import { ServerDBError, ClientParamsError } from "../utils/error";
import Logger from "../utils/logger";

const router = Router();

router.get('/', (req, res) => {
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
                res.status(500).send(response(null, '数据格式有误', -1));
                Logger.debug('result is ' + typeof result);
                Logger.debug('result:' + result);
                throw new ServerDBError('数据格式有误', req.originalUrl, `name:${search}@tags`);
            }

            const pageData = paging(page, limit, result);

            res.status(200).send(response({
                tags: pageData.data,
                total: pageData.total,
                pageTotal: pageData.pageTotal,
                page: pageData.page,
                limit: pageData.limit
            }));
        })
        .catch((e) => {
            res.status(500).send(response(null, '获取数据失败: ' + e.message, -1));
            throw new ServerDBError('获取音乐标签列表失败: ' + e.message, req.originalUrl, `name:${search}@tags`);
        });
});

router.post('/', async (req : any, res) => {
    req.mustIsAdministrator();

    const tagId = Math.random().toString(16).slice(2);

    if (typeof req.body.name !== 'string') {
        res.status(400).send(response(null, '请求参数错误', -2));
        throw new ClientParamsError('请求参数错误', req.originalUrl);
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
            id: tagId,
            name: req.body.name,
            color: tagColor
        }).then(() => {
            res.status(200).send(response());
        }).catch((e) => {
            res.status(500).send(response(null, '添加数据失败: ' + e.message, -1));
            throw new ServerDBError('添加音乐标签失败: ' + e.message, req.originalUrl, `id:${tagId}@tags`);
        });
});

router.put('/:id', async (req : any, res) => {
    req.mustIsAdministrator();

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
        res.status(400).send(response(null, '请求参数错误', -2));
        throw new ClientParamsError('请求参数错误', req.originalUrl);
    }

    Storage
        .getDatabaseAction()
        .table('tags')
        .where('id', req.params.id)
        .update(updateData)
        .then(() => {
            res.status(200).send(response());
        }).catch((e) => {
            res.status(500).send(response(null, '添加数据失败: ' + e.message, -1));
            throw new ServerDBError('添加音乐标签失败: ' + e.message, req.originalUrl, `id:${req.params.id}@tags`);
        });
});

router.delete('/:id', async (req : any, res) => {
    req.mustIsAdministrator();

    Storage
        .getDatabaseAction()
        .table('tags')
        .where('id', req.params.id)
        .delete()
        .then(() => {
            res.status(200).send(response());
        }).catch((e) => {
            res.status(500).send(response(null, '删除数据失败: ' + e.message, -1));
            throw new ServerDBError('删除音乐标签失败: ' + e.message, req.originalUrl, `id:${req.params.id}@tags`);
        });
});

module.exports = router;