import MySQL from "mysql2";
import Redis from "ioredis";
import SQLite from "sqlite3";

interface Config {
    port: number;
    database: {
        mysql?: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string
        };
        sqlite?: {
            path: string
        }
    };
    cacheDatabase: {
        redis?: {
            host: string;
            port: number;
            username: string;
            password: string;
            database: number
        };
        sqlite?: {
            path: string
        };
    };
    administrators: string[] | boolean;
    speedLimit: {
        guestMaxSpeed: number;
        userMaxSpeed: number;
        banDuration: number;
    };
    trustProxy: boolean | string | string[];
}

interface HandledError {
    error: Error;
    resource: string;
    params: Object | undefined;
}

interface DataTableWhere {
    name: string;
    condition: string;
    value: any;
    isOr: boolean;
}

interface DatabaseLimitNumber {
    limit : number | null;
    offset? : number
}

interface DatabaseOrders {
    [name: string]: "ASC" | "DESC";
}

interface DatabaseCacheSetting {
    enable: boolean;
    time: number;
    table: string;
}

interface MySQLDatabaseType {
    type: "mysql";
    connection: MySQL.Connection;
}

interface RedisDatabaseType {
    type: "redis";
    connection: Redis;
}

interface SQLiteDatabaseType {
    type: "sqlite";
    connection: SQLite.Database;
}

type DatabaseTypes = MySQLDatabaseType | SQLiteDatabaseType;
type CacheDatabaseTypes = RedisDatabaseType | SQLiteDatabaseType;

export type {
    Config,
    HandledError,
    DatabaseTypes, CacheDatabaseTypes,
    MySQLDatabaseType, RedisDatabaseType, SQLiteDatabaseType,
    DataTableWhere, DatabaseLimitNumber, DatabaseOrders, DatabaseCacheSetting
};