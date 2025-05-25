/* 在新数据库中创建必须的数据表 */

CREATE TABLE IF NOT EXISTS tags (
    id  TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL
);