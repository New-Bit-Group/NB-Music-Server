import {
    DataTableWhere,
    DatabaseTypes, CacheDatabaseTypes,
    DatabaseLimitNumber, DatabaseOrders, DatabaseCacheSetting
} from "./interfaces";
import Logger from "./logger";
import getConfig from "./config-loader";

import MySQL from 'mysql2';
import Redis from 'ioredis';
import SQLite from 'sqlite3';
import fs from "fs";
import path from "path";
import { ServerResourceNotInitializeError } from "./error";

class Storage {
    private static databaseConnection : DatabaseTypes;

    private static cacheDatabaseConnection : CacheDatabaseTypes;

    private static isInitialized : boolean = false;

    static initialize() {
        try {
            Logger.notice('开始初始化数据库');
            Storage.connectSQLite();
            Storage.connectMySQL();
            Storage.connectRedis();

            Storage.initializeDataTable();
            Logger.notice('数据库初始化完成');

            Storage.isInitialized = true;
        } catch (e) {
            Logger.error('数据库初始化失败');
            // @ts-ignore
            Logger.error(e.message);

            process.exit(1);
        }
    }

    private static connectMySQL() {
        try {
            const config = getConfig();
            if (config.database.mysql) {
                this.databaseConnection = {
                    type: 'mysql',
                    connection: MySQL.createConnection(config.database.mysql)
                };

                this.databaseConnection.connection.connect((error) => {
                    if (error) {
                        Logger.error('连接MySQL数据库失败');
                        Logger.error(error.message);

                        process.exit(1);
                    } else {
                        Logger.debug('连接MySQL数据库成功');
                    }
                });
            }
        } catch (e) {
            throw e;
        }
    }

    private static connectRedis() {
        try {
            const config = getConfig();
            if (config.cacheDatabase.redis) {
                this.cacheDatabaseConnection = {
                    type: 'redis',
                    connection: new Redis(Object.assign(config.cacheDatabase.redis, { lazyConnect: true }))
                };

                this.cacheDatabaseConnection.connection.on('error', (error) => {
                    Logger.warning('Redis数据库出现错误');
                    Logger.warning(error.message);
                });

                this.cacheDatabaseConnection.connection.connect().then(() => {
                    Logger.debug('连接Redis数据库成功');
                }).catch((error : any) => {
                    Logger.error('连接Redis数据库失败');
                    Logger.error(error.message);

                    process.exit(1);
                });
            }
        } catch (e) {
            throw e;
        }
    }

    private static connectSQLite() {
        try {
            const config = getConfig();
            if (config.database.sqlite && !config.database.mysql) {
                fs.mkdirSync(path.dirname(config.database.sqlite.path), {recursive: true});
                this.databaseConnection = {
                    type: 'sqlite',
                    connection: new SQLite.Database(config.database.sqlite.path, (error) => {
                        if (error) {
                            Logger.error('连接SQLite主数据库失败');
                            Logger.error(error.message);

                            process.exit(1);
                        } else {
                            Logger.debug('连接SQLite主数据库成功');
                        }
                    })
                }
            }

            if (config.cacheDatabase.sqlite && !config.cacheDatabase.redis) {
                fs.mkdirSync(path.dirname(config.cacheDatabase.sqlite.path), { recursive: true });
                this.cacheDatabaseConnection = {
                    type: 'sqlite',
                    connection: new SQLite.Database(config.cacheDatabase.sqlite.path, (error) => {
                        if (error) {
                            Logger.error('连接SQLite缓存数据库失败');
                            Logger.error(error.message);

                            process.exit(1);
                        } else {
                            Logger.debug('连接SQLite缓存数据库成功');
                        }
                    })
                };
            }
        } catch (e) {
            throw e;
        }
    }

    private static initializeDataTable() {
        const SQL = fs.readFileSync(path.join(__dirname, '..', '..', 'create-datatable.sql'), 'utf8');
        const queryCallback = (error : any) => {
            if (error) {
                Logger.error('初始化数据表失败');
                Logger.error(error.message);

                process.exit(1);
            }
        };

        if (this.databaseConnection.type === 'mysql') {
            this.databaseConnection.connection.query(SQL, queryCallback);
        } else if (this.databaseConnection.type ==='sqlite') {
            this.databaseConnection.connection.exec(SQL, queryCallback);
        }
    }

    static getDatabaseAction() {
        if (!Storage.isInitialized) {
            throw new ServerResourceNotInitializeError('数据库未初始化', 'Storage.getDatabaseAction');
        }

        return new DatabaseAction(this.databaseConnection);
    }

    static getCacheDatabaseAction() {
        if (!Storage.isInitialized) {
            throw new ServerResourceNotInitializeError('数据库未初始化', 'Storage.getCacheDatabaseAction');
        }

        return new CacheDatabaseAction(this.cacheDatabaseConnection);
    }
}

class DatabaseAction {
    private readonly tableName : string = '';
    private readonly connection : DatabaseTypes;
    private readonly whereArray : DataTableWhere[] = [];
    private readonly limitNumber : DatabaseLimitNumber = {
        limit: 1
    };
    private readonly fields : string[] = [];
    private readonly orders : DatabaseOrders = {};
    private readonly isFetchSQL : boolean = false;
    private readonly cacheSetting : DatabaseCacheSetting = {
        enable: Storage.getCacheDatabaseAction().handle().type === 'redis',
        time: 120,
        table: 'nb_music_database_cache'
    }

    constructor(
        connection : DatabaseTypes,
        tableName? : string,
        whereArray? : DataTableWhere[],
        limitNumber? : DatabaseLimitNumber,
        fields? : string[],
        orders? : DatabaseOrders,
        isFetchSQL? : boolean,
        cacheSetting? : DatabaseCacheSetting
    ) {
        this.connection = connection;

        if (tableName) {
            this.tableName = tableName;
        }

        if (whereArray) {
            this.whereArray = whereArray;
        }

        if (limitNumber) {
            this.limitNumber = limitNumber;
        }

        if (fields) {
            this.fields = fields;
        }

        if (orders) {
            this.orders = orders;
        }
        
        if (isFetchSQL) {
            this.isFetchSQL = isFetchSQL;
        }

        if (cacheSetting) {
            this.cacheSetting = cacheSetting;
        }
    }

    /**
     * 设置表名
     * @param tableName 表名
     * @returns {DatabaseAction}
     */
    table(tableName : string): DatabaseAction {
        if (this.tableName) {
            throw new Error('不能重复设置表名');
        } else {
            return new DatabaseAction(this.connection, tableName);
        }
    }

    /**
     * 查询某个字段是否符合某个运算条件
     * @param name 字段名
     * @param condition 运算条件或值
     * @param value 值
     * @param isOr 是否为OR查询
     * @returns {DatabaseAction}
     */
    where(
        name : string,
        condition : string | any,
        value? : any,
        isOr? : boolean
    ) : DatabaseAction {
        if (!this.tableName) {
            throw new Error('请先设置表名');
        }

        let where : DataTableWhere;
        if (
            condition === '=' ||
            condition === '!=' ||
            condition === '>' ||
            condition === '>=' ||
            condition === '<' ||
            condition === '<=' ||
            condition === 'IN' ||
            condition === 'NOT IN' ||
            condition === 'LIKE' ||
            condition === 'NOT LIKE'
        ) {
            where = {
                name,
                condition,
                value,
                isOr: !!isOr
            }
        } else {
            where = {
                name,
                condition: '=',
                value: condition,
                isOr: !!isOr
            }
        }

        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray.concat(where),
            this.limitNumber,
            this.fields,
            this.orders,
            this.isFetchSQL,
            this.cacheSetting
        );
    }

    /**
     * 查询某个字段是否符合某个运算条件（OR）
     * @param name 字段名
     * @param condition 运算条件
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereOr(
        name : string,
        condition : string | any,
        value? : any
    ): DatabaseAction {
        return this.where(name, condition, value, true);
    }

    /**
     * 查询某个字段是否包含某个值
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereIn(
        name : string,
        value : any[]
    ): DatabaseAction {
        return this.where(name, 'IN', value);
    }

    /**
     * 查询某个字段是否包含某个值（OR）
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereInOr(
        name : string,
        value : any[]
    ): DatabaseAction {
        return this.where(name, 'IN', value, true);
    }

    /**
     * 查询某个字段是否不包含某个值
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereNotIn(
        name : string,
        value : any[]
    ): DatabaseAction {
        return this.where(name, 'NOT IN', value);
    }

    /**
     * 查询某个字段是否不包含某个值（OR）
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereNotInOr(
        name : string,
        value : any[]
    ): DatabaseAction {
        return this.where(name, 'NOT IN', value, true);
    }

    /**
     * 查询某个字段是否符合条件
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereLike(
        name : string,
        value : string
    ): DatabaseAction {
        return this.where(name, 'LIKE', value);
    }

    /**
     * 查询某个字段是否符合条件（OR）
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereLikeOr(
        name : string,
        value : string
    ): DatabaseAction {
        return this.where(name, 'LIKE', value, true);
    }

    /**
     * 查询某个字段是否不符合条件
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereNotLike(
        name : string,
        value : string
    ): DatabaseAction {
        return this.where(name, 'NOT LIKE', value);
    }

    /**
     * 查询某个字段是否不符合条件（OR）
     * @param name 字段名
     * @param value 值
     * @returns {DatabaseAction}
     */
    whereNotLikeOr(
        name : string,
        value : string
    ): DatabaseAction {
        return this.where(name, 'NOT LIKE', value, true);
    }

    /**
     * 设置查询的条数
     * @param limit 条数
     * @param offset 偏移量
     * @returns {DatabaseAction}
     */
    limit(
        limit : number | null,
        offset? : number
    ): DatabaseAction {
        if (!this.tableName) {
            throw new Error('请先设置表名');
        }

        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray,
            {
                limit,
                offset
            },
            this.fields,
            this.orders,
            this.isFetchSQL,
            this.cacheSetting
        );
    }

    /**
     * 返回某一个字段的值
     * @param fields 字段名数组
     * @returns {DatabaseAction}
     */
    field(fields : string | string[]): DatabaseAction {
        if (!this.tableName) {
            throw new Error('请先设置表名');
        }

        if (typeof fields === 'string') {
            fields = [fields];
        }

        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray,
            this.limitNumber,
            fields,
            this.orders,
            this.isFetchSQL,
            this.cacheSetting
        );
    }

    /**
     * 排序
     * @param name 字段名
     * @param order 排序方式，默认升序
     * @returns {DatabaseAction}
     */
    order(
        name : string | DatabaseOrders,
        order : 'ASC' | 'DESC' = 'ASC'
    ): DatabaseAction {
        if (!this.tableName) {
            throw new Error('请先设置表名');
        }

        let orderObject : DatabaseOrders;

        if (typeof name === 'string') {
            orderObject = {
                [name]: order
            }
        } else {
            orderObject = name;
        }

        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray,
            this.limitNumber,
            this.fields,
            Object.assign(this.orders, orderObject),
            this.isFetchSQL,
            this.cacheSetting
        );
    }

    /**
     * 分页查询
     * @param limit 页容量
     * @param page 页码，默认第一页
     * @returns {DatabaseAction}
     */
    page(
        limit : number,
        page : number = 1
    ): DatabaseAction {
        return this.limit(limit, (page - 1) * limit);
    }

    /**
     * 返回SQL语句而不是结果
     * @returns {DatabaseAction}
     */
    fetchSQL(enable : boolean = true): DatabaseAction {
        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray,
            this.limitNumber,
            this.fields,
            this.orders,
            enable,
            this.cacheSetting
        );
    }

    /**
     * 执行查询
     * @returns {Promise<string | any[]>}
     */
    select(): Promise<string | any[]> {
        return new Promise((resolve, reject) => {
            try {
                if (!this.tableName) {
                    reject(new Error('请先设置表名'));
                }

                let SQL = `SELECT `;
                let queryParams : any[] = [];

                if (this.fields.length > 0) {
                    SQL += this.fields.join(', ');
                } else {
                    SQL += '*';
                }

                SQL += ` FROM \`${this.tableName}\``;

                if (this.whereArray.length !== 0) {
                    const whereResult = this.whereArrayConversionToSQL(this.whereArray);

                    SQL += whereResult.SQL;
                    queryParams = whereResult.queryParams;
                }

                if (Object.keys(this.orders).length > 0) {
                    SQL += ` ORDER BY `;

                    let index = 0;
                    Object.keys(this.orders).forEach((key) => {
                        if (index > 0) {
                            SQL += `, `;
                        }

                        SQL += `\`${key}\` ${this.orders[key]}`;

                        index++;
                    });
                }

                if (this.limitNumber) {
                    if (this.limitNumber.limit) {
                        SQL += ` LIMIT ${this.limitNumber.limit}`;

                        if (this.limitNumber.offset) {
                            SQL += ` OFFSET ${this.limitNumber.offset}`;
                        }
                    }
                }

                const queryCallback = (error : any, results : any) => {
                    if (error) reject(error);

                    if (Array.isArray(results)) {
                        resolve(results);
                    }
                };

                this.runQuery(resolve, SQL, queryParams, queryCallback);
            } catch (e) {
                reject(e);
            }
        });
    }

    save(data : {
        [name: string]: any
    }) {
        return new Promise<string | void>((resolve, reject) => {
            try {
                if (!this.tableName) {
                    reject(new Error('请先设置表名'));
                }

                if (this.whereArray.length === 0) {
                    reject(new Error('请先设置查询条件'));
                }

                let SQL = `SELECT 1 FROM \`${this.tableName}\``;

                const whereResult = this.whereArrayConversionToSQL(this.whereArray);
                SQL += whereResult.SQL + ` LIMIT 1`;

                // 判断表中是否存在符合条件的数据
                // 若有，则更新，若无，则插入
                const queryCallback = (error : any, results : any) => {
                    if (error) reject(error);

                    if (Array.isArray(results) && results.length > 0) {
                        // 更新数据
                        this.update(data).then(resolve, reject);
                    } else {
                        // 插入数据
                        this.insert(data).then(resolve, reject);
                    }
                };

                this.runQuery(null, SQL, whereResult.queryParams, queryCallback);
            } catch (e) {
                reject(e);
            }
        });
    }

    insert(data : {
        [name: string]: any
    }) {
        return new Promise<string | void>((resolve, reject) => {
            try {
                if (!this.tableName) {
                    reject(new Error('请先设置表名'));
                }

                let SQL = `INSERT INTO \`${this.tableName}\` (${Object.keys(data).join(', ')}) `;
                    SQL += `VALUES (${Object.values(data).map(() => '?').join(', ')})`;

                const queryCallback = (error : any) => {
                    if (error) reject(error);

                    resolve();
                };

                this.runQuery(resolve, SQL, Object.values(data), queryCallback);
            } catch (e) {
                reject(e);
            }
        });
    }

    update(data : {
        [name: string]: any
    }) {
        return new Promise<string | void>((resolve, reject) => {
            try {
                if (!this.tableName) {
                    reject(new Error('请先设置表名'));
                }

                let SQL = `UPDATE \`${this.tableName}\` SET `;
                let queryParams : any[] = [];

                // 拼接 SET 语句
                SQL += Object.keys(data).map((key) => `\`${key}\` = ?`).join(', ');

                if (this.whereArray.length !== 0) {
                    // 拼接 WHERE 语句
                    const whereResult = this.whereArrayConversionToSQL(this.whereArray);
                    SQL += whereResult.SQL;

                    // 获取查询参数
                    queryParams = Object.values(data).concat(whereResult.queryParams);
                }

                const queryCallback = (error : any) => {
                    if (error) reject(error);

                    resolve();
                };

               this.runQuery(resolve, SQL, queryParams, queryCallback);
            } catch (e) {
                reject(e);
            }
        });
    }

    delete() {
        return new Promise<string | void>((resolve, reject) => {
            try {
                if (!this.tableName) {
                    reject(new Error('请先设置表名'));
                }

                let SQL = `DELETE FROM \`${this.tableName}\``;
                let queryParams : any[] = [];

                if (this.whereArray.length !== 0) {
                    const whereResult = this.whereArrayConversionToSQL(this.whereArray);

                    SQL += whereResult.SQL;
                    queryParams = whereResult.queryParams;
                }

                const queryCallback = (error : any) => {
                    if (error) reject(error);

                    resolve();
                };

                this.runQuery(resolve, SQL, queryParams, queryCallback);
            } catch (e) {
                reject(e);
            }
        });
    }

    // TODO: 数据库缓存
    cache(
        enable? : boolean | number | string,
        time? : number | string,
        table? : string | number
    ) {
        if (typeof enable === 'number') {
            time = enable;
        } else if (typeof enable === 'string') {
            table = enable;
        }

        if (typeof time === 'string') {
            table = time;
        }

        if (typeof table === 'number') {
            time = table;
        }

        if (typeof enable !== 'boolean') {
            enable = true;
        }

        if (typeof time !== 'number') {
            time = 120;
        }

        if (typeof table !== 'string') {
            table = 'nb_music_database_cache'
        }

        return new DatabaseAction(
            this.connection,
            this.tableName,
            this.whereArray,
            this.limitNumber,
            this.fields,
            this.orders,
            this.isFetchSQL,
            {
                enable,
                time,
                table
            }
        );
    }

    exist() {
        return new Promise<boolean>((resolve, reject) => {
            this
                .field('1')
                .limit(1)
                .select()
                .then((result) => {
                    resolve(result !== '' || result.length !== 0);
                }, reject);
        });
    }
    
    query(
        SQL: string,
        queryParams: any[] | ((error: any, results?: any) => void),
        callback?: (error: any, results?: any) => void
    ) {
        if (typeof queryParams === 'function') {
            callback = queryParams;
            queryParams = [];
        }

        this.runQuery(null, SQL, queryParams, callback);
    }

    handle() {
        return this.connection;
    }

    private runQuery(
        resolve: any,
        SQL: string,
        queryParams: any[],
        queryCallback?: (error: any, results?: any) => void
    ) {
        if (this.isFetchSQL && typeof resolve === 'function') {
            resolve(SQL);
        } else {
            if (this.connection.type === 'mysql') {
                this.connection.connection.query(SQL, queryParams, queryCallback);
            } else if (this.connection.type === 'sqlite') {
                this.connection.connection.all(SQL, queryParams, queryCallback);
            }
        }
    }

    private whereArrayConversionToSQL(whereArray : DataTableWhere[]) : { SQL: string; queryParams: any[] } {
        let SQL = ` WHERE `;
        let queryParams: any[] = [];

        let index = 0;
        whereArray.forEach((where) => {
            if (index > 0) {
                if (where.isOr) {
                    SQL += ` OR `;
                } else {
                    SQL += ` AND `;
                }
            }

            if (
                where.condition === 'IN' ||
                where.condition === 'NOT IN'
            ) {
                SQL += `\`${where.name}\` ${where.condition} (`;

                let paramIndex = 1;
                where.value.forEach((value: any) => {
                    SQL += '?';
                    if (paramIndex !== where.value.length) {
                        SQL += `, `;
                    }

                    queryParams.push(value);

                    paramIndex++;
                });

                SQL += `)`;
            } else {
                SQL += `\`${where.name}\` ${where.condition} ?`;
                queryParams.push(where.value);
            }

            index++;
        });

        return {
            SQL: SQL,
            queryParams: queryParams
        }
    }
}

class CacheDatabaseAction {
    private readonly tableName : string = '';
    private readonly valueName : string = '';
    private readonly connection : CacheDatabaseTypes;

    constructor(
        connection : CacheDatabaseTypes,
        tableName? : string,
        valueName? : string
    ) {
        this.connection = connection;

        if (tableName) {
            this.tableName = tableName;
        }

        if (valueName) {
            this.valueName = valueName;
        }
    }

    /**
     * 设置表名
     * @param tableName 表名
     * @returns {CacheDatabaseAction}
     */
    table(tableName : string): CacheDatabaseAction {
        if (this.tableName) {
            throw new Error('不能重复设置表名');
        } else {
            return new CacheDatabaseAction(this.connection, tableName);
        }
    }

    name(name : string): CacheDatabaseAction {
        if (!this.tableName) {
            throw new Error('请先设置表名');
        }

        if (this.valueName) {
            throw new Error('不能重复设置值名');
        } else {
            return new CacheDatabaseAction(this.connection, this.tableName, name);
        }
    }

    get() {
        return new Promise<string>((resolve, reject) => {
           try {
               if (!this.tableName) {
                   reject(new Error('请先设置表名'));
               }

               if (!this.valueName) {
                   reject(new Error('请先设置值名'));
               }

               if (this.connection.type === 'redis') {
                   this.connection.connection.hget(this.tableName, this.valueName, (error, result) => {
                       if (error) reject(error);

                       if (result) {
                           resolve(result);
                       } else {
                           resolve('');
                       }
                   });
               } else if (this.connection.type === 'sqlite') {
                   this.checkTableIsExists(
                       this.tableName,
                       () => {
                           if (this.connection.type === 'sqlite') {
                               this.connection.connection.all(
                                   `SELECT \`cacheValue\` FROM \`${this.tableName}\` WHERE \`cacheName\` = '${this.valueName}' LIMIT 1`,
                                   (error, results) => {
                                       if (error) reject(error);

                                       if (results && results[0] && (results[0] as {
                                           cacheValue: string
                                       }).cacheValue) {
                                           resolve((results[0] as {
                                               cacheValue: string
                                           }).cacheValue);
                                       } else {
                                           resolve('');
                                       }
                                   }
                               );
                           }
                       }
                   );
               }
           } catch (e) {
               reject(e);
           }
        });
    }

    save(value : string) {
        return new Promise<void>((resolve, reject) => {
            try {
                const queryCallback = (error : any) => {
                    if (error) reject(error);
                    resolve();
                };

                if (this.connection.type === 'redis') {
                    this.connection.connection.hset(this.tableName, {
                        [this.valueName]: value
                    }, queryCallback);
                } else if (this.connection.type === 'sqlite') {
                    this.checkTableIsExists(
                        this.tableName,
                        () => {
                            if (this.connection.type === 'sqlite') {
                                this.connection.connection.all(`
                                    SELECT 1
                                    FROM \`${this.tableName}\`
                                    WHERE \`cacheName\` = '${this.valueName}' LIMIT 1
                                `, (error, results) => {
                                    if (error) reject(error);

                                    if (this.connection.type === 'sqlite') {
                                        if (Array.isArray(results) && results.length > 0) {
                                            this.connection.connection.all(
                                                `UPDATE \`${this.tableName}\`
                                                 SET \`cacheValue\` = ?
                                                 WHERE \`cacheName\` = ?`,
                                                [value, this.valueName],
                                                queryCallback
                                            );
                                        } else {
                                            this.connection.connection.all(
                                                `INSERT INTO \`${this.tableName}\` (cacheName, cacheValue)
                                                 VALUES (?, ?);`,
                                                [this.valueName, value],
                                                queryCallback
                                            );
                                        }
                                    }
                                });
                            }
                        }
                    );
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    delete() {
        return new Promise<void>((resolve, reject) => {
            try {
                const queryCallback = (error : any) => {
                    if (error) reject(error);
                    resolve();
                };

                if (this.connection.type === 'redis') {
                    this.connection.connection.hdel(this.tableName, this.valueName, queryCallback);
                } else if (this.connection.type === 'sqlite') {
                    this.checkTableIsExists(
                        this.tableName,
                        () => {
                            if (this.connection.type === 'sqlite') {
                                this.connection.connection.all(
                                    `DELETE FROM \`${this.tableName}\` WHERE \`cacheName\` = ?`,
                                    [this.valueName],
                                    queryCallback
                                );
                            }
                        }
                    );
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    exist() {
        return new Promise<boolean>((resolve, reject) => {
            if (this.connection.type === 'redis') {
                this.connection.connection.hexists(this.tableName, this.valueName, (error, result) => {
                    if (error) reject(error);

                    resolve(result === 1);
                });
            } else {
                this.get().then((result) => {
                    resolve(result !== '');
                }, reject);
            }
        });
    }

    handle() {
        return this.connection;
    }

    private checkTableIsExists(
        tableName : string,
        callback : () => void
    ) {
        try {
            if (this.connection.type === 'sqlite') {
                this.connection.connection.all(`
                    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                        cacheName  TEXT PRIMARY KEY NOT NULL,
                        cacheValue TEXT NOT NULL
                    )
                `, (error) => {
                    if (error) throw error;

                    // 完成创建后再执行回调
                    callback();
                });
            } else {
                callback();
            }
        } catch (e) {
            throw e;
        }
    }
}

export default Storage;