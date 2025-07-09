import { HandledError } from './interfaces';

class ApplicationError extends Error {
    constructor(message: string, resource: string, className?: string, params?: Object) {
        const m = {
            message,
            resource,
            className: className || 'ApplicationError',
            params
        }

        super('ApplicationError+' + Buffer.from(JSON.stringify(m), 'utf-8').toString('base64'));
    }
}

class ClientError extends ApplicationError {
    constructor(message: string, resource: string, className?: string, params?: Object) {
        super(message, resource, className || 'ClientError', params);
    }
}

/**
 * 客户端请求的参数有误
 */
class ClientParamsError extends ClientError {
    constructor(message: string, resource: string) {
        super(message, resource, 'ClientParamsError');
    }
}

/**
 * 客户端未登录
 */
class ClientNotLoginError extends ClientError {
    constructor(message: string, resource: string) {
        super(message, resource, 'ClientNotLoginError');
    }
}

/**
 * 请求没有权限
 */
class ClientNoPermissionError extends ClientError {
    constructor(message: string, resource: string, userId: string) {
        super(message, resource, 'ClientNoPermissionError', { userId });
    }
}

/**
 * 资源不存在
 */
class ClientResourceNotFoundError extends ClientError {
    constructor(message: string, resource: string) {
        super(message, resource, 'ClientResourceNotFoundError');
    }
}

class ServerError extends ApplicationError {
    constructor(message: string, resource: string, className?: string, params?: Object) {
        super(message, resource, className || 'ServerError', params);
    }
}

/**
 * 资源没有初始化
 */
class ServerResourceNotInitializeError extends ServerError {
    constructor(message: string, resource: string) {
        super(message, resource, 'ServerResourceNotInitializeError');
    }
}

/**
 * 数据库错误
 */
class ServerDBError extends ServerError {
    constructor(message: string, resource: string, table: string) {
        super(message, resource, 'ServerDBError', { table });
    }
}

/**
 * 外部服务错误
 */
class ServerExternalServiceError extends ServerError {
    constructor(message: string, resource: string, service: string) {
        super(message, resource, 'ServerExternalServiceError', { service });
    }
}

/**
 * 处理特殊 Error 类
 * @param err
 * @returns { HandledError }
 */
function handlingError(err: Error): HandledError {
    if (err.message.startsWith('ApplicationError+')) {
        const params = JSON.parse(Buffer.from(err.message.slice(17), 'base64').toString('utf-8'));

        if (err.stack) {
            err.stack = err.stack
                .replace(err.name, params.className)
                .replace(err.message, params.message);
        }

        err.name = params.className;
        err.message = params.message;

        return {
            error: err,
            resource: params.resource,
            params: params.params
        };
    } else {
        return {
            error: err,
            resource: '',
            params: undefined
        };
    }
}

export {
    handlingError,
    ApplicationError,
    ClientError,
    ClientParamsError,
    ClientNotLoginError,
    ClientNoPermissionError,
    ClientResourceNotFoundError,
    ServerError,
    ServerResourceNotInitializeError,
    ServerDBError,
    ServerExternalServiceError
};